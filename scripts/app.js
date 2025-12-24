// app.js
// Main UI controller for MFD Interactive Tactical System

import {
  getState,
  subscribe,
  setScreen,
  setIncidentField,
  toggleIncidentUnit,
} from "./state.js";

import { ALL_UNITS } from "./state.js";

let rootEl = null;

// Initialize the app; call this from index.js once DOM is ready
export function initApp(mountId = "app") {
  rootEl = document.getElementById(mountId);
  if (!rootEl) {
    console.error(`initApp: element #${mountId} not found`);
    return;
  }

  // Initial render + subscribe to future changes
  const state = getState();
  render(state);
  subscribe(render);
}

// --- RENDER ROOT ------------------------------------------------------------

function render(state) {
  if (!rootEl) return;

  rootEl.innerHTML = `
    <div class="app-shell">
      <header class="top-bar">
        <div class="app-title">MFD Interactive Tactical System</div>
        <div class="app-subtitle">Training / Command Support Prototype</div>
      </header>

      <nav class="screen-tabs">
        <button 
          class="screen-tab ${state.screen === "incident" ? "active" : ""}"
          data-screen="incident"
        >
          A. Incident Setup
        </button>
        <button 
          class="screen-tab ${state.screen === "irr" ? "active" : ""}"
          data-screen="irr"
        >
          B. IRR
        </button>
        <button 
          class="screen-tab ${state.screen === "tactical" ? "active" : ""}"
          data-screen="tactical"
        >
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

// Decide which screen to render
function renderScreen(state) {
  if (state.screen === "incident") return renderIncidentScreen(state);
  if (state.screen === "irr") return renderIrrScreen(state);
  return renderTacticalScreen(state);
}

// --- GLOBAL HANDLERS (tabs at top) -----------------------------------------

function attachGlobalHandlers() {
  document.querySelectorAll(".screen-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const screen = btn.dataset.screen;
      if (screen) setScreen(screen);
    });
  });
}

// --- SCREEN A: INCIDENT SETUP ----------------------------------------------

function renderIncidentScreen(state) {
  const { incident } = state;
  const { callType, battalion, selectedUnitIds } = incident;

  const callTypes = ["Fire", "Accident", "Large Scale Event (EMS, RTF)"];

  const canGoNext =
    callType &&
    battalion &&
    Array.isArray(selectedUnitIds) &&
    selectedUnitIds.length > 0;

  return `
    <section class="screen screen-incident">
      <h1 class="screen-title">Incident Setup</h1>
      <p class="screen-desc">
        Select battalion, call type, and which units are responding for this incident.
      </p>

      <div class="card-row">
        <section class="card">
          <h2 class="card-title">Call Type</h2>
          <div class="calltype-row">
            ${callTypes
              .map(
                (type) => `
              <label class="pill-option">
                <input 
                  type="radio" 
                  name="callType" 
                  value="${type}"
                  ${callType === type ? "checked" : ""} 
                />
                <span>${type}</span>
              </label>
            `
              )
              .join("")}
          </div>
        </section>

        <section class="card">
          <h2 class="card-title">Battalion</h2>
          <div class="calltype-row">
            ${["BC1", "BC2"]
              .map(
                (b) => `
              <label class="pill-option">
                <input 
                  type="radio" 
                  name="battalion" 
                  value="${b}"
                  ${battalion === b ? "checked" : ""} 
                />
                <span>${b}</span>
              </label>
            `
              )
              .join("")}
          </div>
          <p class="helper-text">
            This battalion will carry forward into the IRR and Tactical views.
          </p>
        </section>
      </div>

      <section class="card">
        <h2 class="card-title">Units Responding</h2>
        <p class="helper-text">
          Tap to include units on the assignment. We can refine dispatch logic later.
        </p>
        <div class="unit-grid">
          ${ALL_UNITS.map((u) => {
            const checked = selectedUnitIds.includes(u.id) ? "checked" : "";
            return `
              <label class="unit-chip">
                <input 
                  type="checkbox" 
                  class="unit-checkbox" 
                  data-unit-id="${u.id}" 
                  ${checked}
                />
                <span class="unit-label">${u.label}</span>
              </label>
            `;
          }).join("")}
        </div>
      </section>

      <footer class="screen-footer">
        <button class="nav-btn nav-btn-secondary" disabled>
          ◀ Back
        </button>
        <button 
          class="nav-btn nav-btn-primary" 
          id="toIrrBtn"
          ${!canGoNext ? "disabled" : ""}
        >
          Next: IRR ▶
        </button>
      </footer>
    </section>
  `;
}

function attachIncidentHandlers(state) {
  // Call type radios
  document.querySelectorAll('input[name="callType"]').forEach((input) => {
    input.addEventListener("change", () => {
      setIncidentField("callType", input.value);
    });
  });

  // Battalion radios
  document.querySelectorAll('input[name="battalion"]').forEach((input) => {
    input.addEventListener("change", () => {
      setIncidentField("battalion", input.value);
    });
  });

  // Unit checkboxes
  document.querySelectorAll(".unit-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => {
      const unitId = cb.dataset.unitId;
      if (unitId) toggleIncidentUnit(unitId);
    });
  });

  // Next button
  const nextBtn = document.getElementById("toIrrBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      setScreen("irr");
    });
  }
}

// --- SCREEN B: IRR ---------------------------------------------------------

function renderIrrScreen(state) {
  const { incident } = state;

  return `
    <section class="screen screen-irr">
      <h1 class="screen-title">Initial Radio Report (IRR)</h1>
      <p class="screen-desc">
        This screen will hold the IRR builder (like the size-up app), tied to the 
        battalion and units you selected on the Incident Setup screen.
      </p>

      <section class="card">
        <h2 class="card-title">Incident Context</h2>
        <ul class="summary-list">
          <li><strong>Call Type:</strong> ${incident.callType || "Not set"}</li>
          <li><strong>Battalion:</strong> ${incident.battalion || "Not set"}</li>
          <li><strong>Units Responding:</strong> 
            ${
              incident.selectedUnitIds.length
                ? incident.selectedUnitIds
                    .map((id) => {
                      const unit = ALL_UNITS.find((u) => u.id === id);
                      return unit ? unit.label : id;
                    })
                    .join(", ")
                : "None selected"
            }
          </li>
        </ul>
      </section>

      <footer class="screen-footer">
        <button class="nav-btn nav-btn-secondary" id="backToIncidentBtn">
          ◀ Back: Incident Setup
        </button>
        <button class="nav-btn nav-btn-primary" id="toTacticalBtn">
          Next: Tactical View ▶
        </button>
      </footer>
    </section>
  `;
}

function attachIrrHandlers() {
  const backBtn = document.getElementById("backToIncidentBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      setScreen("incident");
    });
  }

  const nextBtn = document.getElementById("toTacticalBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      setScreen("tactical");
    });
  }
}

// --- SCREEN C: TACTICAL VIEW ----------------------------------------------

function renderTacticalScreen(state) {
  const { tactical, incident } = state;

  const enroute = tactical.units.filter((u) => u.status === "enroute");
  const level1  = tactical.units.filter((u) => u.status === "level1");
  const onscene = tactical.units.filter((u) => u.status === "onscene");

  return `
    <section class="screen screen-tactical">
      <h1 class="screen-title">Tactical Canvas & Assignments</h1>
      <p class="screen-desc">
        This will become the interactive canvas with en route / Level 1 / on-scene
        units, assignments, benchmarks, and command transfer tools.
      </p>

      <section class="card">
        <h2 class="card-title">Quick Summary</h2>
        <ul class="summary-list">
          <li><strong>Call Type:</strong> ${incident.callType || "Not set"}</li>
          <li><strong>Battalion:</strong> ${incident.battalion || "Not set"}</li>
        </ul>
      </section>

      <section class="card">
        <h2 class="card-title">Units by Status</h2>
        <div class="status-columns">
          <div class="status-col">
            <h3>En Route</h3>
            <div class="status-list">
              ${
                enroute.length
                  ? enroute.map((u) => `<div class="status-pill">${u.label}</div>`).join("")
                  : `<div class="status-empty">None</div>`
              }
            </div>
          </div>
          <div class="status-col">
            <h3>Level 1</h3>
            <div class="status-list">
              ${
                level1.length
                  ? level1.map((u) => `<div class="status-pill">${u.label}</div>`).join("")
                  : `<div class="status-empty">None</div>`
              }
            </div>
          </div>
          <div class="status-col">
            <h3>On Scene</h3>
            <div class="status-list">
              ${
                onscene.length
                  ? onscene.map((u) => `<div class="status-pill">${u.label}</div>`).join("")
                  : `<div class="status-empty">None</div>`
              }
            </div>
          </div>
        </div>
      </section>

      <footer class="screen-footer">
        <button class="nav-btn nav-btn-secondary" id="backToIrrBtn">
          ◀ Back: IRR
        </button>
        <button class="nav-btn nav-btn-primary" id="backToIncidentFromTacBtn">
          New Incident
        </button>
      </footer>
    </section>
  `;
}

function attachTacticalHandlers() {
  const backBtn = document.getElementById("backToIrrBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      setScreen("irr");
    });
  }

  const newIncidentBtn = document.getElementById("backToIncidentFromTacBtn");
  if (newIncidentBtn) {
    newIncidentBtn.addEventListener("click", () => {
      setScreen("incident");
    });
  }
}

// --- Per-Screen handler dispatcher -----------------------------------------

function attachScreenHandlers(state) {
  if (state.screen === "incident") {
    attachIncidentHandlers(state);
  } else if (state.screen === "irr") {
    attachIrrHandlers(state);
  } else if (state.screen === "tactical") {
    attachTacticalHandlers(state);
  }
}
