const TURSO_DB_URL = "INSERISCI_URL";
const TURSO_DB_TOKEN = "INSERISCI_TOKEN";

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Errore di comunicazione con il server.");
  }

  return payload;
}

export async function loginUser(username, password) {
  if (!username || !password) {
    throw new Error("Inserisci username e password.");
  }

  const payload = await apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  return payload.user;
}

export async function getTodos() {
  const payload = await apiRequest("/api/todos");
  return payload.todos || [];
}

export async function addTodo(text, userId) {
  if (!text || !text.trim()) {
    throw new Error("La descrizione non può essere vuota.");
  }

  const payload = await apiRequest("/api/todos", {
    method: "POST",
    body: JSON.stringify({ text: text.trim(), userId })
  });

  return payload.todo;
}

export async function updateTodo(id, text, actingUserId) {
  const payload = await apiRequest(`/api/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ text: text.trim(), actingUserId })
  });

  return payload.todo;
}

export async function deleteTodo(id, actingUserId) {
  await apiRequest(`/api/todos/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ actingUserId })
  });
  return true;
}

export async function toggleTodoStatus(id, status) {
  const payload = await apiRequest(`/api/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

  return payload.todo;
}

export async function getTodoById(id) {
  const todos = await getTodos();
  return todos.find((item) => String(item.id) === String(id)) || null;
}
