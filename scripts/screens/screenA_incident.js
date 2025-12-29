// scripts/screens/screenA_incident.js

import {
  ALL_UNITS,
  setScreen,
  setIncidentField,
  toggleIncidentUnit,
  resetAll,
} from "../state.js";

export function renderScreenA(state) {
  const { incident } = state;
  const selected = Array.isArray(incident.selectedUnitIds) ? incident.selectedUnitIds : [];

  const isUnitSelected = (id) => selected.includes(id);

  // ✅ Unit order: BC1, BC2 first, then your Size Up order (+ EMS1 last)
  const orderedUnitIds = [
    "BC1","BC2",
    "TRK1","ENG2","TRK3","ENG4","TRK5","ENG6","ENG7","TRK9","ENG10","TRK11",
    "MED1","MED2","MED3","MED5","MED6","MED7","MED9","MED10","MED11",
    "EMS1",
  ];

  const canGoNext = selected.length > 0;

  const unitLabelById = (id) => {
    const u = ALL_UNITS.find((x) => x.id === id);
    return u ? u.label : id;
  };

  return `
    <section class="card">
      <div class="helper-text">Step 1 of 3 – Select Units Responding</div>
      <h1 style="margin:6px 0 0 0;">Incident Setup</h1>
      <p class="helper-text">Tap units to toggle. Keep it simple under stress.</p>
    </section>

    <section class="card">
      <div class="block ops">
        <h2>Units Responding</h2>

        <div class="unit-grid">
          ${orderedUnitIds
            .map((id) => `
              <button type="button"
                class="choice unit-pill ${isUnitSelected(id) ? "selected" : ""}"
                data-unit-id="${id}">
                ${unitLabelById(id)}
              </button>
            `)
            .join("")}
        </div>

        <p class="helper-text" style="margin-top:10px;">
          These units carry into IRR and Tactical View.
        </p>

        <footer class="screen-footer">
          <button class="nav-btn nav-btn-danger" id="incidentResetBtn">Start Over</button>
          <button class="nav-btn nav-btn-primary" id="toIrrBtn" ${!canGoNext ? "disabled" : ""}>
            Start IRR ▶
          </button>
        </footer>
      </div>
    </section>
  `;
}

export function attachHandlersA(state) {
  // Units
  document.querySelectorAll(".unit-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const unitId = btn.dataset.unitId;
      if (unitId) toggleIncidentUnit(unitId);
    });
  });

  // Start Over
  const resetBtn = document.getElementById("incidentResetBtn");
  if (resetBtn) resetBtn.addEventListener("click", resetAll);

  // Next
  const nextBtn = document.getElementById("toIrrBtn");
  if (nextBtn) nextBtn.addEventListener("click", () => setScreen("irr"));
}
