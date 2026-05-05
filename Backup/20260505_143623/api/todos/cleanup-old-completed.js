import { execute } from "../_db.js";
import { methodNotAllowed, sendJson } from "../_helpers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(req, res, ["POST"]);
  }

  try {
    const result = await execute(
      "DELETE FROM todos WHERE status = 'FATTA' AND datetime(created_at) < datetime('now', '-1 month')"
    );

    return sendJson(res, 200, {
      message: "Old completed todos removed.",
      deletedCount: result?.changes || 0
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante la pulizia delle attività completate."
    });
  }
}
