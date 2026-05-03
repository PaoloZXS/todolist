import { savePushSubscription, deletePushSubscription } from "./turso-api.js";

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

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
  button.textContent = active ? "🔔 Notifiche SI" : "🔔 Notifiche NO";
  button.dataset.pushActive = active ? "true" : "false";
  button.classList.toggle("button-primary", active);
  button.classList.toggle("button-secondary", !active);
  const status = document.getElementById("pushStatus");
  if (status) {
    if (typeof statusText === "string" && statusText.includes("<br/>")) {
      status.innerHTML = statusText;
    } else {
      status.textContent = statusText || "";
    }
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
        updatePushButtonState(pushButton, "", true, true);
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
    const active = pushButton.dataset.pushActive === "true";

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (active && subscription) {
        await subscription.unsubscribe();
        await deletePushSubscription(subscription.endpoint);
        updatePushButtonState(
          pushButton,
          "Notifiche disattivate.",
          true,
          false
        );
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        updatePushButtonState(
          pushButton,
          "Permessi notifiche negati.",
          false,
          false
        );
        return;
      }

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      await savePushSubscription(
        user.id,
        user.groupName || "",
        newSubscription
      );
      const successText = isMobile
        ? "Notifiche attivate.<br/>Riceverai aggiornamenti di gruppo."
        : "Notifiche attivate. Riceverai aggiornamenti di gruppo.";
      updatePushButtonState(pushButton, successText, true, true);
    } catch (error) {
      console.error("Push subscription toggle failed:", error);
      updatePushButtonState(
        pushButton,
        "Errore nella gestione delle notifiche.",
        false,
        false
      );
    }
  });

  await refreshState();
}
