// tacticalView.js
// Tactical Worksheet view for the MFD Interactive Tactical System

import {
  getState,
  setScreen,
  ALL_UNITS,
  setUnitStatus,
  setCommand,
  setFollowUpField,
  setFollowUpGeneratedText,
  addBenchmark,
} from "./state.js";

// ---------------------------------------------------------------------------
// Public API used by app.js
// ---------------------------------------------------------------------------

export function renderTacticalView(state) {
  const { incident, irr, tactical } = state;
  const { callType, battalion, selectedUnitIds } = incident;

  const respondingUnits = (Array.isArray(selectedUnitIds) ? selectedUnitIds : [])
    .map((id) => ALL_UNITS.find((u) => u.id === id))
    .filter(Boolean);

  const battalionDisplayText =
    battalionDisplay(battalion) || battalion || "Not set";

  const irrText = buildIrrText(state);

  const completedBenchmarkIds = new Set(
    (tactical.benchmarks || []).map((b) => b.id)
  );

  return `
    <section class="screen screen-tactical">
      <h1 class="screen-title">Tactical Worksheet</h1>
      <p class="screen-desc">
        Use this view to manage company status, benchmarks, and follow-up,
        with a tactical summary built from your IRR and follow-up inputs.
      </p>

      <!-- INCIDENT SNAPSHOT + IRR -->
      <section class="card">
        <h2 class="card-title">Incident Snapshot</h2>
        <div class="snapshot-grid">
          <div>
            <ul class="summary-list">
              <li><strong>Call Type:</strong> ${callType || "Not set"}</li>
              <li><strong>Battalion:</strong> ${battalionDisplayText}</li>
              <li><strong>Units Responding:</strong> ${
                respondingUnits.length
                  ? respondingUnits.map((u) => u.label).join(", ")
                  : "None selected"
              }</li>
            </ul>
          </div>
          <div>
            <label class="field-label">Current IRR (reference)</label>
            <pre class="output small" id="tacticalIrrPreview">${irrText}</pre>
          </div>
        </div>
      </section>

      <!-- COMPANY STATUS BOARD -->
      <section class="card">
        <h2 class="card-title">Company Status Board</h2>
        <p class="helper-text">
          Tap a company to cycle status: Available → Enroute → Level 1 → On Scene.
        </p>
        <div class="unit-grid tactical-unit-grid">
          ${tactical.units
            .map(
              (u) => `
            <button
              class="unit-chip tactical-unit-chip status-${u.status}"
              data-unit-id="${u.id}"
              data-status="${u.status}"
            >
              <span class="unit-label">${u.label}</span>
              <span class="unit-status">${formatStatus(u.status)}</span>
            </button>
          `
            )
            .join("")}
        </div>
      </section>

      <!-- COMMAND / IC INFO -->
      <section class="card">
        <h2 class="card-title">Command / IC</h2>
        <p class="helper-text">
          Set which company is in command and the command name.
        </p>
        <div class="command-grid">
          <div class="field-group">
            <label class="field-label">IC Unit</label>
            <select id="tacticalIcUnitSelect" class="field-input">
              <option value="">-- Select IC Unit --</option>
              ${tactical.units
                .map(
                  (u) => `
                <option 
                  value="${u.id}" 
                  ${u.id === tactical.command.currentIcUnitId ? "selected" : ""}
                >
                  ${u.label}
                </option>
              `
                )
                .join("")}
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Command Name</label>
            <input
              type="text"
              id="tacticalIcNameInput"
              class="field-input"
              placeholder="e.g., Main Street Command"
              value="${tactical.command.icName || ""}"
            />
          </div>
        </div>
      </section>

      <!-- BENCHMARKS -->
      <section class="card">
        <h2 class="card-title">Tactical Benchmarks</h2>
        <p class="helper-text">
          Tap a benchmark when it is completed. These will feed into the tactical summary.
        </p>
        <div class="benchmark-row">
          ${renderBenchmarkButton(
            "primarySearchAllClear",
            "Primary Search All Clear",
            completedBenchmarkIds
          )}
          ${renderBenchmarkButton(
            "fireUnderControl",
            "Fire Under Control",
            completedBenchmarkIds
          )}
          ${renderBenchmarkButton(
            "lossStopped",
            "Loss Stopped",
            completedBenchmarkIds
          )}
          ${renderBenchmarkButton(
            "parComplete",
            "PAR Complete",
            completedBenchmarkIds
          )}
        </div>
        ${
          tactical.benchmarks && tactical.benchmarks.length
            ? `
          <div class="benchmark-list-wrapper">
            <label class="field-label">Completed Benchmarks</label>
            <ul class="summary-list">
              ${tactical.benchmarks
                .map((b) => {
                  const timeStr = formatTime(b.completedAt);
                  const unitLabels = (b.units || [])
                    .map((id) => {
                      const u = tactical.units.find((u) => u.id === id);
                      return u ? u.label : id;
                    })
                    .join(", ");
                  return `
                    <li>
                      <strong>${b.label}</strong>
                      ${
                        unitLabels
                          ? `&nbsp;–&nbsp;<span>${unitLabels}</span>`
                          : ""
                      }
                      ${timeStr ? `&nbsp;@ ${timeStr}` : ""}
                    </li>
                  `;
                })
                .join("")}
            </ul>
          </div>
        `
            : ""
        }
      </section>

      <!-- 360 / FOLLOW-UP -->
      <section class="card">
        <h2 class="card-title">360 / Follow-Up</h2>
        <div class="followup-grid">
          <div class="field-group">
            <label class="field-label">360 Status</label>
            <select id="followup_r360" class="field-input">
              <option value=""></option>
              <option value="Not completed" ${
                tactical.followUp.r360 === "Not completed" ? "selected" : ""
              }>Not completed</option>
              <option value="In progress" ${
                tactical.followUp.r360 === "In progress" ? "selected" : ""
              }>In progress</option>
              <option value="Completed" ${
                tactical.followUp.r360 === "Completed" ? "selected" : ""
              }>Completed</option>
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">Safety</label>
            <input
              type="text"
              id="followup_safety"
              class="field-input"
              placeholder="e.g., accountability established, hazards identified"
              value="${tactical.followUp.safety || ""}"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Strategy Confirmation</label>
            <input
              type="text"
              id="followup_confirmStrategy"
              class="field-input"
              placeholder="e.g., remaining offensive with interior operations"
              value="${tactical.followUp.confirmStrategy || ""}"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Strategy Notes</label>
            <textarea
              id="followup_confirmNotes"
              class="field-input"
              rows="2"
              placeholder="Brief CAN-level notes, divisions/groups, exposures, etc."
            >${tactical.followUp.confirmNotes || ""}</textarea>
          </div>

          <div class="field-group">
            <label class="field-label">Resource Determination</label>
            <textarea
              id="followup_resourceDetermination"
              class="field-input"
              rows="2"
              placeholder="e.g., requesting 2 additional engines, 1 truck, 1 medic for relief"
            >${tactical.followUp.resourceDetermination || ""}</textarea>
          </div>

          <div class="field-group">
            <label class="field-label">Additional Info</label>
            <textarea
              id="followup_additional"
              class="field-input"
              rows="2"
              placeholder="Other notes you want captured in the summary"
            >${tactical.followUp.additional || ""}</textarea>
          </div>
        </div>
      </section>

      <!-- GENERATED TACTICAL SUMMARY -->
      <section class="card">
        <h2 class="card-title">Generated Tactical Summary</h2>
        <p class="helper-text">
          This combines the IRR, 360/follow-up inputs, and benchmarks into a quick radio-ready update.
        </p>
        <pre class="output" id="tacticalOutputBox">${
          tactical.followUp.generatedText || ""
        }</pre>
      </section>

      <footer class="screen-footer">
        <button class="nav-btn nav-btn-secondary" id="backToIrrBtn">
          ◀ Back: IRR
        </button>
      </footer>
    </section>
  `;
}

