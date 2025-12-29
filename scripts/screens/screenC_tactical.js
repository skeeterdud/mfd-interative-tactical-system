// scripts/screens/screenC_tactical.js
// Screen C: Canvas workspace + bottom tabs + unit assignment modal

import {
  getState,
  setScreen,
  setUnitStatus,
  setUnitAssignment,
  clearUnitAssignment,
  setCommand,
  addBenchmark,
  setTacticalNotes,
} from "../state.js";

import { initCanvas, setCanvasTool, clearCanvas, snapshotToState } from "../canvas.js";

const TABS = [
  { id: "units", label: "Units" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "command", label: "Command" },
  { id: "notes", label: "Notes" },
  { id: "print", label: "Print" },
];

// Assignment options (easy to tweak later)
const TASKS = [
  "Investigate",
  "Water Supply",
  "Attack Line",
  "Search",
  "Ventilation",
  "RIT",
  "Exposure",
  "Utilities",
  "Salvage",
  "Defensive Ops",
];

const LOCATIONS = [
  "Alpha",
  "Bravo",
  "Charlie",
  "Delta",
  "1st Floor",
  "2nd Floor",
  "3rd Floor",
  "4th Floor",
  "Roof",
  "Attic",
  "Basement",
  "Interior",
  "Exterior",
  "Rear",
  "Garage",
];

const OBJECTIVES = [
  "Fire Attack",
  "Primary Search",
  "Secondary Search",
  "Vent",
  "RIT",
  "Exposure Protection",
  "Water Supply",
  "Overhaul",
];

export function renderScreenC(state) {
  const { incident, tactical } = state;

  const battalionArr = Array.isArray(incident.battalion) ? incident.battalion : [];
  const battalionText = battalionDisplay(battalionArr[0]) || battalionArr[0] || "Command";

  const activeTab = tactical._uiTab || "units";

  const units = Array.isArray(tactical.units) ? tactical.units : [];
  const level1Units = units.filter((u) => u.status === "level1");

  return `
    <section class="tactical-shell">
      <!-- TOP STRIP: Level 1 pinned -->
      <div class="level1-strip">
        <div class="level1-strip-title">LEVEL 1</div>
        <div class="level1-strip-row">
          ${
            level1Units.length
              ? level1Units
                  .map((u) => unitChipHtml(u, true))
                  .join("")
              : `<div class="level1-strip-empty">No Level 1 units</div>`
          }
        </div>
      </div>

      <!-- CANVAS WORKSPACE -->
      <div class="canvas-wrap card">
        <div class="canvas-toolbar">
          <div class="canvas-title">${escapeHtml(battalionText)} – Tactical Canvas</div>

          <div class="canvas-tools">
            <button class="choice small canvas-tool" data-tool="pen">Pen</button>
            <button class="choice small canvas-tool" data-tool="eraser">Eraser</button>
            <button class="choice small canvas-clear" id="canvasClearBtn">Clear</button>
          </div>
        </div>

        <div class="canvas-stage">
          <canvas id="tacticalCanvas"></canvas>
        </div>
      </div>

      <!-- BOTTOM PANEL -->
      <div class="bottom-panel card">
        <div class="bottom-panel-header">
          <div class="bottom-panel-title">${tabLabel(activeTab)}</div>
          <div class="bottom-panel-actions">
            <button class="nav-btn" id="backToIrrBtn">◀ Back: IRR</button>
          </div>
        </div>

        <div class="bottom-panel-content">
          ${renderTabContent(activeTab, state)}
        </div>

        <div class="bottom-tabs">
          ${TABS.map((t) => `
            <button class="bottom-tab ${activeTab === t.id ? "active" : ""}" data-tab="${t.id}">
              ${t.label}
            </button>
          `).join("")}
        </div>
      </div>

      <!-- MODAL ROOT -->
      <div id="modalRoot"></div>
    </section>
  `;
}

