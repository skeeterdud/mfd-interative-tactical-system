// tacticalView.js
// Tactical Worksheet view for the MFD Interactive Tactical System

import { setScreen, ALL_UNITS } from "./state.js";

// Render function used by app.js
export function renderTacticalView(state) {
  const { incident, irr } = state;
  const { callType, battalion, selectedUnitIds } = incident;

  const respondingUnits = (Array.isArray(selectedUnitIds) ? selectedUnitIds : [])
    .map((id) => ALL_UNITS.find((u) => u.id === id))
    .filter(Boolean);

  const battalionDisplayText = battalionDisplay(battalion) || battalion || "Not set";
  const irrText = buildIrrText(state);

  return `
    <section class="screen screen-tactical">
      <h1 class="screen-title">Tactical Worksheet</h1>
      <p class="screen-desc">
        Use this view to capture tactical priorities, division/group assignments,
        and generate a quick tactical summary based on the IRR.
      </p>

      <!-- INCIDENT SNAPSHOT -->
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
            <label class="field-label">Current IRR</label>
            <pre class="output small" id="tacticalIrrPreview">${irrText}</pre>
          </div>
        </div>
      </section>

      <!-- TACTICAL PRIORITIES -->
      <section class="card">
        <h2 class="card-title">Tactical Priorities</h2>
        <p class="helper-text">
          Track where you are on the big three: Fire Control, Life Safety, and Incident Stabilization.
        </p>
        <div class="tactical-priorities-grid">
          ${renderPriorityRow("Fire Control")}
          ${renderPriorityRow("Life Safety")}
          ${renderPriorityRow("Incident Stabilization")}
          ${renderPriorityRow("Property Conservation")}
        </div>
      </section>

      <!-- DIVISIONS / GROUPS -->
      <section class="card">
        <h2 class="card-title">Divisions / Groups Assignments</h2>
        <p class="helper-text">
          Free-text assignments for quick documentation. You can type unit designators or task descriptions.
        </p>
        <div class="divisions-grid">
          ${renderDivisionInput("Alpha")}
          ${renderDivisionInput("Bravo")}
          ${renderDivisionInput("Charlie")}
          ${renderDivisionInput("Delta")}
          ${renderDivisionInput("Roof")}
          ${renderDivisionInput("Interior")}
          ${renderDivisionInput("RIT")}
          ${renderDivisionInput("Vent")}
        </div>
      </section>

      <!-- GENERATED TACTICAL SUMMARY -->
      <section class="card">
        <h2 class="card-title">Generated Tactical Summary</h2>
        <p class="helper-text">
          This rolls together the IRR, current tactical priorities, and division/group assignments
          into a quick radio-ready update or whiteboard summary.
        </p>
        <pre class="output" id="tacticalOutputBox"></pre>
      </section>

      <footer class="screen-footer">
        <button class="nav-btn nav-btn-secondary" id="backToIrrBtn">
          ◀ Back: IRR
        </button>
      </footer>
    </section>
  `;
}

// Attach handlers for the tactical view
export function attachTacticalHandlers(state) {
  // Back button -> IRR screen
  const backBtn = document.getElementById("backToIrrBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => setScreen("irr"));
  }

  // Priority radio buttons: rebuild tactical summary on change
  document.querySelectorAll(".tactical-priority-radio").forEach((input) => {
    input.addEventListener("change", () => {
      updateTacticalOutput(state);
    });
  });

  // Division / group text inputs
  document.querySelectorAll(".division-input").forEach((input) => {
    input.addEventListener("input", () => {
      updateTacticalOutput(state);
    });
  });

  // Initial build
  updateTacticalOutput(state);
}

// --- INTERNAL RENDER HELPERS -----------------------------------------------

function renderPriorityRow(label) {
  const idBase = labelToId(label);
  return `
    <div class="tactical-priority-row">
      <div class="priority-label">${label}</div>
      <div class="priority-options">
        ${renderPriorityOption(idBase, "Not Started")}
        ${renderPriorityOption(idBase, "In Progress")}
        ${renderPriorityOption(idBase, "Completed")}
      </div>
    </div>
  `;
}