// Called from app.js after each render on the Tactical screen.
// (It will be passed `state` but we don't need the argument.)
export function attachTacticalHandlers() {
  // Back button -> IRR
  const backBtn = document.getElementById("backToIrrBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => setScreen("irr"));
  }

  // Company status board: cycle status on click
  document.querySelectorAll(".tactical-unit-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const unitId = btn.dataset.unitId;
      const currentStatus = btn.dataset.status || "available";
      const next = nextStatus(currentStatus);
      if (unitId && next) {
        setUnitStatus(unitId, next);
        // state change will trigger a full re-render; no need to manually update DOM here
      }
    });
  });

  // Command / IC
  const icUnitSelect = document.getElementById("tacticalIcUnitSelect");
  const icNameInput = document.getElementById("tacticalIcNameInput");

  const applyCommandUpdate = () => {
    const unitId = icUnitSelect ? icUnitSelect.value : "";
    const icName = icNameInput ? icNameInput.value : "";
    setCommand(unitId, icName);
    updateTacticalOutput(); // keep summary in sync
  };

  if (icUnitSelect) {
    icUnitSelect.addEventListener("change", applyCommandUpdate);
  }
  if (icNameInput) {
    icNameInput.addEventListener("input", applyCommandUpdate);
  }

  // Benchmarks
  document.querySelectorAll(".benchmark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.benchmarkId;
      const label = btn.dataset.benchmarkLabel;
      if (!id || !label) return;

      const state = getState();
      const already = (state.tactical.benchmarks || []).some(
        (b) => b.id === id
      );
      if (!already) {
        // For now we don't associate specific units; that can be added later
        addBenchmark(id, label, []);
      }
      // Summary uses benchmarks list
      updateTacticalOutput();
    });
  });

  // Follow-up fields
  const followUpFields = [
    "r360",
    "safety",
    "confirmStrategy",
    "confirmNotes",
    "resourceDetermination",
    "additional",
  ];

  followUpFields.forEach((field) => {
    const el = document.getElementById(`followup_${field}`);
    if (!el) return;

    const handlerType = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(handlerType, () => {
      setFollowUpField(field, el.value);
      updateTacticalOutput();
    });
  });

  // Initial summary build
  updateTacticalOutput();
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function renderBenchmarkButton(id, label, completedIds) {
  const isCompleted = completedIds.has(id);
  return `
    <button
      type="button"
      class="benchmark-btn ${isCompleted ? "completed" : ""}"
      data-benchmark-id="${id}"
      data-benchmark-label="${label}"
    >
      ${label}
    </button>
  `;
}