export function attachHandlersC(state) {
  // Back
  const backBtn = document.getElementById("backToIrrBtn");
  if (backBtn) backBtn.addEventListener("click", () => setScreen("irr"));

  // Init canvas
  const canvas = document.getElementById("tacticalCanvas");
  if (canvas) initCanvas(canvas);

  // Canvas tools
  document.querySelectorAll(".canvas-tool").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.tool;
      setCanvasTool(t);
      // button highlight
      document.querySelectorAll(".canvas-tool").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  // default select pen button
  const penBtn = document.querySelector('.canvas-tool[data-tool="pen"]');
  if (penBtn) penBtn.classList.add("selected");

  const clearBtn = document.getElementById("canvasClearBtn");
  if (clearBtn) clearBtn.addEventListener("click", () => clearCanvas());

  // Tabs
  document.querySelectorAll(".bottom-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (!tab) return;
      const cur = getState();
      cur.tactical._uiTab = tab;
      // force re-render through emit by nudging notes (safe) OR just set notes to same
      // easiest: update notes to same value triggers emit
      setTacticalNotes(cur.tactical.notes || "");
    });
  });

  // Units: open modal
  document.querySelectorAll("[data-open-unit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const unitId = btn.dataset.openUnit;
      if (!unitId) return;
      openUnitModal(unitId);
    });
  });

  // Benchmarks
  document.querySelectorAll(".benchmark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.benchmarkId;
      const label = btn.dataset.benchmarkLabel;
      if (!id || !label) return;
      addBenchmark(id, label, []);
      snapshotToState(); // keep print up to date
    });
  });

  // Command
  const icUnit = document.getElementById("icUnitSelect");
  const icName = document.getElementById("icNameInput");
  const applyCommand = () => {
    const u = icUnit ? icUnit.value : "";
    const n = icName ? icName.value : "";
    setCommand(u, n);
  };
  if (icUnit) icUnit.addEventListener("change", applyCommand);
  if (icName) icName.addEventListener("input", applyCommand);

  // Notes
  const notes = document.getElementById("tacticalNotes");
  if (notes) {
    notes.addEventListener("input", () => setTacticalNotes(notes.value));
  }

  // Print
  const printBtn = document.getElementById("printNowBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      snapshotToState(); // capture canvas
      window.print();
    });
  }
}

// ---------------- Tabs ----------------

function tabLabel(id) {
  const t = TABS.find((x) => x.id === id);
  return t ? t.label : "Units";
}

function renderTabContent(tab, state) {
  if (tab === "units") return renderUnitsTab(state);
  if (tab === "benchmarks") return renderBenchmarksTab(state);
  if (tab === "command") return renderCommandTab(state);
  if (tab === "notes") return renderNotesTab(state);
  if (tab === "print") return renderPrintTab(state);
  return renderUnitsTab(state);
}

function renderUnitsTab(state) {
  const units = Array.isArray(state.tactical.units) ? state.tactical.units : [];

  const enroute = units.filter((u) => u.status === "enroute");
  const level1 = units.filter((u) => u.status === "level1");
  const onscene = units.filter((u) => u.status === "onscene");

  return `
    <div class="lanes">
      ${laneHtml("Enroute", "enroute", enroute)}
      ${laneHtml("Level 1", "level1", level1)}
      ${laneHtml("On Scene", "onscene", onscene)}
    </div>

    <div class="helper-text" style="margin-top:10px;">
      Tap a unit to set status and build an assignment: Task → Locations (multi) → Objectives (multi).
    </div>
  `;
}

function laneHtml(title, statusKey, units) {
  return `
    <div class="lane">
      <div class="lane-title">${title}</div>
      <div class="lane-list">
        ${
          units.length
            ? units.map((u) => unitRowHtml(u)).join("")
            : `<div class="lane-empty">No units</div>`
        }
      </div>
    </div>
  `;
}

