import { execute } from "./_db.js";
import {
  mapTodoRow,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "./_helpers.js";
import { sendPushNotificationToGroup } from "./push-utils.js";

async function ensurePrivateColumn() {
  try {
    await execute(
      "ALTER TABLE todos ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0"
    );
  } catch (error) {
    // Ignore if column already exists or the DB provider does not support it.
  }
}

async function ensureUpdatedByColumn() {
  try {
    await execute("ALTER TABLE todos ADD COLUMN updated_by INTEGER");
  } catch (error) {
    // Ignore if column already exists or the DB provider does not support it.
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  return methodNotAllowed(req, res, ["GET", "POST"]);
}

async function handleGet(_req, res) {
  await ensurePrivateColumn();
  await ensureUpdatedByColumn();
  try {
    const currentUserId = String(_req.query?.userId || "").trim();
    const currentGroupName = String(_req.query?.groupName || "").trim();
    const queryArgs = [];
    const visibilityFilter =
      currentUserId && currentGroupName
        ? `WHERE (t.is_private = 0 AND u.group_name = ?) OR t.user_id = ?`
        : currentUserId
          ? `WHERE t.is_private = 0 OR t.user_id = ?`
          : `WHERE t.is_private = 0`;
    if (currentUserId && currentGroupName) {
      queryArgs.push(currentGroupName, currentUserId);
    } else if (currentUserId) {
      queryArgs.push(currentUserId);
    }

    const result = await execute(
      `SELECT
         t.id,
         t.created_at,
         t.text,
         t.user_id,
         t.status,
         t.is_private,
         CASE
           WHEN u.username = 'paolo.giorsetti@codarini.com' THEN 'Paolo Giorsetti'
           ELSE u.username
         END AS created_by,
         u2.username AS updated_by
       FROM todos t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users u2 ON u2.id = t.updated_by
       ${visibilityFilter}
       ORDER BY CASE WHEN t.status = 'DA FARE' THEN 0 ELSE 1 END, datetime(t.created_at) DESC`,
      queryArgs
    );

    return sendJson(res, 200, {
      todos: result.rows.map(mapTodoRow)
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Errore nel caricamento attività." });
  }
}

async function handlePost(req, res) {
  try {
    const body = await readJsonBody(req);
    const text = String(body.text || "").trim();
    const userId = String(body.userId || "").trim();
    const isPrivate =
      body.isPrivate === true ||
      body.isPrivate === 1 ||
      body.isPrivate === "true";

    await ensurePrivateColumn();

    if (!text) {
      return sendJson(res, 400, {
        error: "La descrizione non può essere vuota."
      });
    }

    if (!userId) {
      return sendJson(res, 400, { error: "Utente non valido." });
    }

    const userExists = await execute(
      "SELECT id, username, group_name FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!userExists.rows.length) {
      return sendJson(res, 404, { error: "Utente non trovato." });
    }

    const currentUser = userExists.rows[0];
    const currentUsername = String(currentUser.username || "Utente");
    const currentGroup = String(currentUser.group_name || "").trim();

    const sourceEndpoint = String(body.sourceEndpoint || "").trim();

    const insertResult = await execute(
      "INSERT INTO todos (user_id, text, status, is_private) VALUES (?, ?, 'DA FARE', ?)",
      [userId, text, isPrivate ? 1 : 0]
    );

    const created = await execute(
      `SELECT
         t.id,
         t.created_at,
         t.text,
         t.user_id,
         t.status,
         t.is_private,
         u.username AS created_by
       FROM todos t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = ? LIMIT 1`,
      [insertResult.lastInsertRowid]
    );

    if (!isPrivate && currentGroup) {
      sendPushNotificationToGroup(
        currentGroup,
        sourceEndpoint,
        "Nuova attività GeoList",
        `${currentUsername} ha aggiunto: ${text}`
      ).catch((error) => console.error("Errore invio push:", error));
    }

    return sendJson(res, 201, {
      todo: mapTodoRow(created.rows[0])
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Errore durante creazione attività." });
  }
}
