import webpush from "web-push";
import { execute } from "./_db.js";

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY || "INSERISCI_VAPID_PUBLIC_KEY";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "INSERISCI_VAPID_PRIVATE_KEY";
const VAPID_CONTACT = "mailto:no-reply@geolist.app";
const KEYS_CONFIGURED =
  VAPID_PUBLIC_KEY &&
  VAPID_PRIVATE_KEY &&
  !VAPID_PUBLIC_KEY.includes("INSERISCI") &&
  !VAPID_PRIVATE_KEY.includes("INSERISCI");

if (KEYS_CONFIGURED) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function ensurePushTable() {
  await execute(
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_name TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  );
}

export async function savePushSubscription(userId, groupName, subscription) {
  await ensurePushTable();
  if (!userId || !groupName || !subscription?.endpoint) {
    throw new Error("Dati iscrizione push non validi.");
  }

  const endpoint = String(subscription.endpoint);
  const p256dh = String(subscription.keys?.p256dh || "");
  const auth = String(subscription.keys?.auth || "");

  await execute(
    `INSERT INTO push_subscriptions (user_id, group_name, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       group_name = excluded.group_name,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       created_at = CURRENT_TIMESTAMP`,
    [userId, groupName, endpoint, p256dh, auth]
  );
}

export async function getGroupSubscriptions(groupName) {
  await ensurePushTable();
  const result = await execute(
    `SELECT user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE group_name = ?`,
    [groupName]
  );
  return result.rows.map((row) => ({
    userId: String(row.user_id),
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth
    }
  }));
}

export async function sendPushNotification(subscription, title, body) {
  if (!KEYS_CONFIGURED) {
    console.warn("VAPID keys non configurate, notifica push non inviata.");
    return;
  }

  const payload = JSON.stringify({ title, body });
  await webpush.sendNotification(subscription, payload);
}

export async function sendPushNotificationToGroup(
  groupName,
  excludeUserId,
  title,
  body
) {
  if (!groupName) return;
  const subscriptions = await getGroupSubscriptions(groupName);

  const sendPromises = subscriptions
    .filter(
      (subscription) =>
        subscription.endpoint &&
        String(subscription.userId) !== String(excludeUserId)
    )
    .map((subscription) =>
      sendPushNotification(subscription, title, body).catch((error) => {
        console.error("Errore invio push a subscription:", error);
      })
    );

  await Promise.all(sendPromises);
}
