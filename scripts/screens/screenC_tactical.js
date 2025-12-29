// scripts/screens/screenC_tactical.js
// Screen C: Drawing canvas + bottom tabs + unit assignment workflow

import {
  getState,
  setScreen,
  setActiveTab,
  setActiveUnit,
  setUnitStatus,
  setUnitAssignment,
  clearUnitAssignment,
  setCommandField,
  setFollowUpField,
  setFollowUpGeneratedText,
  addBenchmark,
} from "../state.js";

import { initCanvas, clearCanvas } from "../canvas.js";

const TASKS = [
  "Primary Search",
  "Fire Attack",
  "Backup Line",
  "Water Supply",
  "Ventilation",
  "Forcible Entry",
  "RIT",
  "Exposure Protection",
  "Utilities",
  "Salvage / Overhaul",
];

const LOCATIONS = [
  "1st Floor",
  "2nd Floor",
  "3rd Floor",
  "4th Floor",
  "Basement",
  "Roof",
  "Alpha",
  "Bravo",
  "Charlie",
  "Delta",
  "Garage",
  "Backyard",
  "Other",
];

const OBJECTIVES = [
  "Search",
  "Fire Attack",
  "Life Safety",
  "Containment",
  "Ventilation",
  "Stop Extension",
  "Water Supply",
  "Overhaul",
];

export function renderScreenC(state) {
  const { tactical, incident } = state;

  const battalionArr = Array.isArray(incident.battalion) ? incident.battalion : [];
  const battalionText = battalionArr[0] || "BC";

  // Sort units: Level 1 first, then assigned, then enroute
  const units = (tactical.units || []).slice().sort((a, b) => {
    const rank = (s) => (s === "level1" ? 0 : s === "assigned" ? 1 : 2);
    return rank(a.status) - rank(b.status);
  });

  const activeTab = tactical.activeTab || "units";

  const activeUnit =
    tactical.activeUnitId
      ? units.find((u) => u.id === tactical.activeUnitId)
      : null;

  return `
    <section class="tactical-shell">
      <!-- BIG CANVAS -->
      <section class="canvas-card">
        <div class="canvas-topbar">
          <div class="canvas-title">
            <div class="canvas-title-main">Tactical Canvas</div>
            <div class="canvas-title-sub">
              Incident: <b>${escapeHtml(tactical.command.incidentName || tactical.command.icName || "—")}</b>
            </div>
          </div>

          <div class="canvas-actions">
            <button class="nav-btn" id="canvasClearBtn">Clear</button>
          </div>
        </div>

        <div class="canvas-wrap">
          <canvas id="tacticalCanvas" class="tactical-canvas"></canvas>
        </div>
      </section>

      <!-- TAB CONTENT -->
      <section class="tab-card">
        ${renderTabContent(activeTab, units, state)}
      </section>

      <!-- BOTTOM TABS -->
      <nav class="bottom-tabs">
        ${renderTabButton("units", "Units", activeTab)}
        ${renderTabButton("benchmarks", "Benchmarks", activeTab)}
        ${renderTabButton("followup", "Follow-Up", activeTab)}
        ${renderTabButton("command", "Command", activeTab)}
        ${renderTabButton("transfer", "Transfer", activeTab)}
      </nav>

      <!-- MODAL: UNIT ASSIGNMENT -->
      ${activeUnit ? renderAssignModal(activeUnit) : ""}

      <!-- FOOTER NAV -->
      <footer class="screen-footer">
        <button class="nav-btn" id="backToIrrBtn">◀ Back: IRR</button>
        <button class="nav-btn nav-btn-primary" id="printBtn">Print / PDF</button>
      </footer>
    </section>
  `;
}

function renderTabContent(tab, units, state) {
  if (tab === "units") return renderUnitsTab(units);
  if (tab === "benchmarks") return renderBenchmarksTab(state);
  if (tab === "followup") return renderFollowUpTab(state);
  if (tab === "command") return renderCommandTab(state);
  if (tab === "transfer") return renderTransferTab(state);
  return `<div class="helper-text">Unknown tab.</div>`;
}

function renderUnitsTab(units) {
  return `
    <h2 class="card-title">Units</h2>
    <p class="helper-text">
      Tap a unit to open assignment. Status:
      <b>Enroute</b> → <b>Level 1</b> → <b>Assigned</b>.
    </p>

    <div class="unit-board">
      ${units.map((u) => renderUnitCard(u)).join("")}
    </div>
  `;
}