// ---------------------------------------------------------------------------
// Tactical summary builder
// ---------------------------------------------------------------------------

function updateTacticalOutput() {
  const state = getState();
  const { incident, tactical } = state;
  const battalionText =
    battalionDisplay(incident.battalion) || incident.battalion || "Command";

  const lines = [];

  // Header
  lines.push(`${battalionText}: tactical update.`);
  lines.push("");

  // IC info
  if (tactical.command.icName || tactical.command.currentIcUnitId) {
    const icUnit = tactical.units.find(
      (u) => u.id === tactical.command.currentIcUnitId
    );
    const icLabel = icUnit ? icUnit.label : tactical.command.currentIcUnitId;
    lines.push(
      `Command: ${tactical.command.icName || "Command"} ${
        icLabel ? `(${icLabel})` : ""
      }.`
    );
    lines.push("");
  }

  // 360 + follow-up
  const f = tactical.followUp;

  if (f.r360) {
    lines.push(`360: ${f.r360}.`);
  }
  if (f.safety) {
    lines.push(`Safety: ${f.safety}.`);
  }
  if (f.confirmStrategy) {
    lines.push(`Strategy: ${f.confirmStrategy}.`);
  }
  if (f.confirmNotes) {
    lines.push(`Notes: ${f.confirmNotes}.`);
  }
  if (f.resourceDetermination) {
    lines.push(`Resources: ${f.resourceDetermination}.`);
  }
  if (f.additional) {
    lines.push(`Additional: ${f.additional}.`);
  }

  if (lines[lines.length - 1] !== "") {
    lines.push("");
  }

  // Benchmarks
  if (tactical.benchmarks && tactical.benchmarks.length) {
    lines.push("Benchmarks:");
    tactical.benchmarks.forEach((b) => {
      const timeStr = formatTime(b.completedAt);
      const unitLabels = (b.units || [])
        .map((id) => {
          const u = tactical.units.find((u) => u.id === id);
          return u ? u.label : id;
        })
        .join(", ");
      lines.push(
        `- ${b.label}${
          unitLabels ? ` by ${unitLabels}` : ""
        }${timeStr ? ` at ${timeStr}` : ""}.`
      );
    });
  }

  const text = lines.join("\n");

  const outEl = document.getElementById("tacticalOutputBox");
  if (outEl) {
    outEl.textContent = text;
  }

  setFollowUpGeneratedText(text);
}