function unitRowHtml(u) {
  const a = u.assignment || {};
  const summary = assignmentSummary(a);

  return `
    <button class="unit-row" data-open-unit="${escapeAttr(u.id)}">
      <div class="unit-row-left">
        <div class="unit-row-label">${escapeHtml(u.label)}</div>
        <div class="unit-row-status">${formatStatus(u.status)}</div>
      </div>
      <div class="unit-row-assign ${summary ? "" : "is-empty"}">
        ${summary ? escapeHtml(summary) : "Assignment…"}
      </div>
    </button>
  `;
}

function unitChipHtml(u, compact) {
  const a = u.assignment || {};
  const summary = assignmentSummary(a);
  return `
    <button class="unit-chip ${compact ? "compact" : ""}" data-open-unit="${escapeAttr(u.id)}">
      <div class="unit-chip-label">${escapeHtml(u.label)}</div>
      ${summary ? `<div class="unit-chip-sub">${escapeHtml(summary)}</div>` : ""}
    </button>
  `;
}

function renderBenchmarksTab(state) {
  const completed = new Set((state.tactical.benchmarks || []).map((b) => b.id));
  const list = (state.tactical.benchmarks || []).slice();

  return `
    <div class="benchmark-row">
      ${renderBenchmarkButton("primarySearchAllClear","Primary Search All Clear",completed)}
      ${renderBenchmarkButton("fireUnderControl","Fire Under Control",completed)}
      ${renderBenchmarkButton("lossStopped","Loss Stopped",completed)}
      ${renderBenchmarkButton("parComplete","PAR Complete",completed)}
    </div>

    ${
      list.length
        ? `
          <div style="margin-top:12px;">
            <div class="field-label">Completed</div>
            <ul class="summary-list">
              ${list
                .map((b) => `<li><strong>${escapeHtml(b.label)}</strong> @ ${escapeHtml(formatTime(b.completedAt))}</li>`)
                .join("")}
            </ul>
          </div>
        `
        : `<div class="helper-text" style="margin-top:10px;">No benchmarks marked yet.</div>`
    }
  `;
}