function renderUnitCard(u) {
  const a = u.assignment || {};
  const hasAssignment = !!(a.task || (a.locations && a.locations.length) || (a.objectives && a.objectives.length) || a.notes);

  const assignmentLine = hasAssignment
    ? `
      <div class="unit-assign">
        <div><b>Task:</b> ${escapeHtml(a.task || "—")}</div>
        <div><b>Loc:</b> ${escapeHtml((a.locations || []).join(", ") || "—")}</div>
        <div><b>Obj:</b> ${escapeHtml((a.objectives || []).join(", ") || "—")}</div>
      </div>
    `
    : `<div class="unit-assign muted">No assignment yet.</div>`;

  return `
    <button class="unit-card status-${u.status}" data-unit-open="${u.id}">
      <div class="unit-card-top">
        <div class="unit-name">${escapeHtml(u.label)}</div>
        <div class="unit-status-pill">${formatStatus(u.status)}</div>
      </div>

      <div class="unit-status-row">
        <div class="status-bubbles">
          <span class="bubble ${u.status === "enroute" ? "on" : ""}">Enroute</span>
          <span class="bubble ${u.status === "level1" ? "on" : ""}">Level 1</span>
          <span class="bubble ${u.status === "assigned" ? "on" : ""}">Assigned</span>
        </div>
      </div>

      ${assignmentLine}
    </button>
  `;
}

function renderBenchmarksTab(state) {
  const completed = new Set((state.tactical.benchmarks || []).map((b) => b.id));

  return `
    <h2 class="card-title">Benchmarks</h2>
    <p class="helper-text">Tap to mark complete.</p>

    <div class="benchmark-row">
      ${renderBenchmarkButton("primarySearchAllClear","Primary Search All Clear",completed)}
      ${renderBenchmarkButton("fireUnderControl","Fire Under Control",completed)}
      ${renderBenchmarkButton("lossStopped","Loss Stopped",completed)}
      ${renderBenchmarkButton("parComplete","PAR Complete",completed)}
    </div>

    ${
      (state.tactical.benchmarks || []).length
        ? `
          <div style="margin-top:12px;">
            <label class="field-label">Completed</label>
            <ul class="summary-list">
              ${(state.tactical.benchmarks || []).map(b => `
                <li><b>${escapeHtml(b.label)}</b> @ ${escapeHtml(formatTime(b.completedAt))}</li>
              `).join("")}
            </ul>
          </div>
        `
        : `<div class="helper-text">No benchmarks yet.</div>`
    }
  `;
}

function renderFollowUpTab(state) {
  const f = state.tactical.followUp || {};
  return `
    <h2 class="card-title">Follow-Up</h2>

    <div class="followup-grid">
      <div class="field-group">
        <label class="field-label">360 Status</label>
        <select id="followup_r360" class="field-input">
          <option value=""></option>
          ${["Not completed","In progress","Completed"].map(v => `
            <option value="${v}" ${f.r360 === v ? "selected" : ""}>${v}</option>
          `).join("")}
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">Safety</label>
        <input type="text" id="followup_safety" class="field-input"
          placeholder="Hazards, accountability, collapse zones..."
          value="${escapeHtml(f.safety || "")}" />
      </div>

      <div class="field-group">
        <label class="field-label">Strategy Confirmation</label>
        <input type="text" id="followup_confirmStrategy" class="field-input"
          placeholder="Remaining offensive/defensive..."
          value="${escapeHtml(f.confirmStrategy || "")}" />
      </div>

      <div class="field-group">
        <label class="field-label">Strategy Notes</label>
        <textarea id="followup_confirmNotes" class="field-input" rows="2"
          placeholder="CAN-level notes...">${escapeHtml(f.confirmNotes || "")}</textarea>
      </div>

      <div class="field-group">
        <label class="field-label">Resource Determination</label>
        <textarea id="followup_resourceDetermination" class="field-input" rows="2"
          placeholder="More engines/trucks/medics...">${escapeHtml(f.resourceDetermination || "")}</textarea>
      </div>

      <div class="field-group">
        <label class="field-label">Additional Info</label>
        <textarea id="followup_additional" class="field-input" rows="2"
          placeholder="Other notes...">${escapeHtml(f.additional || "")}</textarea>
      </div>
    </div>

    <div style="margin-top:12px;">
      <label class="field-label">Generated Tactical Summary</label>
      <pre class="output" id="tacticalOutputBox">${escapeHtml(f.generatedText || "")}</pre>
    </div>
  `;
}

