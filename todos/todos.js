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
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logoutBtn");
const todoFormOverlay = document.getElementById("todoFormOverlay");
const todoForm = document.getElementById("todoForm");
const todoText = document.getElementById("todoText");
const todoIdField = document.getElementById("todoId");
const modalTitle = document.getElementById("modalTitle");

let deferredPrompt = null;
let currentTodos = [];

userGreeting.textContent = `Ciao, ${user.name}`;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
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

  if (taskId) {
    await updateTodo(taskId, taskText, user.id);
  } else {
    await addTodo(taskText, user.id, user.name);
  }

  closeForm();
  await loadTodos();
});

async function loadTodos() {
  currentTodos = await getTodos();
  renderTodos(currentTodos);
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
    emptyMessage.className = "todo-row";
    emptyMessage.textContent =
      "Nessuna attività presente. Aggiungi la prima voce per iniziare.";
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
    <span>${item.createdAt}</span>
    <span class="todo-text">${item.text}</span>
    <span class="todo-owner">${item.createdBy}</span>
    <span class="todo-actions">
      <button class="icon-button edit-btn" title="Modifica" data-id="${item.id}">✏️</button>
      <button class="icon-button delete-btn" title="Elimina" data-id="${item.id}">🗑️</button>
      <button class="icon-button toggle-btn" title="Segna come ${item.status === "FATTA" ? "DA FARE" : "FATTA"}" data-id="${item.id}">${item.status === "FATTA" ? "↩️" : "✅"}</button>
    </span>
  `;

  row
    .querySelector(".edit-btn")
    .addEventListener("click", () => openEditForm(item));
  row.querySelector(".delete-btn").addEventListener("click", async () => {
    if (item.userId !== user.id) {
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
  modalTitle.textContent = "Aggiungi nuova attività";
  todoFormOverlay.classList.remove("hidden");
  todoText.focus();
}

function openEditForm(item) {
  if (item.userId !== user.id) {
    alert("Puoi modificare solo le tue attività.");
    return;
  }
  todoIdField.value = item.id;
  todoText.value = item.text;
  modalTitle.textContent = "Modifica attività";
  todoFormOverlay.classList.remove("hidden");
  todoText.focus();
}

function closeForm() {
  todoFormOverlay.classList.add("hidden");
  todoIdField.value = "";
  todoText.value = "";
}

window.addEventListener("load", () => {
  loadTodos();
});
