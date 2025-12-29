// ===========================
// scripts/app.js
// Main UI controller for MFD Interactive Tactical System
// (Updated: Screen A Fire Incident w/ multi-select BC + fixed unit layout incl. EMS 1)
// (Updated: IRR display shows BOTH battalions when selected)
// ===========================

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

import { renderTacticalView, attachTacticalHandlers } from "./tacticalView.js";

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

function renderScreen(state) {
  if (state.screen === "incident") return renderIncidentScreen(state);
  if (state.screen === "irr") return renderIrrScreen(state);
  if (state.screen === "tactical") return renderTacticalView(state);
  return "<div>Unknown screen</div>";
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

// --- SCREEN A: FIRE INCIDENT ------------------------------------------------

function renderIncidentScreen(state) {
  const { incident } = state;
  const { battalion, selectedUnitIds } = incident;

  // Battalion is multi-select array
  const bcSelected = Array.isArray(battalion) ? battalion : (battalion ? [battalion] : []);

  // Fixed button layout (your exact order + added units)
  const unitRows = [
    ["TRK1", "MED1", "ENG6", "MED6"],
    ["ENG2", "MED2", "ENG7"],
    ["TRK3", "MED3", "TRK9", "MED9"],
    ["ENG4", "ENG10", "MED10"],
    ["TRK5", "MED5", "TRK11", "MED11", "EMS1"],
  ];

  const canGoNext =
    bcSelected.length > 0 &&
    Array.isArray(selectedUnitIds) &&
    selectedUnitIds.length > 0;

  const unitLabelById = (id) => {
    const u = ALL_UNITS.find((x) => x.id === id);
    return u ? u.label : id;
  };

  const isUnitSelected = (id) =>
    Array.isArray(selectedUnitIds) && selectedUnitIds.includes(id);

  const isBcSelected = (bcCode) => bcSelected.includes(bcCode);

  return `
    <section class="screen screen-incident">
      <h1 class="screen-title">Fire Incident</h1>

      <section class="card">
        <h2 class="card-title">Responding Battalion Chief:</h2>
        <div class="pill-row">
          ${[
            { code: "BC1", label: "Battalion 1" },
            { code: "BC2", label: "Battalion 2" },
          ]
            .map(
              (b) => `
              <button
                type="button"
                class="choice bc-pill ${isBcSelected(b.code) ? "selected" : ""}"
                data-bc="${b.code}"
              >
                ${b.label}
              </button>
            `
            )
            .join("")}
        </div>
        <p class="helper-text">Tap to toggle. Multiple selections allowed.</p>
      </section>

      <section class="card">
        <h2 class="card-title">Responding Units:</h2>

        <div class="unit-grid unit-grid-fixed">
          ${unitRows
            .map(
              (row) => `
                <div class="unit-grid-row">
                  ${row
                    .map((id) => {
                      const selected = isUnitSelected(id);
                      return `
                        <button
                          type="button"
                          class="choice unit-pill ${selected ? "selected" : ""}"
                          data-unit-id="${id}"
                        >
                          ${unitLabelById(id)}
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              `
            )
            .join("")}
        </div>

        <p class="helper-text">
          Tap to toggle units responding. This list carries into IRR and Tactical View.
        </p>
      </section>

      <footer class="screen-footer">
        <button class="nav-btn nav-btn-secondary" id="incidentResetBtn">
          Start Over
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
  // Battalion multi-select
  document.querySelectorAll(".bc-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bc = btn.dataset.bc;
      if (!bc) return;

      const current = state.incident.battalion;
      const arr = Array.isArray(current) ? current.slice() : (current ? [current] : []);

      const next = arr.includes(bc) ? arr.filter((x) => x !== bc) : [...arr, bc];
      setIncidentField("battalion", next);
    });
  });

  // Unit toggles
  document.querySelectorAll(".unit-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const unitId = btn.dataset.unitId;
      if (unitId) toggleIncidentUnit(unitId);
    });
  });

  // Start Over
  const resetBtn = document.getElementById("incidentResetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      setIncidentField("battalion", []);
      setIncidentField("selectedUnitIds", []);
    });
  }

  // Next
  const nextBtn = document.getElementById("toIrrBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      setScreen("irr");
    });
  }
}

// --- SCREEN B: IRR ---------------------------------------------------------

