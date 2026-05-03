import { requireLogin } from "../js/session.js";

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
const targetUserSelect = document.getElementById("targetUserSelect");
const adminMessage = document.getElementById("adminMessage");

window.addEventListener("load", () => {
  targetUsernameInput.value = "";
  newGroupNameInput.value = "";
  targetUserSelect.selectedIndex = 0;
  loadAdminUsers();

  setTimeout(() => {
    targetUsernameInput.value = "";
  }, 50);
});

targetUserSelect.addEventListener("change", () => {
  const selectedOption = targetUserSelect.selectedOptions[0];
  if (!selectedOption || !selectedOption.value) {
    targetUsernameInput.value = "";
    return;
  }
  targetUsernameInput.value = selectedOption.value;
  newGroupNameInput.value = selectedOption.dataset.groupName || "";
});

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminMessage.textContent = "";
  adminMessage.style.display = "none";

  const targetUsername = targetUsernameInput.value.trim();
  const newGroupName = newGroupNameInput.value.trim();

  if (!targetUsername || !newGroupName) {
    adminMessage.textContent = "Completa tutti i campi per continuare.";
    adminMessage.style.display = "block";
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
        targetUsername,
        newGroupName
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      adminMessage.textContent =
        payload.error || "Errore durante l'aggiornamento.";
      adminMessage.style.display = "block";
      return;
    }

    adminMessage.textContent =
      payload.message || "Gruppo aggiornato con successo.";
    adminMessage.style.color = "#b8f1c8";
    adminMessage.style.display = "block";
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Errore di comunicazione al server.";
    adminMessage.style.color = "";
  }
});

async function loadAdminUsers() {
  adminMessage.textContent = "";
  adminMessage.style.color = "";
  adminMessage.style.display = "none";

  try {
    const response = await fetch("/api/admin-users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adminEmail: user.username
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      adminMessage.textContent =
        payload.error || "Errore durante il caricamento utenti.";
      return;
    }

    populateUserList(payload.users || []);
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Errore di comunicazione al server.";
  }
}

function populateUserList(users) {
  targetUserSelect.innerHTML =
    "<option value=''>-- Scegli un utente --</option>";
  users.forEach((userItem) => {
    const option = document.createElement("option");
    option.value = userItem.username;
    option.textContent = `${userItem.username} — ${
      userItem.groupName || "(nessun gruppo)"
    }`;
    option.dataset.groupName = userItem.groupName || "";
    targetUserSelect.appendChild(option);
  });
}
