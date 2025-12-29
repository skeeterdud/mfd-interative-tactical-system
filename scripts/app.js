// app.js
// Main UI controller for MFD Size Up Trainer

import {
  getState,
  subscribe,
  setScreen,
  setIncidentField,
  toggleIncidentUnit,
  setIrrField,
  toggleIrrArrayField,
  ALL_UNITS,
} from "./state.js";

let rootEl = null;

// --- Local follow-up state (Screen C only) -------------------
let followupLocal = {
  assignments: [],      // { id, unitIds:[], task, location, objective, status, createdAt, updatedAt }
  benchmarks: {},       // name -> { done, unitIds:[], note, timestamp }
  logs: [],             // { type: "CAN"|"ROOF"|"COMMAND_TRANSFER", text, timestamp }
  additionalUnits: [],  // extra unit ids added from "Additional Units" tab
};

const FOLLOWUP_BENCHMARKS = [
  "Primary All Clear",
  "Secondary All Clear",
  "Fire Under Control",
  "Loss Stopped",
  "PAR",
  "RIT Established",
];

// --- INIT ----------------------------------------------------

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

// --- ROOT RENDER --------------------------------------------

function render(state) {
  if (!rootEl) return;

  let screenHtml = "";
  switch (state.screen) {
    case "incident":
    default:
      screenHtml = renderIncidentScreen(state);
      break;
    case "irr":
      screenHtml = renderIrrScreen(state);
      break;
    case "followup":
      screenHtml = renderFollowupScreen(state);
      break;
  }

  rootEl.innerHTML = `
    <div class="app-shell">
      <header class="top-bar">
        <div class="app-title">MFD Size Up Trainer</div>
      </header>
      <main class="screen-container">
        ${screenHtml}
      </main>
    </div>
  `;

  wireHandlers(state);
}