function renderCommandTab(state) {
  const cmd = state.tactical.command || {};
  const units = state.tactical.units || [];
  return `
    <h2 class="card-title">Command</h2>
    <p class="helper-text">
      Incident Name auto-fills from IRR Command Name (Screen B).
    </p>

    <div class="followup-grid">
      <div class="field-group">
        <label class="field-label">Incident Name</label>
        <input id="cmd_incidentName" class="field-input" type="text"
          value="${escapeHtml(cmd.incidentName || "")}"
          placeholder="Main Street Command" />
      </div>

      <div class="field-group">
        <label class="field-label">IC Unit</label>
        <select id="cmd_icUnit" class="field-input">
          <option value="">-- Select IC Unit --</option>
          ${units.map(u => `
            <option value="${u.id}" ${u.id === cmd.currentIcUnitId ? "selected" : ""}>${escapeHtml(u.label)}</option>
          `).join("")}
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">IC Name / Command Name</label>
        <input id="cmd_icName" class="field-input" type="text"
          value="${escapeHtml(cmd.icName || "")}"
          placeholder="Main Street Command" />
      </div>
    </div>
  `;
}

function renderTransferTab(state) {
  const cmd = state.tactical.command || {};
  return `
    <h2 class="card-title">Command Transfer</h2>
    <p class="helper-text">
      Use this as your note pad for transfer + CAN.
    </p>

    <div class="followup-grid">
      <div class="field-group">
        <label class="field-label">Transfer To</label>
        <select id="xfer_to" class="field-input">
          <option value=""></option>
          ${["BC1","BC2"].map(v => `
            <option value="${v}" ${cmd.transferTo === v ? "selected" : ""}>${v}</option>
          `).join("")}
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">CAN - Conditions</label>
        <textarea id="xfer_canC" class="field-input" rows="2"
          placeholder="Conditions...">${escapeHtml(cmd.canConditions || "")}</textarea>
      </div>

      <div class="field-group">
        <label class="field-label">CAN - Actions</label>
        <textarea id="xfer_canA" class="field-input" rows="2"
          placeholder="Actions...">${escapeHtml(cmd.canActions || "")}</textarea>
      </div>

      <div class="field-group">
        <label class="field-label">CAN - Needs</label>
        <textarea id="xfer_canN" class="field-input" rows="2"
          placeholder="Needs...">${escapeHtml(cmd.canNeeds || "")}</textarea>
      </div>
    </div>

    <div style="margin-top:12px;" class="helper-text">
      Tip: After transfer, update “IC Unit” and “IC Name” in the Command tab.
    </div>
  `;
}

function renderTabButton(key, label, activeTab) {
  return `
    <button class="bottom-tab ${activeTab === key ? "active" : ""}" data-tab="${key}">
      ${label}
    </button>
  `;
}

function renderAssignModal(unit) {
  const a = unit.assignment || { task: "", locations: [], objectives: [], notes: "" };

  return `
    <div class="modal-backdrop" id="assignBackdrop">
      <div class="modal">
        <div class="modal-header">
          <div>
            <div class="modal-title">Assign Unit</div>
            <div class="modal-sub">${escapeHtml(unit.label)} — ${formatStatus(unit.status)}</div>
          </div>
          <button class="modal-x" id="assignCloseBtn">✕</button>
        </div>

        <div class="modal-body">
          <div class="field-group">
            <label class="field-label">Status</label>
            <div class="grid small">
              ${["enroute","level1","assigned"].map(s => `
                <button type="button"
                  class="choice small assign-status ${unit.status === s ? "selected" : ""}"
                  data-assign-status="${s}">
                  ${formatStatus(s)}
                </button>
              `).join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Task</label>
            <div class="grid">
              ${TASKS.map(t => `
                <button type="button"
                  class="choice assign-task ${a.task === t ? "selected" : ""}"
                  data-assign-task="${escapeAttr(t)}">${escapeHtml(t)}</button>
              `).join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Locations (multi)</label>
            <div class="grid">
              ${LOCATIONS.map(l => `
                <button type="button"
                  class="choice assign-loc ${Array.isArray(a.locations) && a.locations.includes(l) ? "selected" : ""}"
                  data-assign-loc="${escapeAttr(l)}">${escapeHtml(l)}</button>
              `).join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Objectives (multi)</label>
            <div class="grid">
              ${OBJECTIVES.map(o => `
                <button type="button"
                  class="choice assign-obj ${Array.isArray(a.objectives) && a.objectives.includes(o) ? "selected" : ""}"
                  data-assign-obj="${escapeAttr(o)}">${escapeHtml(o)}</button>
              `).join("")}
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Notes</label>
            <textarea id="assign_notes" class="field-input" rows="2"
              placeholder="Short notes...">${escapeHtml(a.notes || "")}</textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="nav-btn" id="assignClearBtn">Clear Assignment</button>
          <button class="nav-btn nav-btn-primary" id="assignSaveBtn">Save</button>
        </div>
      </div>
    </div>
  `;
}

