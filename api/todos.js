import { execute } from "./_db.js";
import {
  mapTodoRow,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "./_helpers.js";

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
  try {
    const result = await execute(
      `SELECT
         t.id,
         t.created_at,
         t.text,
         t.user_id,
         t.status,
         CASE
           WHEN u.username = 'paolo.giorsetti@codarini.com' THEN 'Paolo Giorsetti'
           ELSE u.username
         END AS created_by
       FROM todos t
       JOIN users u ON u.id = t.user_id
       ORDER BY CASE WHEN t.status = 'DA FARE' THEN 0 ELSE 1 END, datetime(t.created_at) DESC`
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

    if (!text) {
      return sendJson(res, 400, {
        error: "La descrizione non può essere vuota."
      });
    }

    if (!userId) {
      return sendJson(res, 400, { error: "Utente non valido." });
    }

    const userExists = await execute(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!userExists.rows.length) {
      return sendJson(res, 404, { error: "Utente non trovato." });
    }

    const insertResult = await execute(
      "INSERT INTO todos (user_id, text, status) VALUES (?, ?, 'DA FARE')",
      [userId, text]
    );

    const created = await execute(
      `SELECT
         t.id,
         t.created_at,
         t.text,
         t.user_id,
         t.status,
         u.username AS created_by
       FROM todos t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = ? LIMIT 1`,
      [insertResult.lastInsertRowid]
    );

    return sendJson(res, 201, {
      todo: mapTodoRow(created.rows[0])
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Errore durante creazione attività." });
  }
}
