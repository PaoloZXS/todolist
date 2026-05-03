import { execute } from "./_db.js";
import { methodNotAllowed, readJsonBody, sendJson } from "./_helpers.js";

const ADMIN_EMAIL = "paolo.giorsetti@codarini.com";

async function ensureUserGroupColumn() {
  try {
    await execute(
      "ALTER TABLE users ADD COLUMN group_name TEXT NOT NULL DEFAULT ''"
    );
  } catch (error) {
    // Ignore if column already exists.
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(req, res, ["POST"]);
  }

  try {
    const body = await readJsonBody(req);
    const adminEmail = String(
      body.adminEmail || body.adminUsername || ""
    ).trim();
    const targetUsername = String(body.targetUsername || "").trim();
    const newGroupName = String(body.newGroupName || "").trim();

    if (!adminEmail || !targetUsername || !newGroupName) {
      return sendJson(res, 400, {
        error: "adminEmail, targetUsername e newGroupName sono obbligatori."
      });
    }

    if (adminEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return sendJson(res, 403, {
        error: "Accesso admin non autorizzato."
      });
    }

    await ensureUserGroupColumn();

    const targetLookup = await execute(
      "SELECT id, username, group_name FROM users WHERE username = ? LIMIT 1",
      [targetUsername]
    );

    if (!targetLookup.rows.length) {
      return sendJson(res, 404, {
        error: "Utente target non trovato."
      });
    }

    const targetUser = targetLookup.rows[0];

    await execute("UPDATE users SET group_name = ? WHERE id = ?", [
      newGroupName,
      targetUser.id
    ]);

    return sendJson(res, 200, {
      message: `Gruppo di ${targetUser.username} aggiornato correttamente.`,
      user: {
        id: String(targetUser.id),
        username: targetUser.username,
        groupName: newGroupName
      }
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante l'operazione amministrativa."
    });
  }
}
