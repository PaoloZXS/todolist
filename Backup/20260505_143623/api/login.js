import crypto from "node:crypto";
import { execute } from "./_db.js";
import { methodNotAllowed, readJsonBody, sendJson } from "./_helpers.js";

const ADMIN_EMAIL = "paolo.giorsetti@codarini.com";
const ADMIN_DISPLAY_NAME = "Paolo Giorsetti";

async function ensureUserGroupColumn() {
  try {
    await execute(
      "ALTER TABLE users ADD COLUMN group_name TEXT NOT NULL DEFAULT ''"
    );
  } catch (error) {
    // Ignore if column already exists.
  }
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function formatUserResponse(user) {
  return {
    id: String(user.id),
    username: String(user.username),
    name:
      String(user.username).toLowerCase() === ADMIN_EMAIL
        ? ADMIN_DISPLAY_NAME
        : String(user.username),
    groupName: String(user.group_name || user.groupName || "")
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(req, res, ["POST"]);
  }

  try {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();
    const groupName = String(body.groupName || "").trim();

    if (!username || !password || !groupName) {
      return sendJson(res, 400, {
        error: "Inserisci username, password e Azienda/Famiglia."
      });
    }

    await ensureUserGroupColumn();
    const userLookup = await execute(
      "SELECT id, username, password_hash, group_name FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    const passwordHash = hashPassword(password);

    if (!userLookup.rows.length) {
      const insertResult = await execute(
        "INSERT INTO users (username, password_hash, group_name) VALUES (?, ?, ?)",
        [username, passwordHash, groupName]
      );

      return sendJson(res, 200, {
        user: formatUserResponse({
          id: insertResult.lastInsertRowid,
          username,
          groupName
        })
      });
    }

    const existing = userLookup.rows[0];
    if (existing.password_hash !== passwordHash) {
      return sendJson(res, 401, { error: "Password non corretta." });
    }

    if (existing.group_name && existing.group_name !== groupName) {
      return sendJson(res, 401, {
        error:
          "Hai già un account registrato con questo username in un altro gruppo. Se hai inserito il gruppo sbagliato, contatta l'amministratore all'indirizzo paolo.giorsetti@codarini.com."
      });
    }

    if (!existing.group_name) {
      await execute("UPDATE users SET group_name = ? WHERE id = ?", [
        groupName,
        existing.id
      ]);
      existing.group_name = groupName;
    }

    return sendJson(res, 200, {
      user: formatUserResponse({
        id: existing.id,
        username: existing.username,
        group_name: existing.group_name
      })
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante il login su Turso."
    });
  }
}
