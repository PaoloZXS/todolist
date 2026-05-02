import crypto from "node:crypto";
import { execute } from "./_db.js";
import { methodNotAllowed, readJsonBody, sendJson } from "./_helpers.js";

const ADMIN_EMAIL = "paolo.giorsetti@codarini.com";
const ADMIN_DISPLAY_NAME = "Paolo Giorsetti";

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
        : String(user.username)
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

    if (!username || !password) {
      return sendJson(res, 400, { error: "Inserisci username e password." });
    }

    const userLookup = await execute(
      "SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    const passwordHash = hashPassword(password);

    if (!userLookup.rows.length) {
      const insertResult = await execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        [username, passwordHash]
      );

      return sendJson(res, 200, {
        user: formatUserResponse({
          id: insertResult.lastInsertRowid,
          username
        })
      });
    }

    const existing = userLookup.rows[0];
    if (existing.password_hash !== passwordHash) {
      return sendJson(res, 401, { error: "Password non corretta." });
    }

    return sendJson(res, 200, {
      user: formatUserResponse({
        id: existing.id,
        username: existing.username
      })
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante il login su Turso."
    });
  }
}
