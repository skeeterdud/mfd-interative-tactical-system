// scripts/app.js
// Main UI controller: routes to Screen A / B / C modules

import { getState, subscribe, setScreen, syncTacticalUnitsFromIncident } from "./state.js";

import { renderScreenA, attachHandlersA } from "./screens/screenA_incident.js";
import { renderScreenB, attachHandlersB } from "./screens/screenB_irr.js";
import { renderScreenC, attachHandlersC } from "./screens/screenC_tactical.js";

let rootEl = null;

export function initApp(mountId = "app") {
  rootEl = document.getElementById(mountId);
  if (!rootEl) {
    console.error(`initApp: element #${mountId} not found`);
    return;
  }

  const state = getState();
  render(state);
  subscribe(render);
}

function render(state) {
  if (!rootEl) return;

  // If user is on Tactical screen, ensure tactical.units mirrors incident selected units
  if (state.screen === "tactical") {
    syncTacticalUnitsFromIncident();
    state = getState(); // refresh local copy after sync
  }

  rootEl.innerHTML = `
    <div class="app-shell">
      <header class="top-bar">
        <div class="app-title">MFD Interactive Tactical System</div>
        <div class="app-subtitle">Training / Command Support Prototype</div>
      </header>

      <nav class="screen-tabs">
        <button class="screen-tab ${state.screen === "incident" ? "active" : ""}" data-screen="incident">
          A. Incident Setup
        </button>
        <button class="screen-tab ${state.screen === "irr" ? "active" : ""}" data-screen="irr">
          B. IRR / IAP
        </button>
        <button class="screen-tab ${state.screen === "tactical" ? "active" : ""}" data-screen="tactical">
          C. Tactical View
        </button>
      </nav>

      <main class="screen-container">
        ${renderScreen(state)}
      </main>
    </div>
  `;

  attachGlobalHandlers();
  attachScreenHandlers(state);
}

function renderScreen(state) {
  if (state.screen === "incident") return renderScreenA(state);
  if (state.screen === "irr") return renderScreenB(state);
  if (state.screen === "tactical") return renderScreenC(state);
  return `<section class="card">Unknown screen</section>`;
}

function attachGlobalHandlers() {
  document.querySelectorAll(".screen-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const screen = btn.dataset.screen;
      if (screen) setScreen(screen);
    });
  });
}

function attachScreenHandlers(state) {
  if (state.screen === "incident") attachHandlersA(state);
  if (state.screen === "irr") attachHandlersB(state);
  if (state.screen === "tactical") attachHandlersC(state);
}
