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

export async function loginUser(username, password, groupName) {
  if (!username || !password || !groupName) {
    throw new Error("Inserisci username, password e Azienda/Famiglia.");
  }

  const payload = await apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password, groupName })
  });

  return payload.user;
}

export async function getTodos(userId = "", groupName = "") {
  const query = userId
    ? `/api/todos?userId=${encodeURIComponent(userId)}&groupName=${encodeURIComponent(groupName)}`
    : "/api/todos";
  const payload = await apiRequest(query);
  return payload.todos || [];
}

export async function addTodo(text, userId, isPrivate = false) {
  if (!text || !text.trim()) {
    throw new Error("La descrizione non può essere vuota.");
  }

  const payload = await apiRequest("/api/todos", {
    method: "POST",
    body: JSON.stringify({ text: text.trim(), userId, isPrivate })
  });

  return payload.todo;
}

export async function updateTodo(id, text, actingUserId, isPrivate) {
  const body = { text: text.trim(), actingUserId };
  if (isPrivate !== undefined) body.isPrivate = Boolean(isPrivate);

  const payload = await apiRequest(`/api/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body)
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