function renderIrrScreen(state) {
  const { incident, irr } = state;
  const { callType, battalion, selectedUnitIds } = incident;

  const respondingUnits = (Array.isArray(selectedUnitIds) ? selectedUnitIds : [])
    .map((id) => ALL_UNITS.find((u) => u.id === id))
    .filter(Boolean);

  const isSelected = (field, value) => irr[field] === value;
  const isInArray = (field, value) =>
    Array.isArray(irr[field]) && irr[field].includes(value);

  const sizeupText = buildIrrText(state);

  // ✅ SHOW BOTH battalions if selected
  const battalionDisplayText =
    Array.isArray(battalion) && battalion.length
      ? battalion.map(battalionDisplay).filter(Boolean).join(" / ")
      : battalionDisplay(battalion) || battalion || "Not set";

  return `
    <section class="screen screen-irr">
      <h1 class="screen-title">Initial Radio Report (IRR)</h1>
      <p class="screen-desc">
        Use this screen to build the IRR. Battalion and units are carried over
        from the Incident Setup screen.
      </p>

      <section class="card">
        <h2 class="card-title">Incident Context</h2>
        <ul class="summary-list">
          <li><strong>Call Type:</strong> ${callType || "Fire"}</li>
          <li><strong>Battalion:</strong> ${battalionDisplayText}</li>
          <li><strong>Units Responding:</strong> ${
            respondingUnits.length
              ? respondingUnits.map((u) => u.label).join(", ")
              : "None selected"
          }</li>
        </ul>
      </section>

      <section class="card">
        <h2 class="card-title">Unit Giving IRR</h2>
        <p class="helper-text">
          Choose which arriving company officer is giving the IRR.
        </p>
        <div class="pill-row">
          ${
            respondingUnits.length
              ? respondingUnits
                  .map(
                    (u) => `
            <button
              class="choice irr-unit-btn ${
                irr.irrUnitId === u.id ? "selected" : ""
              }"
              data-unit-id="${u.id}"
            >
              ${u.label}
            </button>
          `
                  )
                  .join("")
              : `<div class="helper-text">No units selected on the Incident screen.</div>`
          }
        </div>
      </section>

      <section class="card irr-grid">
        <div class="irr-col">
          <h2 class="card-title">Building Description</h2>

          <div class="field-group">
            <label class="field-label">Building Size</label>
            <div class="pill-row">
              ${["Small", "Medium", "Large", "Mega"]
                .map(
                  (size) => `
                <button
                  class="choice irr-single-btn ${
                    isSelected("buildingSize", size) ? "selected" : ""
                  }"
                  data-field="buildingSize"
                  data-value="${size}"
                >
                  ${size}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Building Height</label>
            <div class="pill-row">
              ${["1", "2", "3", "4", "5"]
                .map(
                  (h) => `
                <button
                  class="choice irr-single-btn ${
                    isSelected("height", h) ? "selected" : ""
                  }"
                  data-field="height"
                  data-value="${h}"
                >
                  ${h} story
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Occupancy Type</label>
            <div class="pill-row">
              ${[
                { value: "house", label: "House" },
                { value: "apartment", label: "Apartment" },
                { value: "strip", label: "Strip Center" },
                { value: "commercial", label: "Commercial" },
                { value: "other", label: "Other" },
              ]
                .map(
                  (o) => `
                <button
                  class="choice irr-single-btn ${
                    isSelected("occupancy", o.value) ? "selected" : ""
                  }"
                  data-field="occupancy"
                  data-value="${o.value}"
                >
                  ${o.label}
                </button>
              `
                )
                .join("")}
            </div>

            ${
              irr.occupancy === "other"
                ? `
              <input
                type="text"
                class="field-input"
                id="irrOccupancyOther"
                placeholder="e.g., school, church, warehouse…"
                value="${irr.occupancyOther || ""}"
              />
            `
                : ""
            }
          </div>
        </div>

        <div class="irr-col">
          <h2 class="card-title">Problem / Conditions</h2>

          <div class="field-group">
            <label class="field-label">Conditions</label>
            <div class="pill-row">
              ${[
                { value: "nothing", label: "Nothing Showing" },
                { value: "light", label: "Light Smoke" },
                { value: "heavy", label: "Heavy Smoke" },
                { value: "working", label: "Working Fire" },
                { value: "defensive", label: "Defensive Conditions" },
              ]
                .map(
                  (c) => `
                <button
                  class="choice irr-single-btn ${
                    isSelected("conditions", c.value) ? "selected" : ""
                  }"
                  data-field="conditions"
                  data-value="${c.value}"
                >
                  ${c.label}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Problem Sides (multi)</label>
            <div class="pill-row">
              ${["Alpha", "Bravo", "Charlie", "Delta"]
                .map(
                  (side) => `
                <button
                  class="choice irr-multi-btn ${
                    isInArray("problemSides", side) ? "selected" : ""
                  }"
                  data-field="problemSides"
                  data-value="${side}"
                >
                  ${side}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Problem Location (free text)</label>
            <input
              type="text"
              class="field-input"
              id="irrProblemLocation"
              placeholder="e.g., 2nd floor / roof line / rear storage…"
              value="${irr.problemLocationText || ""}"
            />
          </div>
        </div>
      </section>

      <section class="card irr-grid">
        <div class="irr-col">
          <h2 class="card-title">Initial Action Plan</h2>

          <div class="field-group">
            <label class="field-label">Tasks (multi)</label>
            <div class="pill-row">
              ${[
                "Investigate",
                "Water Supply",
                "Attack Line",
                "Rescue",
                "OEO",
                "Defensive Op",
              ]
                .map(
                  (task) => `
                <button
                  class="choice irr-multi-btn ${
                    isInArray("iapTasks", task) ? "selected" : ""
                  }"
                  data-field="iapTasks"
                  data-value="${task}"
                >
                  ${task}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">IAP Location (multi)</label>
            <div class="pill-row">
              ${[
                { value: "1st Floor", label: "1st Floor" },
                { value: "2nd Floor", label: "2nd Floor" },
                { value: "3rd Floor", label: "3rd Floor" },
                { value: "4th Floor", label: "4th Floor" },
                { value: "Alpha", label: "Alpha" },
                { value: "Bravo", label: "Bravo" },
                { value: "Charlie", label: "Charlie" },
                { value: "Delta", label: "Delta" },
                { value: "other", label: "Other" },
              ]
                .map(
                  (loc) => `
                <button
                  class="choice irr-multi-btn ${
                    isInArray("iapLocations", loc.value) ? "selected" : ""
                  }"
                  data-field="iapLocations"
                  data-value="${loc.value}"
                >
                  ${loc.label}
                </button>
              `
                )
                .join("")}
            </div>

            ${
              Array.isArray(irr.iapLocations) && irr.iapLocations.includes("other")
                ? `
              <input
                type="text"
                class="field-input"
                id="irrIapLocationOther"
                placeholder="e.g., interior stairwell, basement, roof division…"
                value="${irr.iapLocationOther || ""}"
              />
            `
                : ""
            }
          </div>

          <div class="field-group">
            <label class="field-label">Objectives (multi)</label>
            <div class="pill-row">
              ${["Fire Attack", "Primary Search"]
                .map(
                  (obj) => `
                <button
                  class="choice irr-multi-btn ${
                    isInArray("iapObjectives", obj) ? "selected" : ""
                  }"
                  data-field="iapObjectives"
                  data-value="${obj}"
                >
                  ${obj}
                </button>
              `
                )
                .join("")}
            </div>
          </div>
        </div>

        <div class="irr-col">
          <h2 class="card-title">Strategy / Command</h2>

          <div class="field-group">
            <label class="field-label">Strategy</label>
            <div class="pill-row">
              ${["Offensive", "Defensive"]
                .map(
                  (s) => `
                <button
                  class="choice irr-single-btn ${
                    irr.strategy === s ? "selected" : ""
                  }"
                  data-field="strategy"
                  data-value="${s}"
                >
                  ${s}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Command Name</label>
            <input
              type="text"
              class="field-input"
              id="irrCommandText"
              placeholder="e.g., Trk 1 is now Main Street Command"
              value="${irr.commandText || ""}"
            />
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">Generated IRR</h2>
        <p class="helper-text">
          This is the radio-ready paragraph you can read or copy.
        </p>
        <pre class="output" id="irrOutputBox">${sizeupText}</pre>
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
  if (backBtn) backBtn.addEventListener("click", () => setScreen("incident"));

  const nextBtn = document.getElementById("toTacticalBtn");
  if (nextBtn) nextBtn.addEventListener("click", () => setScreen("tactical"));

  document.querySelectorAll(".irr-unit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.unitId;
      if (id) setIrrField("irrUnitId", id);
    });
  });

  document.querySelectorAll(".irr-single-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      if (field) setIrrField(field, value);
    });
  });

  document.querySelectorAll(".irr-multi-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      if (field && value) toggleIrrArrayField(field, value);
    });
  });

  const occOther = document.getElementById("irrOccupancyOther");
  if (occOther) {
    occOther.addEventListener("input", () => {
      setIrrField("occupancyOther", occOther.value);
    });
  }

  const probLoc = document.getElementById("irrProblemLocation");
  if (probLoc) {
    probLoc.addEventListener("input", () => {
      setIrrField("problemLocationText", probLoc.value);
    });
  }

  const iapLocOtherInput = document.getElementById("irrIapLocationOther");
  if (iapLocOtherInput) {
    iapLocOtherInput.addEventListener("input", () => {
      setIrrField("iapLocationOther", iapLocOtherInput.value);
    });
  }

  const cmdInput = document.getElementById("irrCommandText");
  if (cmdInput) {
    cmdInput.addEventListener("input", () => {
      setIrrField("commandText", cmdInput.value);
    });
  }
}

// --- HELPERS ---------------------------------------------------------------

function battalionDisplay(code) {
  const c = (code || "").trim();
  if (c === "BC1") return "Battalion 1";
  if (c === "BC2") return "Battalion 2";
  return "";
}

function mapIapLocation(loc) {
  if (!loc) return "";
  const lower = String(loc).toLowerCase();

  if (["alpha", "bravo", "charlie", "delta"].includes(lower)) {
    return `${lower} side`;
  }
  if (lower.includes("floor")) {
    return lower;
  }
  return lower;
}

function normalizeCommandName(raw, unitLabel) {
  let s = (raw || "").trim();
  if (!s && unitLabel) return `${unitLabel} is now Command`;
  if (!s) return "";
  if (/command\.?$/i.test(s)) return s.replace(/\.*$/, "");
  return `${s} Command`;
}

// --- IRR TEXT BUILDER ------------------------------------------------------

function buildIrrText(state) {
  const { incident, irr } = state;

  // For the spoken IRR, use first battalion as the lead (keeps phrasing clean)
  const battalionCodeForSpeech = Array.isArray(incident.battalion)
    ? incident.battalion[0]
    : incident.battalion;

  const battalionText = battalionDisplay(battalionCodeForSpeech);

  const irrUnit = ALL_UNITS.find((u) => u.id === irr.irrUnitId);
  const unitLabel = irrUnit ? irrUnit.label : "";

  const size = irr.buildingSize ? String(irr.buildingSize).toLowerCase() : "";
  const height = irr.height ? `${irr.height} story` : "";

  let occ = "";
  if (irr.occupancy === "other" && irr.occupancyOther) occ = irr.occupancyOther;
  else if (irr.occupancy === "house") occ = "house";
  else if (irr.occupancy === "apartment") occ = "apartment";
  else if (irr.occupancy === "strip") occ = "strip center";
  else if (irr.occupancy === "commercial") occ = "commercial building";

  const condMap = {
    nothing: "nothing showing",
    light: "light smoke",
    heavy: "heavy smoke",
    working: "working fire",
    defensive: "defensive conditions",
  };
  const cond = irr.conditions ? condMap[irr.conditions] || "" : "";

  const sides = Array.isArray(irr.problemSides) ? irr.problemSides : [];
  const sidesText = sides.map((s) => String(s).toLowerCase()).join(" / ");
  const locFree = (irr.problemLocationText || "").trim();

  let probPhrase = "";
  if (locFree && sides.length) probPhrase = `${sidesText} ${locFree}`.trim();
  else if (locFree && !sides.length) probPhrase = locFree;
  else if (!locFree && sides.length === 1) probPhrase = `${sidesText} side`;
  else if (!locFree && sides.length > 1) probPhrase = `${sidesText} sides`;

  const tasks = Array.isArray(irr.iapTasks) ? irr.iapTasks : [];
  const objectives = Array.isArray(irr.iapObjectives) ? irr.iapObjectives : [];
  const iapLocations = Array.isArray(irr.iapLocations) ? irr.iapLocations : [];

  const locPhrases = [];
  iapLocations.forEach((loc) => {
    if (loc === "other") {
      if (irr.iapLocationOther && irr.iapLocationOther.trim()) {
        locPhrases.push(irr.iapLocationOther.trim());
      }
    } else {
      const mapped = mapIapLocation(loc);
      if (mapped) locPhrases.push(mapped);
    }
  });

  const iapLocPhrase = locPhrases.length ? locPhrases.join(", ") : "";
  const taskPhrase = tasks.length ? tasks.join(", ") : "";
  const objPhrase = objectives.length ? objectives.join(", ") : "";

  const strategyLower = (irr.strategy || "Offensive").toLowerCase();
  const cmdText = normalizeCommandName(irr.commandText || "", unitLabel);

  const partsBuilding = [size, height, occ].filter(Boolean).join(" ");

  const line1 =
    `${battalionText ? battalionText + " " : ""}` +
    `${unitLabel ? "From " + unitLabel + ", " : ""}` +
    `we are on scene with a ${partsBuilding || "structure"}` +
    `${cond ? ", with " + cond : ""}` +
    `${probPhrase ? " on the " + probPhrase : ""}.`;

  const line2 =
    `${unitLabel ? unitLabel + " " : ""}` +
    `${taskPhrase ? "will be " + taskPhrase : "will be operating"}` +
    `${iapLocPhrase ? " on the " + iapLocPhrase : ""}` +
    `${objPhrase ? " for " + objPhrase : ""}.`;

  const line3 =
    `We will be in the ${strategyLower} strategy` +
    `${cmdText ? ", " + cmdText : ""}.`;

  return [line1, "", line2, "", line3].join("\n");
}

// --- Per-Screen handler dispatcher -----------------------------------------

function attachScreenHandlers(state) {
  if (state.screen === "incident") {
    attachIncidentHandlers(state);
  } else if (state.screen === "irr") {
    attachIrrHandlers(state);
  } else if (state.screen === "tactical") {
    attachTacticalHandlers();
  }
}
