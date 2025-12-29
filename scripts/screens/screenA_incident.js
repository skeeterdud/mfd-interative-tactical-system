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
  const battalion = Array.isArray(incident.battalion) ? incident.battalion : [];
  const selected = Array.isArray(incident.selectedUnitIds)
    ? incident.selectedUnitIds
    : [];

  const isBcSelected = (bc) => battalion.includes(bc);
  const isUnitSelected = (id) => selected.includes(id);

  // Unit order matches your Size Up order (+ EMS1 last)
  const orderedUnitIds = [
    "TRK1","ENG2","TRK3","ENG4","TRK5","ENG6","ENG7","TRK9","ENG10","TRK11",
    "MED1","MED2","MED3","MED5","MED6","MED7","MED9","MED10","MED11",
    "EMS1",
  ];

  const canGoNext = battalion.length > 0 && selected.length > 0;

  const unitLabelById = (id) => {
    const u = ALL_UNITS.find((x) => x.id === id);
    return u ? u.label : id;
  };

  return `
    <section class="card">
      <div class="helper-text">Step 1 of 3 – Select Battalion Chief & Units Responding</div>
      <h1 class="screen-h1">Incident Setup</h1>
      <p class="helper-text">Tap selections to toggle. Multiple Battalion selections allowed.</p>
    </section>

    <section class="card">
      <div class="block ops">
        <h2>Responding Battalion Chief</h2>
        <div class="grid grid-2">
          ${[
            { code: "BC1", label: "Battalion 1" },
            { code: "BC2", label: "Battalion 2" },
          ]
            .map(
              (b) => `
                <button type="button"
                  class="choice bc-pill ${isBcSelected(b.code) ? "selected" : ""}"
                  data-bc="${b.code}">
                  ${b.label}
                </button>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="block ops" style="margin-top:12px;">
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
      </div>

      <footer class="screen-footer">
        <!-- Start Over = different color -->
        <button class="nav-btn nav-btn-secondary" id="incidentResetBtn">Start Over</button>
        <button class="nav-btn nav-btn-primary" id="toIrrBtn" ${!canGoNext ? "disabled" : ""}>
          Start IRR ▶
        </button>
      </footer>
    </section>
  `;
}

export function attachHandlersA(state) {
  // BC multi-select
  document.querySelectorAll(".bc-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bc = btn.dataset.bc;
      if (!bc) return;

      const cur = Array.isArray(state.incident.battalion)
        ? state.incident.battalion.slice()
        : [];
      const next = cur.includes(bc) ? cur.filter((x) => x !== bc) : [...cur, bc];

      setIncidentField("battalion", next);
    });
  });

  // Units toggle
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
