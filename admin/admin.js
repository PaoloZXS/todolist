import { requireLogin, clearUserSession } from "../js/session.js";

const ADMIN_EMAIL = "paolo.giorsetti@codarini.com";
const user = requireLogin();
if (!user) {
  throw new Error("Redirecting to login...");
}

if (user.username?.toLowerCase() !== ADMIN_EMAIL) {
  window.location.href = "../todos/todos.html";
}

const adminForm = document.getElementById("adminForm");
const targetUsernameInput = document.getElementById("targetUsername");
const newGroupNameInput = document.getElementById("newGroupName");
const adminPasswordInput = document.getElementById("adminPassword");
const adminMessage = document.getElementById("adminMessage");

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminMessage.textContent = "";

  const targetUsername = targetUsernameInput.value.trim();
  const newGroupName = newGroupNameInput.value.trim();
  const adminPassword = adminPasswordInput.value.trim();

  if (!targetUsername || !newGroupName || !adminPassword) {
    adminMessage.textContent = "Completa tutti i campi per continuare.";
    return;
  }

  try {
    const response = await fetch("/api/admin-reset-group", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adminEmail: user.username,
        adminPassword,
        targetUsername,
        newGroupName
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      adminMessage.textContent = payload.error || "Errore durante l'aggiornamento.";
      return;
    }

    adminMessage.textContent = payload.message || "Gruppo aggiornato con successo.";
    adminMessage.style.color = "#b8f1c8";
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Errore di comunicazione al server.";
  }
});