// ---------------------------------------------------------------------
// SCREEN A: INCIDENT / BATTALION & UNITS
// ---------------------------------------------------------------------
function renderIncidentScreen(state) {
  const incident = state.incident || {};
  const selectedUnitIds = incident.selectedUnitIds || [];

  const unitPills = ALL_UNITS.map((u) => {
    const active = selectedUnitIds.includes(u.id);
    return `
      <button 
        class="unit-pill ${active ? "unit-pill--active" : ""}"
        data-unit-toggle="${u.id}"
        type="button"
      >
        ${u.label}
      </button>
    `;
  }).join("");

  return `
    <section class="screen screen-incident">
      <h2>Screen A – Incident / Battalion & Units</h2>

      <div class="incident-grid">
        <div class="incident-row">
          <label>
            Incident Type
            <input 
              type="text" 
              value="${incident.type || ""}" 
              data-incident-field="type"
            />
          </label>
        </div>

        <div class="incident-row">
          <label>
            Location
            <input 
              type="text" 
              value="${incident.location || ""}" 
              data-incident-field="location"
            />
          </label>
        </div>

        <div class="incident-row">
          <label>
            Battalion
            <input 
              type="text" 
              value="${incident.battalion || ""}" 
              data-incident-field="battalion"
            />
          </label>
        </div>
      </div>

      <div class="incident-row">
        <div class="unit-section">
          <h3>Responding Units</h3>
          <div class="unit-list">
            ${unitPills}
          </div>
        </div>
      </div>

      <div class="screen-actions">
        <button type="button" data-next-screen="irr">Next: IRR / IAP</button>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------
// SCREEN B: IRR / IAP
// ---------------------------------------------------------------------
function renderIrrScreen(state) {
  const irr = state.irr || {};
  const building = irr.buildingDescription || "";
  const problem = irr.problemDescription || "";
  const iap = irr.initialActionPlan || "";
  const strategy = irr.strategy || "";
  const generated = irr.generatedSizeUp || "";

  return `
    <section class="screen screen-irr">
      <h2>Screen B – IRR / IAP</h2>

      <div class="irr-grid">
        <div class="irr-box">
          <h3>Building Description</h3>
          <textarea 
            data-irr-field="buildingDescription"
            rows="5"
          >${building}</textarea>
        </div>

        <div class="irr-box">
          <h3>Problem Description</h3>
          <textarea 
            data-irr-field="problemDescription"
            rows="5"
          >${problem}</textarea>
        </div>

        <div class="irr-box">
          <h3>Initial Action Plan</h3>
          <textarea 
            data-irr-field="initialActionPlan"
            rows="5"
          >${iap}</textarea>
        </div>

        <div class="irr-box">
          <h3>Strategy / Command</h3>
          <textarea 
            data-irr-field="strategy"
            rows="5"
          >${strategy}</textarea>
        </div>
      </div>

      <div class="strategy-confirm">
        <h3>Confirm Strategy</h3>
        <div class="strategy-button-row">
          <button type="button" class="strategy-btn" data-strategy-confirm="Offensive">Offensive</button>
          <button type="button" class="strategy-btn" data-strategy-confirm="Defensive">Defensive</button>
          <button type="button" class="strategy-btn" data-strategy-confirm="Investigative">Investigative</button>
          <button type="button" class="strategy-btn" data-strategy-confirm="KEEP">Keep Current Assignment</button>
        </div>
      </div>

      <div class="sizeup-output">
        <h3>Generated Size-Up</h3>
        <textarea rows="5" readonly id="generated-sizeup">${generated}</textarea>
      </div>

      <div class="screen-actions irr-actions">
        <button type="button" data-action="generate-sizeup">Generate Size-Up</button>
        <div class="irr-bottom-buttons">
          <button type="button" data-action="start-over">Start Over</button>
          <button type="button" data-next-screen="followup">Follow Up</button>
        </div>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------
// SCREEN C: FOLLOW-UP / ASSIGNMENTS BOARD
// ---------------------------------------------------------------------
function renderFollowupScreen(state) {
  const incident = state.incident || {};
  const irr = state.irr || {};

  const selectedUnitIds = incident.selectedUnitIds || [];
  const extraIds = followupLocal.additionalUnits || [];

  // Unique set of "in-route" units (from Screen A + Additional Units tab)
  const inRouteUnitIds = [...new Set([...selectedUnitIds, ...extraIds])];

  const inRouteUnits = ALL_UNITS.filter((u) => inRouteUnitIds.includes(u.id));

  const inRouteHtml = inRouteUnits.map((u) => `
    <button 
      type="button"
      class="unit-tab"
      data-followup-unit="${u.id}"
    >
      <span class="unit-tab-circle"></span>
      <span class="unit-tab-label">${u.label}</span>
    </button>
  `).join("");

  // Command: by default use IRR commandUnitId if it exists, else first in-route unit
  const currentCommandUnitId = irr.commandUnitId || (inRouteUnits[0]?.id || "");
  const commandUnitLabel = ALL_UNITS.find(u => u.id === currentCommandUnitId)?.label || currentCommandUnitId || "—";

  const commandSelectOptions = inRouteUnits.map((u) => `
    <option value="${u.id}" ${u.id === currentCommandUnitId ? "selected" : ""}>${u.label}</option>
  `).join("");

  const assignmentsHtml = (followupLocal.assignments || []).map((a) => {
    const unitLabels = a.unitIds
      .map(id => ALL_UNITS.find(u => u.id === id)?.label || id)
      .join(" / ");

    return `
      <div class="assignment-card" data-assignment-id="${a.id}">
        <div class="assignment-header">
          <div class="assignment-units">${unitLabels || "Unknown Unit"}</div>
          <div class="assignment-timestamps">
            <div>Created: ${a.createdAt || ""}</div>
            <div>Updated: ${a.updatedAt || ""}</div>
          </div>
        </div>
        <div class="assignment-body">
          <div><strong>Task:</strong> ${a.task || ""}</div>
          <div><strong>Location:</strong> ${a.location || ""}</div>
          <div><strong>Objective:</strong> ${a.objective || ""}</div>
        </div>
        <div class="assignment-status">
          <span>Status:</span>
          <button 
            type="button" 
            data-assignment-status="Complete"
            class="${a.status === "Complete" ? "status-btn status-btn--active" : "status-btn"}"
          >Complete</button>
          <button 
            type="button" 
            data-assignment-status="Recycle"
            class="${a.status === "Recycle" ? "status-btn status-btn--active" : "status-btn"}"
          >Recycle</button>
          <button 
            type="button" 
            data-assignment-status="Rehab"
            class="${a.status === "Rehab" ? "status-btn status-btn--active" : "status-btn"}"
          >Rehab</button>
        </div>
      </div>
    `;
  }).join("") || `<p class="placeholder">No assignments yet – tap a unit at the top to create one.</p>`;

  const benchmarksHtml = FOLLOWUP_BENCHMARKS.map((name) => {
    const entry = followupLocal.benchmarks[name];
    let statusText = "Not completed";
    if (entry?.done) {
      const unitLabels = (entry.unitIds || [])
        .map(id => ALL_UNITS.find(u => u.id === id)?.label || id)
        .join(", ");
      statusText = `${entry.timestamp || ""} – ${unitLabels || "Units not recorded"}`;
    }

    return `
      <div class="benchmark-row" data-benchmark="${name}">
        <div class="benchmark-label">${name}</div>
        <div class="benchmark-status">${statusText}</div>
        <button type="button" class="benchmark-mark-btn">Mark</button>
      </div>
    `;
  }).join("");

  return `
    <section class="screen screen-followup">
      <!-- Left IRR Tab -->
      <div class="followup-left-rail">
        <button type="button" class="irr-tab" data-next-screen="irr">
          IRR
        </button>
      </div>

      <!-- Main Assignment Board -->
      <div class="followup-board">
        <!-- Top: In Route / Level 1 units -->
        <div class="followup-top-tabs">
          <h3>In Route / Level 1 Units</h3>
          <div class="unit-tab-row">
            ${inRouteHtml || `<p class="placeholder">No units selected. Use Screen A or Additional Units tab.</p>`}
          </div>
        </div>

        <div class="followup-main-columns">
          <!-- Right: Command + Assignments + Benchmarks -->
          <div class="followup-right-column">
            <div class="command-block">
              <h3>Command</h3>
              <label>
                Command Unit:
                <select data-followup-command>
                  <option value="">— Select —</option>
                  ${commandSelectOptions}
                </select>
              </label>
              <div class="command-current">
                Current Command: <strong>${commandUnitLabel}</strong>
              </div>
            </div>

            <div class="assignments-block">
              <div class="block-header">
                <h3>Assigned Units</h3>
              </div>
              <div class="assignments-list">
                ${assignmentsHtml}
              </div>
            </div>

            <div class="benchmarks-block">
              <div class="block-header">
                <h3>Benchmarks</h3>
              </div>
              <div class="benchmarks-list">
                ${benchmarksHtml}
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Tabs -->
        <div class="followup-bottom">
          <div class="followup-tabs">
            <button type="button" class="followup-tab" data-followup-tab="CAN">CAN Report</button>
            <button type="button" class="followup-tab" data-followup-tab="ROOF">Roof Report</button>
            <button type="button" class="followup-tab" data-followup-tab="COMMAND_TRANSFER">Command Transfer</button>
            <button type="button" class="followup-tab" data-followup-tab="ADDITIONAL">Additional Units</button>
          </div>
          <div class="followup-tab-content">
            <div class="tab-panel" data-followup-panel="CAN">
              <h4>CAN Report</h4>
              <textarea rows="3" placeholder="Conditions, Actions, Needs..." data-followup-can-text></textarea>
              <button type="button" data-followup-save-can>Save CAN</button>
            </div>
            <div class="tab-panel" data-followup-panel="ROOF" hidden>
              <h4>Roof Report</h4>
              <textarea rows="3" placeholder="Roof conditions..." data-followup-roof-text></textarea>
              <button type="button" data-followup-save-roof>Save Roof Report</button>
            </div>
            <div class="tab-panel" data-followup-panel="COMMAND_TRANSFER" hidden>
              <h4>Command Transfer</h4>
              <label>From:<input type="text" data-followup-ct-from /></label>
              <label>To:<input type="text" data-followup-ct-to /></label>
              <textarea rows="3" placeholder="Notes..." data-followup-ct-notes></textarea>
              <button type="button" data-followup-save-ct>Save Command Transfer</button>
            </div>
            <div class="tab-panel" data-followup-panel="ADDITIONAL" hidden>
              <h4>Additional Units</h4>
              <div class="additional-units-list">
                ${ALL_UNITS.map((u) => {
                  const already = inRouteUnitIds.includes(u.id);
                  if (already) return "";
                  return `
                    <label class="additional-unit-option">
                      <input type="checkbox" value="${u.id}" data-followup-additional-unit />
                      ${u.label}
                    </label>
                  `;
                }).join("") || `<p class="placeholder">All units are already on the board.</p>`}
              </div>
              <button type="button" data-followup-add-units>Apply Additional Units</button>
            </div>
          </div>
        </div>

        <!-- Bottom Buttons -->
        <div class="screen-actions followup-actions">
          <button type="button" data-next-screen="irr">Back: IRR</button>
          <button type="button" data-action="print-all">Print / PDF</button>
          <button type="button" data-action="new-sizeup">New Size Up</button>
        </div>
      </div>

      <!-- Simple modal for creating/editing assignments -->
      <div class="assignment-modal-backdrop" hidden>
        <div class="assignment-modal">
          <h3>Create Assignment</h3>
          <div class="assignment-modal-body">
            <div>
              <label>Primary Unit:
                <input type="text" data-modal-unit readonly />
              </label>
            </div>
            <div>
              <label>Task:
                <input type="text" data-modal-task placeholder="Fire attack, search, RIT..." />
              </label>
            </div>
            <div>
              <label>Location:
                <input type="text" data-modal-location placeholder="Alpha side, 2nd floor..." />
              </label>
            </div>
            <div>
              <label>Objective:
                <textarea rows="2" data-modal-objective placeholder="Confine fire, primary search Division 2..."></textarea>
              </label>
            </div>
            <div>
              <label>Additional Units (optional):</label>
              <div class="modal-additional-units">
                ${inRouteUnits.map((u) => `
                  <label>
                    <input type="checkbox" value="${u.id}" data-modal-additional-unit />
                    ${u.label}
                  </label>
                `).join("")}
              </div>
            </div>
          </div>
          <div class="assignment-modal-actions">
            <button type="button" data-modal-save>Save Assignment</button>
            <button type="button" data-modal-cancel>Cancel</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------
// EVENT WIRING
// ---------------------------------------------------------------------
function wireHandlers(state) {
  const screen = state.screen || "incident";

  wireCommonNavigationHandlers();

  if (screen === "incident") {
    wireIncidentHandlers();
  } else if (screen === "irr") {
    wireIrrHandlers();
  } else if (screen === "followup") {
    wireFollowupHandlers();
  }
}

// --- Common nav buttons (data-next-screen) -------------------
function wireCommonNavigationHandlers() {
  document.querySelectorAll("[data-next-screen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-next-screen");
      if (target) setScreen(target);
    });
  });
}

// --- Screen A Handlers ---------------------------------------
function wireIncidentHandlers() {
  // Incident text fields
  document.querySelectorAll("[data-incident-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const field = input.getAttribute("data-incident-field");
      if (!field) return;
      setIncidentField(field, input.value);
    });
  });

  // Unit toggles
  document.querySelectorAll("[data-unit-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-unit-toggle");
      if (!id) return;
      toggleIncidentUnit(id);
    });
  });
}

// --- Screen B Handlers ---------------------------------------
function wireIrrHandlers() {
  // IRR textareas
  document.querySelectorAll("[data-irr-field]").forEach((ta) => {
    ta.addEventListener("input", () => {
      const field = ta.getAttribute("data-irr-field");
      if (!field) return;
      setIrrField(field, ta.value);
    });
  });

  // Generate size-up
  const genBtn = document.querySelector("[data-action='generate-sizeup']");
  if (genBtn) {
    genBtn.addEventListener("click", () => {
      const state = getState();
      const irr = state.irr || {};
      const incident = state.incident || {};

      const parts = [];
      if (incident.location) parts.push(`We are on scene at ${incident.location}.`);
      if (irr.buildingDescription) parts.push(irr.buildingDescription);
      if (irr.problemDescription) parts.push(irr.problemDescription);
      if (irr.initialActionPlan) parts.push(`Our initial action plan is: ${irr.initialActionPlan}.`);
      if (irr.strategy) parts.push(`Strategy is ${irr.strategy}.`);

      const text = parts.join(" ");
      setIrrField("generatedSizeUp", text);
    });
  }

  // Confirm Strategy buttons
  document.querySelectorAll("[data-strategy-confirm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-strategy-confirm");
      if (!val) return;
      setIrrField("confirmedStrategy", val);
    });
  });

  // Start Over
  const startOverBtn = document.querySelector("[data-action='start-over']");
  if (startOverBtn) {
    startOverBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }
}

// --- Screen C Handlers ---------------------------------------
function wireFollowupHandlers() {
  const root = document.querySelector(".screen-followup");
  if (!root) return;

  // Bottom tabs (CAN / ROOF / CT / ADDITIONAL)
  root.querySelectorAll(".followup-tab").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      const tabName = tabBtn.getAttribute("data-followup-tab");
      if (!tabName) return;

      root.querySelectorAll(".followup-tab").forEach((btn) => {
        btn.classList.toggle(
          "followup-tab--active",
          btn === tabBtn
        );
      });

      root.querySelectorAll(".tab-panel").forEach((panel) => {
        const panelName = panel.getAttribute("data-followup-panel");
        panel.hidden = panelName !== tabName;
      });
    });
  });

  // Default tab when screen loads
  const defaultTab = root.querySelector(".followup-tab[data-followup-tab='CAN']");
  if (defaultTab) defaultTab.click();

  // Save CAN
  const canBtn = root.querySelector("[data-followup-save-can]");
  if (canBtn) {
    canBtn.addEventListener("click", () => {
      const ta = root.querySelector("[data-followup-can-text]");
      const text = (ta && ta.value.trim()) || "";
      if (!text) return;
      followupLocal.logs.push({
        type: "CAN",
        text,
        timestamp: timeStamp(),
      });
      if (ta) ta.value = "";
    });
  }

  // Save Roof
  const roofBtn = root.querySelector("[data-followup-save-roof]");
  if (roofBtn) {
    roofBtn.addEventListener("click", () => {
      const ta = root.querySelector("[data-followup-roof-text]");
      const text = (ta && ta.value.trim()) || "";
      if (!text) return;
      followupLocal.logs.push({
        type: "ROOF",
        text,
        timestamp: timeStamp(),
      });
      if (ta) ta.value = "";
    });
  }

  // Save Command Transfer
  const ctBtn = root.querySelector("[data-followup-save-ct]");
  if (ctBtn) {
    ctBtn.addEventListener("click", () => {
      const from = root.querySelector("[data-followup-ct-from]")?.value || "";
      const to = root.querySelector("[data-followup-ct-to]")?.value || "";
      const notes = root.querySelector("[data-followup-ct-notes]")?.value || "";

      const text = `Transfer from ${from} to ${to}. ${notes}`;
      followupLocal.logs.push({
        type: "COMMAND_TRANSFER",
        text,
        timestamp: timeStamp(),
      });

      ["[data-followup-ct-from]", "[data-followup-ct-to]", "[data-followup-ct-notes]"].forEach((sel) => {
        const el = root.querySelector(sel);
        if (el) el.value = "";
      });
    });
  }

  // Additional Units: Apply
  const addUnitsBtn = root.querySelector("[data-followup-add-units]");
  if (addUnitsBtn) {
    addUnitsBtn.addEventListener("click", () => {
      const checkboxes = root.querySelectorAll("[data-followup-additional-unit]:checked");
      checkboxes.forEach((cb) => {
        const id = cb.value;
        if (!followupLocal.additionalUnits.includes(id)) {
          followupLocal.additionalUnits.push(id);
        }
      });
      // Re-render to show them in the top row
      render(getState());
    });
  }

  // Top row unit clicks -> open assignment modal
  root.querySelectorAll("[data-followup-unit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const unitId = btn.getAttribute("data-followup-unit");
      if (!unitId) return;
      openAssignmentModal(unitId);
    });
  });

  // Command select
  const cmdSelect = root.querySelector("[data-followup-command]");
  if (cmdSelect) {
    cmdSelect.addEventListener("change", () => {
      const val = cmdSelect.value;
      setIrrField("commandUnitId", val);
    });
  }

  // Assignment status buttons
  root.querySelectorAll(".assignment-card").forEach((card) => {
    const id = card.getAttribute("data-assignment-id");
    if (!id) return;
    card.querySelectorAll("[data-assignment-status]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const status = btn.getAttribute("data-assignment-status");
        updateAssignmentStatus(id, status);
        render(getState());
      });
    });
  });

  // Benchmarks "Mark" buttons
  root.querySelectorAll(".benchmark-row .benchmark-mark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".benchmark-row");
      if (!row) return;
      const name = row.getAttribute("data-benchmark");
      if (!name) return;
      handleBenchmarkMark(name);
      render(getState());
    });
  });

  // Bottom big buttons
  const printBtn = root.querySelector("[data-action='print-all']");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }

  const newSizeupBtn = root.querySelector("[data-action='new-sizeup']");
  if (newSizeupBtn) {
    newSizeupBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }

  // Modal actions
  const modalBackdrop = root.querySelector(".assignment-modal-backdrop");
  if (modalBackdrop) {
    const saveBtn = modalBackdrop.querySelector("[data-modal-save]");
    const cancelBtn = modalBackdrop.querySelector("[data-modal-cancel]");

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        saveAssignmentFromModal();
        render(getState());
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        closeAssignmentModal();
      });
    }
  }
}

// ---------------------------------------------------------------------
// Helpers for follow-up
// ---------------------------------------------------------------------
function openAssignmentModal(primaryUnitId) {
  const root = document.querySelector(".screen-followup");
  if (!root) return;
  const backdrop = root.querySelector(".assignment-modal-backdrop");
  if (!backdrop) return;

  const unitField = backdrop.querySelector("[data-modal-unit]");
  if (unitField) {
    const unit = ALL_UNITS.find((u) => u.id === primaryUnitId);
    unitField.value = unit ? unit.label : primaryUnitId;
    unitField.dataset.unitId = primaryUnitId;
  }

  // Clear fields
  const taskField = backdrop.querySelector("[data-modal-task]");
  const locField = backdrop.querySelector("[data-modal-location]");
  const objField = backdrop.querySelector("[data-modal-objective]");
  if (taskField) taskField.value = "";
  if (locField) locField.value = "";
  if (objField) objField.value = "";
  backdrop.querySelectorAll("[data-modal-additional-unit]").forEach((cb) => {
    cb.checked = false;
  });

  backdrop.hidden = false;
}

function closeAssignmentModal() {
  const root = document.querySelector(".screen-followup");
  if (!root) return;
  const backdrop = root.querySelector(".assignment-modal-backdrop");
  if (!backdrop) return;
  backdrop.hidden = true;
}

function saveAssignmentFromModal() {
  const root = document.querySelector(".screen-followup");
  if (!root) return;
  const backdrop = root.querySelector(".assignment-modal-backdrop");
  if (!backdrop) return;

  const unitField = backdrop.querySelector("[data-modal-unit]");
  const taskField = backdrop.querySelector("[data-modal-task]");
  const locField = backdrop.querySelector("[data-modal-location]");
  const objField = backdrop.querySelector("[data-modal-objective]");

  if (!unitField) return;

  const primaryId = unitField.dataset.unitId;
  if (!primaryId) return;

  const additionalIds = [];
  backdrop.querySelectorAll("[data-modal-additional-unit]:checked").forEach((cb) => {
    additionalIds.push(cb.value);
  });

  const unitIds = [primaryId, ...additionalIds];

  const assignment = {
    id: `A${Date.now()}${Math.floor(Math.random() * 1000)}`,
    unitIds,
    task: taskField?.value || "",
    location: locField?.value || "",
    objective: objField?.value || "",
    status: "Assigned",
    createdAt: timeStamp(),
    updatedAt: timeStamp(),
  };

  followupLocal.assignments.push(assignment);
  closeAssignmentModal();
}

function updateAssignmentStatus(assignmentId, status) {
  const a = followupLocal.assignments.find((x) => x.id === assignmentId);
  if (!a) return;
  a.status = status;
  a.updatedAt = timeStamp();
}

function handleBenchmarkMark(name) {
  const units = prompt(
    `Benchmark: ${name}\n\nEnter units (e.g. "Eng 2, Trk 1"):`,
    ""
  );
  const unitIds = [];
  if (units) {
    const labels = units.split(",").map((s) => s.trim());
    labels.forEach((label) => {
      const match = ALL_UNITS.find((u) => u.label.toLowerCase() === label.toLowerCase());
      if (match) unitIds.push(match.id);
    });
  }

  followupLocal.benchmarks[name] = {
    done: true,
    unitIds,
    note: "",
    timestamp: timeStamp(),
  };
}

function timeStamp() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
