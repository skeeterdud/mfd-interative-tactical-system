// scripts/app.js
// Main UI controller: routes to Screen A / B / C modules
// FIXES:
//  1) Prevent "1 letter at a time" typing issue by preserving focus/cursor + scroll across re-renders.
//  2) Avoid extra re-render loops by only syncing tactical units when entering Screen C.

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

  // --- Capture focus + cursor + scroll BEFORE we blow away the DOM
  const restore = captureUiState();

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

  // --- Restore focus + cursor + scroll AFTER re-render
  restoreUiState(restore);
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
      if (!screen) return;

      // If switching INTO tactical, sync units ONCE here (not inside render loop)
      if (screen === "tactical") {
        syncTacticalUnitsFromIncident();
      }

      setScreen(screen);
    });
  });
}

function attachScreenHandlers(state) {
  if (state.screen === "incident") attachHandlersA(state);
  if (state.screen === "irr") attachHandlersB(state);
  if (state.screen === "tactical") attachHandlersC(state);
}

/* -------------------------------------------------------------------------- */
/* Focus/cursor + scroll preservation helpers                                  */
/* -------------------------------------------------------------------------- */

function captureUiState() {
  const active = document.activeElement;

  // window scroll position
  const scrollY = window.scrollY;

  // If active element is inside our app and has an id, capture caret
  if (
    active &&
    typeof active.id === "string" &&
    active.id &&
    rootEl &&
    rootEl.contains(active)
  ) {
    const tag = (active.tagName || "").toUpperCase();
    const isTextLike =
      tag === "INPUT" || tag === "TEXTAREA" || active.isContentEditable;

    const state = {
      activeId: active.id,
      scrollY,
      isTextLike,
      // selection range (for inputs/textareas)
      selStart: null,
      selEnd: null,
    };

    try {
      if (isTextLike && typeof active.selectionStart === "number") {
        state.selStart = active.selectionStart;
        state.selEnd = active.selectionEnd;
      }
    } catch {
      // ignore
    }

    return state;
  }

  return { activeId: null, scrollY, isTextLike: false, selStart: null, selEnd: null };
}

function restoreUiState(saved) {
  if (!saved) return;

  // Restore scroll first (prevents jump-to-top feel)
  if (typeof saved.scrollY === "number") {
    window.scrollTo(0, saved.scrollY);
  }

  if (!saved.activeId) return;

  const el = document.getElementById(saved.activeId);
  if (!el) return;

  // Restore focus
  try {
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {
      // ignore
    }
  }

  // Restore caret for inputs/textareas
  try {
    if (
      saved.isTextLike &&
      typeof saved.selStart === "number" &&
      typeof saved.selEnd === "number" &&
      typeof el.setSelectionRange === "function"
    ) {
      el.setSelectionRange(saved.selStart, saved.selEnd);
    }
  } catch {
    // ignore
  }
}
