import { execute } from "../_db.js";
import {
  mapTodoRow,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "../_helpers.js";

const ADMIN_EMAIL = "paolo.giorsetti@codarini.com";

async function isAdminUserId(userId) {
  if (!userId) return false;
  const result = await execute(
    "SELECT username FROM users WHERE id = ? LIMIT 1",
    [userId]
  );
  return (
    result.rows.length > 0 &&
    String(result.rows[0].username).toLowerCase() === ADMIN_EMAIL
  );
}

async function ensurePrivateColumn() {
  try {
    await execute(
      "ALTER TABLE todos ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0"
    );
  } catch (error) {
    // Ignore if column already exists.
  }
}

export default async function handler(req, res) {
  const todoId = req.query?.id;
  if (!todoId) {
    return sendJson(res, 400, { error: "ID attività mancante." });
  }

  if (req.method === "PATCH") {
    return handlePatch(req, res, todoId);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, res, todoId);
  }

  return methodNotAllowed(req, res, ["PATCH", "DELETE"]);
}

async function handlePatch(req, res, todoId) {
  try {
    await ensurePrivateColumn();
    const body = await readJsonBody(req);
    const nextText =
      body.text !== undefined ? String(body.text || "").trim() : null;
    const nextStatus =
      body.status !== undefined ? String(body.status || "").trim() : null;
    const actingUserId = String(body.actingUserId || "").trim();

    const existing = await execute(
      "SELECT id, user_id, is_private FROM todos WHERE id = ? LIMIT 1",
      [todoId]
    );

    if (!existing.rows.length) {
      return sendJson(res, 404, { error: "Attività non trovata." });
    }

    const ownerId = String(existing.rows[0].user_id);

    if (nextText !== null) {
      if (!nextText) {
        return sendJson(res, 400, {
          error: "La descrizione non può essere vuota."
        });
      }
      const canEdit =
        actingUserId === ownerId || (await isAdminUserId(actingUserId));
      if (
        !actingUserId ||
        !canEdit ||
        (existing.rows[0].is_private && actingUserId !== ownerId)
      ) {
        return sendJson(res, 403, {
          error: "Puoi modificare solo le tue attività."
        });
      }
      await execute("UPDATE todos SET text = ? WHERE id = ?", [
        nextText,
        todoId
      ]);
    }

    if (nextStatus !== null) {
      const normalizedStatus = nextStatus === "FATTA" ? "FATTA" : "DA FARE";
      await execute("UPDATE todos SET status = ? WHERE id = ?", [
        normalizedStatus,
        todoId
      ]);
    }

    const updated = await execute(
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
      [todoId]
    );

    return sendJson(res, 200, {
      todo: mapTodoRow(updated.rows[0])
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante aggiornamento attività."
    });
  }
}

async function handleDelete(req, res, todoId) {
  try {
    await ensurePrivateColumn();
    const body = await readJsonBody(req);
    const actingUserId = String(body.actingUserId || "").trim();

    const existing = await execute(
      "SELECT id, user_id, is_private FROM todos WHERE id = ? LIMIT 1",
      [todoId]
    );

    if (!existing.rows.length) {
      return sendJson(res, 404, { error: "Attività non trovata." });
    }

    const canDelete =
      actingUserId === String(existing.rows[0].user_id) ||
      (await isAdminUserId(actingUserId));
    if (
      !actingUserId ||
      !canDelete ||
      (existing.rows[0].is_private &&
        actingUserId !== String(existing.rows[0].user_id))
    ) {
      return sendJson(res, 403, {
        error: "Puoi cancellare solo le tue attività."
      });
    }

    await execute("DELETE FROM todos WHERE id = ?", [todoId]);
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante cancellazione attività."
    });
  }
}