function renderCommandTab(state) {
  const units = Array.isArray(state.tactical.units) ? state.tactical.units : [];
  const cmd = state.tactical.command || { currentIcUnitId: "", icName: "" };

  return `
    <div class="followup-grid">
      <div class="field-group">
        <label class="field-label">IC Unit</label>
        <select id="icUnitSelect" class="field-input">
          <option value="">-- Select IC Unit --</option>
          ${units.map((u) => `
            <option value="${escapeAttr(u.id)}" ${u.id === cmd.currentIcUnitId ? "selected" : ""}>
              ${escapeHtml(u.label)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">Command Name</label>
        <input id="icNameInput" class="field-input" type="text"
          placeholder="e.g., Main Street Command"
          value="${escapeHtml(cmd.icName || "")}"
        />
      </div>
    </div>
  `;
}

function renderNotesTab(state) {
  return `
    <div class="field-group">
      <label class="field-label">Tactical Notes</label>
      <textarea id="tacticalNotes" class="field-input" rows="6"
        placeholder="Divisions/groups, hazards, CAN notes, priorities, etc."
      >${escapeHtml(state.tactical.notes || "")}</textarea>
    </div>
    <div class="helper-text">Notes are saved in state and will print with the worksheet.</div>
  `;
}

function renderPrintTab(state) {
  const incident = state.incident || {};
  const battalionArr = Array.isArray(incident.battalion) ? incident.battalion : [];
  const battalionText = battalionDisplay(battalionArr[0]) || battalionArr[0] || "Command";

  const units = Array.isArray(state.tactical.units) ? state.tactical.units : [];
  const level1 = units.filter((u) => u.status === "level1");
  const onscene = units.filter((u) => u.status === "onscene");
  const enroute = units.filter((u) => u.status === "enroute");

  return `
    <div class="helper-text">
      Print/PDF will include the canvas plus a quick snapshot of command, unit status, and notes.
    </div>

    <div class="print-card">
      <div class="print-title">${escapeHtml(battalionText)} – Tactical Print Snapshot</div>

      <div class="print-grid">
        <div class="print-block">
          <div class="field-label">Command</div>
          <div>${escapeHtml(state.tactical.command.icName || "Command")}</div>
        </div>

        <div class="print-block">
          <div class="field-label">IC Unit</div>
          <div>${escapeHtml(state.tactical.command.currentIcUnitId || "—")}</div>
        </div>

        <div class="print-block">
          <div class="field-label">Level 1 Units</div>
          <div>${level1.length ? level1.map((u) => escapeHtml(u.label)).join(", ") : "None"}</div>
        </div>

        <div class="print-block">
          <div class="field-label">On Scene Units</div>
          <div>${onscene.length ? onscene.map((u) => escapeHtml(u.label)).join(", ") : "None"}</div>
        </div>

        <div class="print-block">
          <div class="field-label">Enroute Units</div>
          <div>${enroute.length ? enroute.map((u) => escapeHtml(u.label)).join(", ") : "None"}</div>
        </div>
      </div>

      <div class="print-block" style="margin-top:12px;">
        <div class="field-label">Notes</div>
        <div style="white-space:pre-wrap;">${escapeHtml(state.tactical.notes || "")}</div>
      </div>
    </div>

    <button class="nav-btn nav-btn-primary" id="printNowBtn" style="margin-top:10px;">
      Print / PDF
    </button>
  `;
}

// ---------------- Modal: Assignment Builder ----------------

function openUnitModal(unitId) {
  const state = getState();
  const unit = (state.tactical.units || []).find((u) => u.id === unitId);
  if (!unit) return;

  const modalRoot = document.getElementById("modalRoot");
  if (!modalRoot) return;

  const a = unit.assignment || { task: "", locations: [], objectives: [], notes: "" };

  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-modal-close="1">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div>
            <div class="modal-title">${escapeHtml(unit.label)}</div>
            <div class="modal-sub">Set status + assignment</div>
          </div>
          <button class="modal-x" data-modal-close="1">✕</button>
        </div>

        <div class="modal-body">
          <div class="modal-section">
            <div class="field-label">Status</div>
            <div class="status-row">
              ${statusBtnHtml("enroute", unit.status)}
              ${statusBtnHtml("level1", unit.status)}
              ${statusBtnHtml("onscene", unit.status)}
            </div>
          </div>

          <div class="modal-section">
            <div class="field-label">Task (single)</div>
            <div class="grid">
              ${TASKS.map((t) => `
                <button type="button" class="choice ${a.task === t ? "selected" : ""}"
                  data-assign-task="${escapeAttr(t)}">
                  ${escapeHtml(t)}
                </button>
              `).join("")}
            </div>
          </div>

          <div class="modal-section">
            <div class="field-label">Locations (multi)</div>
            <div class="grid small">
              ${LOCATIONS.map((l) => `
                <button type="button" class="choice small ${Array.isArray(a.locations) && a.locations.includes(l) ? "selected" : ""}"
                  data-assign-loc="${escapeAttr(l)}">
                  ${escapeHtml(l)}
                </button>
              `).join("")}
            </div>
          </div>

          <div class="modal-section">
            <div class="field-label">Objectives (multi)</div>
            <div class="grid small">
              ${OBJECTIVES.map((o) => `
                <button type="button" class="choice small ${Array.isArray(a.objectives) && a.objectives.includes(o) ? "selected" : ""}"
                  data-assign-obj="${escapeAttr(o)}">
                  ${escapeHtml(o)}
                </button>
              `).join("")}
            </div>
          </div>

          <div class="modal-section">
            <div class="field-label">Assignment Notes (optional)</div>
            <textarea id="assignNotes" class="field-input" rows="2"
              placeholder="Short notes for this assignment…"
            >${escapeHtml(a.notes || "")}</textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="nav-btn" id="clearAssignBtn">Clear Assignment</button>
          <button class="nav-btn" data-modal-close="1">Cancel</button>
          <button class="nav-btn nav-btn-primary" id="saveAssignBtn">Save</button>
        </div>
      </div>
    </div>
  `;

  // Close handlers
  modalRoot.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", (e) => {
      // click outside modal closes
      if (e.target === el || el.dataset.modalClose === "1") {
        closeModal();
      }
    });
  });

  // Status buttons
  modalRoot.querySelectorAll("[data-status-set]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.statusSet;
      if (!s) return;
      setUnitStatus(unitId, s);
    });
  });

  // Task (single)
  modalRoot.querySelectorAll("[data-assign-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.assignTask;
      if (!t) return;
      setUnitAssignment(unitId, { task: t });
    });
  });

  // Locations (multi)
  modalRoot.querySelectorAll("[data-assign-loc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const l = btn.dataset.assignLoc;
      if (!l) return;
      const cur = getState();
      const u = (cur.tactical.units || []).find((x) => x.id === unitId);
      const a2 = (u && u.assignment) || { task: "", locations: [], objectives: [], notes: "" };
      const arr = Array.isArray(a2.locations) ? a2.locations.slice() : [];
      const next = arr.includes(l) ? arr.filter((x) => x !== l) : [...arr, l];
      setUnitAssignment(unitId, { locations: next });
    });
  });

  // Objectives (multi)
  modalRoot.querySelectorAll("[data-assign-obj]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const o = btn.dataset.assignObj;
      if (!o) return;
      const cur = getState();
      const u = (cur.tactical.units || []).find((x) => x.id === unitId);
      const a2 = (u && u.assignment) || { task: "", locations: [], objectives: [], notes: "" };
      const arr = Array.isArray(a2.objectives) ? a2.objectives.slice() : [];
      const next = arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o];
      setUnitAssignment(unitId, { objectives: next });
    });
  });

  // Clear assignment
  const clearBtn = document.getElementById("clearAssignBtn");
  if (clearBtn) clearBtn.addEventListener("click", () => clearUnitAssignment(unitId));

  // Save (also saves notes)
  const saveBtn = document.getElementById("saveAssignBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const notes = document.getElementById("assignNotes");
      setUnitAssignment(unitId, { notes: notes ? notes.value : "" });
      closeModal();
      snapshotToState(); // keep print current
    });
  }

  // ESC closes
  window.addEventListener("keydown", escCloseOnce);
}

