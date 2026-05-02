import { requireLogin, clearUserSession } from "../js/session.js";
import {
  getTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodoStatus
} from "../js/turso-api.js";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(console.error);
}

const user = requireLogin();
if (!user) {
  throw new Error("Redirecting to login...");
}

const userGreeting = document.getElementById("userGreeting");
const todosContainer = document.getElementById("todosContainer");
const addTodoBtn = document.getElementById("addTodoBtn");
const installBtn = document.getElementById("installBtn");
const userMenuBtn = document.getElementById("userMenuBtn");
const ADMIN_EMAIL = "paolo.giorsetti@codarini.com";
const isAdminUser = user.username?.toLowerCase() === ADMIN_EMAIL;
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logoutBtn");
const todoFormOverlay = document.getElementById("todoFormOverlay");
const todoForm = document.getElementById("todoForm");
const todoText = document.getElementById("todoText");
const todoPrivate = document.getElementById("todoPrivate");
const todoIdField = document.getElementById("todoId");
const modalTitle = document.getElementById("modalTitle");

let deferredPrompt = null;
let currentTodos = [];
const AUTO_REFRESH_MS = 10000;
let todoRefreshTimer = null;
let isTodosRefreshing = false;

function getInstallHint() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) {
    return "Edge: menu ⋯ > App > Installa questo sito come app.";
  }
  if (ua.includes("chrome")) {
    return "Chrome: menu ⋮ > Trasmetti, salva e condividi > Installa pagina come app.";
  }
  if (ua.includes("firefox")) {
    return "Firefox desktop non supporta il prompt PWA standard. Usa Chrome o Edge per installare.";
  }
  return "Questo browser potrebbe non supportare l'installazione PWA automatica.";
}

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.matchMedia("(display-mode: minimal-ui)").matches ||
  window.navigator.standalone === true;

// Su mobile nascondiamo sempre il pulsante (gestito dal CSS)
// Su desktop lo mostriamo solo quando il browser offre il prompt
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

if (isStandalone || isMobile) {
  installBtn.classList.add("hidden");
}

if (isMobile) {
  addTodoBtn.textContent = "+ Aggiungi";
}

userGreeting.textContent = `Ciao, ${user.name}`;

console.log("[PWA] isStandalone:", isStandalone);
console.log("[PWA] beforeinstallprompt awaiting...");

window.addEventListener("beforeinstallprompt", (event) => {
  console.log("[PWA] beforeinstallprompt RECEIVED ✅");
  event.preventDefault();
  deferredPrompt = event;
});

installBtn.addEventListener("click", async () => {
  console.log("[PWA] Install button clicked");
  console.log("[PWA] deferredPrompt:", deferredPrompt);
  if (!deferredPrompt) {
    console.log("[PWA] No deferredPrompt, showing fallback");
    alert(getInstallHint());
    return;
  }
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  console.log("[PWA] User choice:", choice.outcome);
  if (choice.outcome === "accepted") {
    installBtn.classList.add("hidden");
  }
  deferredPrompt = null;
});

userMenuBtn.addEventListener("click", () => {
  userMenu.classList.toggle("hidden");
  userMenuBtn.classList.toggle("active");
});

document.addEventListener("click", (event) => {
  if (
    !event.target.closest(".user-menu-wrapper") &&
    !userMenu.classList.contains("hidden")
  ) {
    userMenu.classList.add("hidden");
    userMenuBtn.classList.remove("active");
  }
});

logoutBtn.addEventListener("click", () => {
  clearUserSession();
  window.location.href = "../login/login.html";
});

addTodoBtn.addEventListener("click", () => {
  openForm();
});

todoFormOverlay.addEventListener("click", (event) => {
  if (event.target === todoFormOverlay) {
    closeForm();
  }
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  closeForm();
});

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const taskText = todoText.value.trim();
  const taskId = todoIdField.value;

  if (!taskText) {
    return;
  }

  const isPrivate = todoPrivate.checked;
  if (taskId) {
    await updateTodo(taskId, taskText, user.id, isPrivate);
  } else {
    await addTodo(taskText, user.id, isPrivate);
  }

  closeForm();
  await loadTodos();
});