export function attachHandlersC() {
  // Canvas init AFTER DOM exists
  initCanvas("tacticalCanvas");

  // Back / Print
  const backBtn = document.getElementById("backToIrrBtn");
  if (backBtn) backBtn.addEventListener("click", () => setScreen("irr"));

  const printBtn = document.getElementById("printBtn");
  if (printBtn) printBtn.addEventListener("click", () => window.print());

  // Canvas clear
  const canvasClearBtn = document.getElementById("canvasClearBtn");
  if (canvasClearBtn) canvasClearBtn.addEventListener("click", () => clearCanvas("tacticalCanvas"));

  // Bottom tabs
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab) setActiveTab(tab);
    });
  });

  // Open unit modal
  document.querySelectorAll("[data-unit-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.unitOpen;
      if (id) setActiveUnit(id);
    });
  });

  // If modal exists, wire it
  const backdrop = document.getElementById("assignBackdrop");
  if (backdrop) {
    const close = () => setActiveUnit("");

    const closeBtn = document.getElementById("assignCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", close);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });

    // Status select
    document.querySelectorAll("[data-assign-status]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const unitId = getState().tactical.activeUnitId;
        const s = btn.dataset.assignStatus;
        if (unitId && s) setUnitStatus(unitId, s);
      });
    });

    // Task select
    document.querySelectorAll("[data-assign-task]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const unitId = getState().tactical.activeUnitId;
        const t = btn.dataset.assignTask;
        if (unitId) setUnitAssignment(unitId, { task: t || "" });
      });
    });

    // Location toggle
    document.querySelectorAll("[data-assign-loc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = getState();
        const unitId = s.tactical.activeUnitId;
        if (!unitId) return;

        const unit = (s.tactical.units || []).find((u) => u.id === unitId);
        const loc = btn.dataset.assignLoc;
        if (!unit || !loc) return;

        const cur = Array.isArray(unit.assignment?.locations) ? unit.assignment.locations : [];
        const next = cur.includes(loc) ? cur.filter((x) => x !== loc) : [...cur, loc];

        setUnitAssignment(unitId, { locations: next });
      });
    });

    // Objective toggle
    document.querySelectorAll("[data-assign-obj]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = getState();
        const unitId = s.tactical.activeUnitId;
        if (!unitId) return;

        const unit = (s.tactical.units || []).find((u) => u.id === unitId);
        const obj = btn.dataset.assignObj;
        if (!unit || !obj) return;

        const cur = Array.isArray(unit.assignment?.objectives) ? unit.assignment.objectives : [];
        const next = cur.includes(obj) ? cur.filter((x) => x !== obj) : [...cur, obj];

        setUnitAssignment(unitId, { objectives: next });
      });
    });

    // Notes
    const notes = document.getElementById("assign_notes");
    if (notes) {
      notes.addEventListener("input", () => {
        const unitId = getState().tactical.activeUnitId;
        if (unitId) setUnitAssignment(unitId, { notes: notes.value });
      });
    }

    // Clear assignment
    const clearBtn = document.getElementById("assignClearBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        const unitId = getState().tactical.activeUnitId;
        if (!unitId) return;
        clearUnitAssignment(unitId);
        updateTacticalSummary();
      });
    }

    // Save assignment
    const saveBtn = document.getElementById("assignSaveBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const s = getState();
        const unitId = s.tactical.activeUnitId;
        if (!unitId) return;

        // If assignment given, set status to Assigned (unless user forced otherwise)
        const unit = (s.tactical.units || []).find((u) => u.id === unitId);
        const a = unit?.assignment || {};
        const hasAssign = !!(a.task || (a.locations && a.locations.length) || (a.objectives && a.objectives.length) || a.notes);

        if (hasAssign && unit?.status !== "enroute") {
          setUnitStatus(unitId, "assigned");
        }
        updateTacticalSummary();
        setActiveUnit("");
      });
    }
  }

  // Benchmarks tab buttons
  document.querySelectorAll(".benchmark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.benchmarkId;
      const label = btn.dataset.benchmarkLabel;
      if (!id || !label) return;

      const s = getState();
      const already = (s.tactical.benchmarks || []).some((b) => b.id === id);
      if (!already) addBenchmark(id, label, []);
      updateTacticalSummary();
    });
  });

  // Follow-up inputs
  const followUpFields = ["r360","safety","confirmStrategy","confirmNotes","resourceDetermination","additional"];
  followUpFields.forEach((field) => {
    const el = document.getElementById(`followup_${field}`);
    if (!el) return;
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      setFollowUpField(field, el.value);
      updateTacticalSummary();
    });
  });

  // Command inputs
  const incidentName = document.getElementById("cmd_incidentName");
  if (incidentName) incidentName.addEventListener("input", () => setCommandField("incidentName", incidentName.value));

  const icUnit = document.getElementById("cmd_icUnit");
  if (icUnit) icUnit.addEventListener("change", () => setCommandField("currentIcUnitId", icUnit.value));

  const icName = document.getElementById("cmd_icName");
  if (icName) icName.addEventListener("input", () => setCommandField("icName", icName.value));

  // Transfer inputs
  const xferTo = document.getElementById("xfer_to");
  if (xferTo) xferTo.addEventListener("change", () => setCommandField("transferTo", xferTo.value));

  const canC = document.getElementById("xfer_canC");
  if (canC) canC.addEventListener("input", () => setCommandField("canConditions", canC.value));

  const canA = document.getElementById("xfer_canA");
  if (canA) canA.addEventListener("input", () => setCommandField("canActions", canA.value));

  const canN = document.getElementById("xfer_canN");
  if (canN) canN.addEventListener("input", () => setCommandField("canNeeds", canN.value));

  // Build summary once
  updateTacticalSummary();
}