function escCloseOnce(e) {
  if (e.key === "Escape") {
    closeModal();
  }
}

function closeModal() {
  const modalRoot = document.getElementById("modalRoot");
  if (modalRoot) modalRoot.innerHTML = "";
  window.removeEventListener("keydown", escCloseOnce);
}

function statusBtnHtml(status, current) {
  const label = formatStatus(status);
  const sel = status === current ? "selected" : "";
  return `<button type="button" class="choice small ${sel}" data-status-set="${status}">${label}</button>`;
}

// ---------------- Helpers ----------------

function battalionDisplay(code) {
  const c = (code || "").trim();
  if (c === "BC1") return "Battalion 1";
  if (c === "BC2") return "Battalion 2";
  return "";
}

function formatStatus(status) {
  if (status === "enroute") return "Enroute";
  if (status === "level1") return "Level 1";
  if (status === "onscene") return "On Scene";
  return "Enroute";
}

function assignmentSummary(a) {
  if (!a) return "";
  const t = (a.task || "").trim();
  const loc = Array.isArray(a.locations) && a.locations.length ? a.locations.join(", ") : "";
  const obj = Array.isArray(a.objectives) && a.objectives.length ? a.objectives.join(", ") : "";
  const parts = [t, loc, obj].filter(Boolean);
  return parts.join(" | ");
}

function renderBenchmarkButton(id, label, completedIds) {
  const isCompleted = completedIds.has(id);
  return `
    <button type="button"
      class="benchmark-btn ${isCompleted ? "completed" : ""}"
      data-benchmark-id="${escapeAttr(id)}"
      data-benchmark-label="${escapeAttr(label)}">
      ${escapeHtml(label)}
    </button>
  `;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s);
}
