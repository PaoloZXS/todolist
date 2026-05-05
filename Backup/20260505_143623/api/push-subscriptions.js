import { methodNotAllowed, readJsonBody, sendJson } from "./_helpers.js";
import {
  savePushSubscription,
  getGroupSubscriptions,
  deletePushSubscription
} from "./push-utils.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  if (req.method === "DELETE") {
    return handleDelete(req, res);
  }
  return methodNotAllowed(req, res, ["GET", "POST", "DELETE"]);
}

async function handleGet(req, res) {
  try {
    const groupName = String(req.query?.groupName || "").trim();
    if (!groupName) {
      return sendJson(res, 400, { error: "groupName è richiesto." });
    }

    const subscriptions = await getGroupSubscriptions(groupName);
    return sendJson(res, 200, { subscriptions });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore nel recupero delle iscrizioni push."
    });
  }
}

async function handlePost(req, res) {
  try {
    const body = await readJsonBody(req);
    const userId = String(body.userId || "").trim();
    const groupName = String(body.groupName || "").trim();
    const subscription = body.subscription;

    if (!userId || !groupName || !subscription) {
      return sendJson(res, 400, { error: "Dati push mancanti o non validi." });
    }

    await savePushSubscription(userId, groupName, subscription);
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante il salvataggio della sottoscrizione push."
    });
  }
}

async function handleDelete(req, res) {
  try {
    const body = await readJsonBody(req);
    const endpoint = String(body.endpoint || "").trim();

    if (!endpoint) {
      return sendJson(res, 400, { error: "endpoint è obbligatorio." });
    }

    await deletePushSubscription(endpoint);
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Errore durante la cancellazione della sottoscrizione push."
    });
  }
}