async function loadTodos() {
  if (isTodosRefreshing) {
    return;
  }
  if (!todoFormOverlay.classList.contains("hidden")) {
    return;
  }

  isTodosRefreshing = true;
  try {
    currentTodos = await getTodos(user.id, user.groupName || "");
    renderTodos(currentTodos);
  } finally {
    isTodosRefreshing = false;
  }
}

function startAutoRefresh() {
  if (todoRefreshTimer) return;
  todoRefreshTimer = setInterval(async () => {
    await loadTodos();
  }, AUTO_REFRESH_MS);
}

function renderTodos(todos) {
  todosContainer.innerHTML = "";
  const pending = todos.filter((item) => item.status === "DA FARE");
  const done = todos.filter((item) => item.status === "FATTA");

  if (pending.length) {
    pending.forEach((item) => todosContainer.appendChild(createTodoRow(item)));
  }
  if (done.length) {
    todosContainer.appendChild(
      createSectionLabel("Attività completate", "section-completed")
    );
    done.forEach((item) => todosContainer.appendChild(createTodoRow(item)));
  }
  if (!pending.length && !done.length) {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "todo-row empty-message";
    emptyMessage.innerHTML =
      'Nessuna attività presente.<br class="empty-message-break" />Aggiungi la prima voce per iniziare.';
    todosContainer.appendChild(emptyMessage);
  }
}

function createSectionLabel(text, typeClass = "") {
  const label = document.createElement("div");
  label.className = `todo-row section-label ${typeClass}`.trim();
  label.textContent = text;
  return label;
}

function createTodoRow(item) {
  const row = document.createElement("div");
  row.className = `todo-row${item.status === "FATTA" ? " done" : ""}`;
  row.innerHTML = `
    <div class="todo-meta">
      <span class="todo-date">${item.createdAt}</span>
      <span class="todo-owner">${item.createdBy}</span>
    </div>
    <div class="todo-body">
      <span class="todo-text" title="Clicca per modificare">
        ${item.text}${item.isPrivate ? ' <span class="private-badge">🔒 Privato</span>' : ""}
      </span>
      <span class="todo-actions">
        <button class="icon-button delete-btn" title="Elimina" data-id="${item.id}">🗑️</button>
        <button class="icon-button toggle-btn" title="Segna come ${item.status === "FATTA" ? "DA FARE" : "FATTA"}" data-id="${item.id}">${item.status === "FATTA" ? "↩️" : "✅"}</button>
      </span>
    </div>
  `;

  row
    .querySelector(".todo-text")
    .addEventListener("click", () => openEditForm(item));
  row.querySelector(".delete-btn").addEventListener("click", async () => {
    if (item.userId !== user.id && !isAdminUser) {
      alert("Puoi cancellare solo le tue attività.");
      return;
    }
    await deleteTodo(item.id, user.id);
    await loadTodos();
  });
  row.querySelector(".toggle-btn").addEventListener("click", async () => {
    const newStatus = item.status === "FATTA" ? "DA FARE" : "FATTA";
    await toggleTodoStatus(item.id, newStatus);
    await loadTodos();
  });

  return row;
}

function openForm() {
  todoIdField.value = "";
  todoText.value = "";
  todoPrivate.checked = false;
  modalTitle.textContent = "Aggiungi nuova attività";
  todoFormOverlay.classList.remove("hidden");
  todoText.focus();
}

function openEditForm(item) {
  if (item.userId !== user.id && !isAdminUser) {
    alert("Puoi modificare solo le tue attività.");
    return;
  }
  todoIdField.value = item.id;
  todoText.value = item.text;
  todoPrivate.checked = item.isPrivate === true;
  modalTitle.textContent = "Modifica attività";
  todoFormOverlay.classList.remove("hidden");
  todoText.focus();
}

function closeForm() {
  todoFormOverlay.classList.add("hidden");
  todoIdField.value = "";
  todoText.value = "";
  todoPrivate.checked = false;
}

window.addEventListener("focus", () => {
  loadTodos();
});

window.addEventListener("load", async () => {
  await loadTodos();
  startAutoRefresh();
});
