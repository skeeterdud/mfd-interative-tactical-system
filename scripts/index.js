// =========================
// scripts/index.js
// =========================
import { initApp } from "./app.js";

// Helpful smoke test:
console.log("index.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  initApp("app");
});
