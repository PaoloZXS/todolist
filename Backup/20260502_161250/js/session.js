const SESSION_KEY = "coseDaFareSession";

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearUserSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "/login/login.html";
    return null;
  }
  return user;
}
