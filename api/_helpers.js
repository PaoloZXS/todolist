export function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export function methodNotAllowed(req, res, allowedMethods) {
  res.setHeader("Allow", allowedMethods.join(", "));
  return sendJson(res, 405, { error: "Metodo non consentito." });
}

export async function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    throw new Error("JSON non valido.");
  }
}

export function formatDateToIt(dateString) {
  const date = new Date(dateString.replace(" ", "T") + "Z");
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function mapTodoRow(row) {
  return {
    id: String(row.id),
    createdAt: formatDateToIt(row.created_at),
    text: row.text,
    createdBy: row.created_by,
    userId: String(row.user_id),
    status: row.status
  };
}
