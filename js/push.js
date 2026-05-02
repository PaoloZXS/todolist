import { savePushSubscription } from "./turso-api.js";

const VAPID_PLACEHOLDER = "INSERISCI_VAPID_PUBLIC_KEY";

async function fetchVapidPublicKey() {
  try {
    const response = await fetch("/api/vapid-public-key");
    if (!response.ok) {
      return VAPID_PLACEHOLDER;
    }
    const payload = await response.json();
    return payload.vapidPublicKey || VAPID_PLACEHOLDER;
  } catch (error) {
    console.error("Impossibile recuperare la chiave VAPID:", error);
    return VAPID_PLACEHOLDER;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
export async function getCurrentPushSubscriptionEndpoint() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription?.endpoint || "";
  } catch {
    return "";
  }
}
function updatePushButtonState(
  button,
  statusText,
  enabled = true,
  active = false
) {
  if (!button) return;
  button.disabled = !enabled;
  button.textContent = active ? "🔔 Notifiche attive" : "🔔 Attiva notifiche";
  button.classList.toggle("button-primary", active);
  button.classList.toggle("button-secondary", !active);
  const status = document.getElementById("pushStatus");
  if (status) {
    status.textContent = statusText || "";
  }
}

export async function initPushNotifications(user) {
  const pushButton = document.getElementById("pushToggleBtn");
  if (!pushButton || !user) return;

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    updatePushButtonState(
      pushButton,
      "Il browser non supporta le notifiche push.",
      false
    );
    return;
  }

  const vapidPublicKey = await fetchVapidPublicKey();
  const vapidReady =
    vapidPublicKey && !vapidPublicKey.includes(VAPID_PLACEHOLDER);

  if (!vapidReady) {
    updatePushButtonState(
      pushButton,
      "Configura la chiave VAPID nel backend per abilitare le notifiche.",
      false
    );
    return;
  }

  async function refreshState() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await savePushSubscription(user.id, user.groupName || "", subscription);
        updatePushButtonState(
          pushButton,
          "Le notifiche sono attive per questo dispositivo.",
          true,
          true
        );
      } else {
        updatePushButtonState(
          pushButton,
          "Clicca per ricevere notifiche push.",
          true,
          false
        );
      }
    } catch (error) {
      console.error("Push init error:", error);
      updatePushButtonState(
        pushButton,
        "Impossibile inizializzare le notifiche.",
        false
      );
    }
  }

  pushButton.addEventListener("click", async () => {
    pushButton.disabled = true;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        updatePushButtonState(pushButton, "Permessi notifiche negati.", false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      await savePushSubscription(user.id, user.groupName || "", subscription);
      updatePushButtonState(
        pushButton,
        "Notifiche attivate. Riceverai aggiornamenti di gruppo.",
        true,
        true
      );
    } catch (error) {
      console.error("Push subscription failed:", error);
      updatePushButtonState(
        pushButton,
        "Errore durante l'iscrizione alle notifiche.",
        false
      );
    }
  });

  await refreshState();
}