function updateTacticalSummary() {
  const s = getState();
  const { tactical, incident } = s;

  const battalionArr = Array.isArray(incident.battalion) ? incident.battalion : [];
  const battalionText = battalionArr[0] || "BC";

  const lines = [];
  lines.push(`${battalionText}: tactical update.`);
  lines.push("");

  // Incident name / command
  const cmdName = (tactical.command.icName || tactical.command.incidentName || "").trim();
  if (cmdName) {
    lines.push(`Incident: ${cmdName}.`);
    lines.push("");
  }

  // Unit assignments summary
  const assigned = (tactical.units || []).filter((u) => u.status === "assigned");
  if (assigned.length) {
    lines.push("Assignments:");
    assigned.forEach((u) => {
      const a = u.assignment || {};
      const task = a.task ? a.task : "Task";
      const loc = (a.locations || []).length ? ` on ${a.locations.join(", ")}` : "";
      const obj = (a.objectives || []).length ? ` for ${a.objectives.join(", ")}` : "";
      lines.push(`- ${u.label}: ${task}${loc}${obj}.`);
    });
    lines.push("");
  }

  // Transfer CAN (if present)
  const c = tactical.command || {};
  if (c.transferTo || c.canConditions || c.canActions || c.canNeeds) {
    lines.push("Transfer / CAN:");
    if (c.transferTo) lines.push(`- Transfer to: ${c.transferTo}.`);
    if (c.canConditions) lines.push(`- C: ${c.canConditions}.`);
    if (c.canActions) lines.push(`- A: ${c.canActions}.`);
    if (c.canNeeds) lines.push(`- N: ${c.canNeeds}.`);
    lines.push("");
  }

  // Follow-up
  const f = tactical.followUp || {};
  if (f.r360) lines.push(`360: ${f.r360}.`);
  if (f.safety) lines.push(`Safety: ${f.safety}.`);
  if (f.confirmStrategy) lines.push(`Strategy: ${f.confirmStrategy}.`);
  if (f.confirmNotes) lines.push(`Notes: ${f.confirmNotes}.`);
  if (f.resourceDetermination) lines.push(`Resources: ${f.resourceDetermination}.`);
  if (f.additional) lines.push(`Additional: ${f.additional}.`);
  if (lines[lines.length - 1] !== "") lines.push("");

  // Benchmarks
  if ((tactical.benchmarks || []).length) {
    lines.push("Benchmarks:");
    tactical.benchmarks.forEach((b) => {
      lines.push(`- ${b.label} at ${formatTime(b.completedAt)}.`);
    });
  }

  const text = lines.join("\n").trim();

  const outEl = document.getElementById("tacticalOutputBox");
  if (outEl) outEl.textContent = text;

  setFollowUpGeneratedText(text);
}

function renderBenchmarkButton(id, label, completedIds) {
  const isCompleted = completedIds.has(id);
  return `
    <button type="button"
      class="benchmark-btn ${isCompleted ? "completed" : ""}"
      data-benchmark-id="${id}"
      data-benchmark-label="${label}">
      ${label}
    </button>
  `;
}

function formatStatus(status) {
  if (!status) return "Enroute";
  if (status === "enroute") return "Enroute";
  if (status === "level1") return "Level 1";
  if (status === "assigned") return "Assigned";
  return "Enroute";
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/* ---------- tiny safe escaping helpers ---------- */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) { return escapeHtml(s); }
