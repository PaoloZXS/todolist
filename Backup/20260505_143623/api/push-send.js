import { methodNotAllowed, readJsonBody, sendJson } from "./_helpers.js";
import { sendPushNotification } from "./push-utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(req, res, ["POST"]);
  }

  try {
    const body = await readJsonBody(req);
    const subscription = body.subscription;
    const title = String(body.title || "GeoList").trim();
    const pushBody = String(body.body || "Hai una nuova notifica.").trim();

    if (!subscription || !subscription.endpoint) {
      return sendJson(res, 400, { error: "Subscription non valida." });
    }

    await sendPushNotification(subscription, title, pushBody);
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante l'invio della notifica push."
    });
  }
}
