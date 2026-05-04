import { savePushSubscription, deletePushSubscription } from "./turso-api.js";

const VAPID_PLACEHOLDER = "INSERISCI_VAPID_PUBLIC_KEY";
let pushCenterToastTimer = null;

function ensurePushCenterToast() {
  let toast = document.getElementById("pushCenterToast");
  if (toast) return toast;

  toast = document.createElement("div");
  toast.id = "pushCenterToast";
  toast.className = "push-center-toast";
  document.body.appendChild(toast);
  return toast;
}

function showPushCenterToast(message, tone = "success") {
  const toast = ensurePushCenterToast();
  toast.textContent = message;
  toast.classList.remove("success", "muted", "active");
  toast.classList.add(tone, "active");

  if (pushCenterToastTimer) {
    clearTimeout(pushCenterToastTimer);
  }

  pushCenterToastTimer = window.setTimeout(() => {
    toast.classList.remove("active");
  }, 1700);
}

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
function updateNotificationIndicator(active) {
  const indicator = document.getElementById("notificationStatus");
  if (!indicator) return;
  indicator.classList.toggle("active", active);
  indicator.classList.toggle("inactive", !active);
  indicator.title = active ? "Notifiche attive" : "Notifiche disattive";
  const label = indicator.querySelector(".notification-label");
  if (label) {
    label.textContent = active ? "Attive" : "Disattive";
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
  button.textContent = active ? "Disattiva notifiche" : "Attiva notifiche";
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
  updateNotificationIndicator(active);
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
    const nextActive = !active;
    showPushCenterToast(
      nextActive ? "Notifiche attivate" : "Notifiche disattivate",
      nextActive ? "success" : "danger"
    );

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (active && subscription) {
        await subscription.unsubscribe();
        await deletePushSubscription(subscription.endpoint);
        updatePushButtonState(pushButton, "", true, false);
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
      updatePushButtonState(pushButton, "", true, true);
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