// ---------------------------------------------------------------------------
// Shared helpers (mirroring logic from app.js IRR builder)
// ---------------------------------------------------------------------------

function battalionDisplay(code) {
  const c = (code || "").trim();
  if (c === "BC1") return "Battalion 1";
  if (c === "BC2") return "Battalion 2";
  return "";
}

function buildIrrText(state) {
  const { incident, irr } = state;
  const battalionText = battalionDisplay(incident.battalion);

  const irrUnit = ALL_UNITS.find((u) => u.id === irr.irrUnitId);
  const unitLabel = irrUnit ? irrUnit.label : "";

  const size = irr.buildingSize ? String(irr.buildingSize).toLowerCase() : "";
  const height = irr.height ? `${irr.height} story` : "";

  // Occupancy
  let occ = "";
  if (irr.occupancy === "other" && irr.occupancyOther) {
    occ = irr.occupancyOther;
  } else if (irr.occupancy === "house") {
    occ = "house";
  } else if (irr.occupancy === "apartment") {
    occ = "apartment";
  } else if (irr.occupancy === "strip") {
    occ = "strip center";
  } else if (irr.occupancy === "commercial") {
    occ = "commercial building";
  }

  // Conditions
  const condMap = {
    nothing: "nothing showing",
    light: "light smoke",
    heavy: "heavy smoke",
    working: "working fire",
    defensive: "defensive conditions",
  };
  const cond = irr.conditions ? condMap[irr.conditions] || "" : "";

  // Problem location (sides + free text)
  const sides = Array.isArray(irr.problemSides) ? irr.problemSides : [];
  const sidesText = sides.map((s) => String(s).toLowerCase()).join(" / ");
  const locFree = (irr.problemLocationText || "").trim();

  let probPhrase = "";
  if (locFree && sides.length) {
    probPhrase = `${sidesText} ${locFree}`.trim();
  } else if (locFree && !sides.length) {
    probPhrase = locFree;
  } else if (!locFree && sides.length === 1) {
    probPhrase = `${sidesText} side`;
  } else if (!locFree && sides.length > 1) {
    probPhrase = `${sidesText} sides`;
  }

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

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function formatStatus(status) {
  if (!status) return "Available";
  if (status === "enroute") return "Enroute";
  if (status === "level1") return "Level 1";
  if (status === "onscene") return "On Scene";
  return "Available";
}

function nextStatus(status) {
  const order = ["available", "enroute", "level1", "onscene"];
  const idx = order.indexOf(status);
  if (idx === -1 || idx === order.length - 1) return order[0];
  return order[idx + 1];
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