function renderPriorityOption(idBase, status) {
  const value = statusToValue(status);
  const inputId = `${idBase}_${value}`;
  return `
    <label class="priority-pill">
      <input 
        type="radio" 
        id="${inputId}"
        name="${idBase}" 
        value="${value}"
        class="tactical-priority-radio"
      />
      <span>${status}</span>
    </label>
  `;
}

function renderDivisionInput(name) {
  const id = `division_${labelToId(name)}`;
  return `
    <div class="division-cell">
      <label class="field-label">${name}</label>
      <input 
        type="text" 
        id="${id}"
        class="field-input division-input"
        placeholder="Unit / task (e.g., Eng 1 fire attack)"
      />
    </div>
  `;
}

// --- TACTICAL SUMMARY BUILDER ----------------------------------------------

function updateTacticalOutput(state) {
  const { incident } = state;
  const irrText = buildIrrText(state);
  const battalionText = battalionDisplay(incident.battalion) || incident.battalion || "";

  // Read tactical priorities
  const priorities = [
    "Fire Control",
    "Life Safety",
    "Incident Stabilization",
    "Property Conservation",
  ].map((label) => {
    const idBase = labelToId(label);
    const selected = document.querySelector(`input[name="${idBase}"]:checked`);
    return {
      label,
      status: selected ? valueToStatus(selected.value) : "Not stated",
    };
  });

  // Read divisions / groups
  const divisions = [
    "Alpha",
    "Bravo",
    "Charlie",
    "Delta",
    "Roof",
    "Interior",
    "RIT",
    "Vent",
  ].map((name) => {
    const id = `division_${labelToId(name)}`;
    const el = document.getElementById(id);
    return {
      name,
      assignment: el ? el.value.trim() : "",
    };
  });

  const priorityLines = priorities
    .filter((p) => p.status !== "Not stated")
    .map((p) => `${p.label} is ${p.status.toLowerCase()}.`);

  const divisionLines = divisions
    .filter((d) => d.assignment)
    .map((d) => `${d.name} Division: ${d.assignment}.`);

  const lines = [];

  if (battalionText) {
    lines.push(`${battalionText}: tactical update as follows.`);
    lines.push("");
  }

  if (irrText) {
    lines.push("IRR (for reference):");
    lines.push(irrText);
    lines.push("");
  }

  if (priorityLines.length) {
    lines.push("Tactical priorities:");
    lines.push(...priorityLines);
    lines.push("");
  }

  if (divisionLines.length) {
    lines.push("Divisions / groups assigned:");
    lines.push(...divisionLines);
    lines.push("");
  }

  if (!priorityLines.length && !divisionLines.length) {
    lines.push("No tactical priorities or division/group assignments documented yet.");
  }

  const outEl = document.getElementById("tacticalOutputBox");
  if (outEl) {
    outEl.textContent = lines.join("\n");
  }
}

// --- SHARED HELPERS (mirror patterns from app.js) --------------------------

function battalionDisplay(code) {
  const c = (code || "").trim();
  if (c === "BC1") return "Battalion 1";
  if (c === "BC2") return "Battalion 2";
  return "";
}

// Reuse the same IRR builder logic so Tactical view always matches IRR.
// If you prefer, you can import this from app.js instead of duplicating.
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

  const strategyLower = (irr.strategy || "Offensive").toLowerCase();
  const cmdText = normalizeCommandName(irr.commandText || "", unitLabel);

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

// --- SMALL UTILS -----------------------------------------------------------

function labelToId(label) {
  return String(label).toLowerCase().replace(/\s+/g, "_");
}

function statusToValue(status) {
  return String(status).toLowerCase().replace(/\s+/g, "_");
}

function valueToStatus(value) {
  const map = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
  };
  return map[value] || value;
}
