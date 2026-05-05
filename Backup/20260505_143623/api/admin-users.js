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
    const adminEmail = String(body.adminEmail || "").trim();

    if (!adminEmail) {
      return sendJson(res, 400, {
        error: "adminEmail è obbligatorio."
      });
    }

    if (adminEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return sendJson(res, 403, {
        error: "Accesso admin non autorizzato."
      });
    }

    await ensureUserGroupColumn();

    const usersResult = await execute(
      "SELECT username, group_name FROM users WHERE username != ? ORDER BY username",
      [ADMIN_EMAIL]
    );

    const users = usersResult.rows.map((row) => ({
      username: String(row.username),
      groupName: String(row.group_name || "")
    }));

    return sendJson(res, 200, {
      users
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante il recupero degli utenti."
    });
  }
}
