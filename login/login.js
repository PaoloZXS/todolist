import { loginUser } from "../js/turso-api.js";
import { saveUserSession, getCurrentUser } from "../js/session.js";

const user = getCurrentUser();
if (user) {
  window.location.href = "../todos/todos.html";
}

const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const groupInput = document.getElementById("groupName");
const message = document.getElementById("loginMessage");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  try {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const groupName = groupInput.value.trim();
    const userData = await loginUser(username, password, groupName);
    saveUserSession(userData);
    window.location.href = "../todos/todos.html";
  } catch (error) {
    message.textContent = error.message || "Errore durante il login.";
  }
});
