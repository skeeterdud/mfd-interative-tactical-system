// scripts/screens/screenC_tactical.js
// This is your current tactical worksheet view kept intact as Screen C.
// Next step: we’ll do the “big” redesign you described.

import {
  getState,
  setScreen,
  setUnitStatus,
  setCommand,
  setFollowUpField,
  setFollowUpGeneratedText,
  addBenchmark,
} from "../state.js";

export function renderScreenC(state) {
  const { incident, tactical } = state;

  const battalionArr = Array.isArray(incident.battalion) ? incident.battalion : [];
  const battalionDisplayText = battalionDisplay(battalionArr[0]) || battalionArr[0] || "Not set";

  const completedBenchmarkIds = new Set((tactical.benchmarks || []).map((b) => b.id));

  return `
    <section class="card">
      <h1 style="margin:0 0 6px 0;">Tactical Worksheet</h1>
      <p class="helper-text">
        (We’ll build out your full Screen C canvas/tabs next. This keeps your current tools working.)
      </p>
      <ul class="summary-list">
        <li><strong>Battalion:</strong> ${battalionDisplayText}</li>
        <li><strong>Units:</strong> ${(tactical.units || []).length ? tactical.units.map(u => u.label).join(", ") : "None"}</li>
      </ul>
    </section>

    <section class="card">
      <h2 class="card-title">Company Status Board</h2>
      <p class="helper-text">Tap a company to cycle status: Available → Enroute → Level 1 → On Scene.</p>
      <div class="tactical-unit-grid">
        ${(tactical.units || []).map(u => `
          <button class="unit-chip tactical-unit-chip" data-unit-id="${u.id}" data-status="${u.status}">
            <span class="unit-label">${u.label}</span>
            <span class="unit-status">${formatStatus(u.status)}</span>
          </button>
        `).join("")}
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">Command / IC</h2>
      <div class="followup-grid">
        <div class="field-group">
          <label class="field-label">IC Unit</label>
          <select id="tacticalIcUnitSelect" class="field-input">
            <option value="">-- Select IC Unit --</option>
            ${(tactical.units || []).map(u => `
              <option value="${u.id}" ${u.id === tactical.command.currentIcUnitId ? "selected" : ""}>${u.label}</option>
            `).join("")}
          </select>
        </div>

        <div class="field-group">
          <label class="field-label">Command Name</label>
          <input type="text" id="tacticalIcNameInput" class="field-input"
            placeholder="e.g., Main Street Command"
            value="${escapeHtml(tactical.command.icName || "")}" />
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">Tactical Benchmarks</h2>
      <div class="benchmark-row">
        ${renderBenchmarkButton("primarySearchAllClear","Primary Search All Clear",completedBenchmarkIds)}
        ${renderBenchmarkButton("fireUnderControl","Fire Under Control",completedBenchmarkIds)}
        ${renderBenchmarkButton("lossStopped","Loss Stopped",completedBenchmarkIds)}
        ${renderBenchmarkButton("parComplete","PAR Complete",completedBenchmarkIds)}
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">360 / Follow-Up</h2>
      <div class="followup-grid">
        <div class="field-group">
          <label class="field-label">360 Status</label>
          <select id="followup_r360" class="field-input">
            <option value=""></option>
            ${["Not completed","In progress","Completed"].map(v => `
              <option value="${v}" ${tactical.followUp.r360 === v ? "selected" : ""}>${v}</option>
            `).join("")}
          </select>
        </div>

        <div class="field-group">
          <label class="field-label">Safety</label>
          <input type="text" id="followup_safety" class="field-input"
            placeholder="e.g., accountability established, hazards identified"
            value="${escapeHtml(tactical.followUp.safety || "")}" />
        </div>

        <div class="field-group">
          <label class="field-label">Strategy Confirmation</label>
          <input type="text" id="followup_confirmStrategy" class="field-input"
            placeholder="e.g., remaining offensive with interior operations"
            value="${escapeHtml(tactical.followUp.confirmStrategy || "")}" />
        </div>

        <div class="field-group">
          <label class="field-label">Strategy Notes</label>
          <textarea id="followup_confirmNotes" class="field-input" rows="2"
            placeholder="Brief CAN-level notes, divisions/groups, exposures, etc.">${escapeHtml(tactical.followUp.confirmNotes || "")}</textarea>
        </div>

        <div class="field-group">
          <label class="field-label">Resource Determination</label>
          <textarea id="followup_resourceDetermination" class="field-input" rows="2"
            placeholder="e.g., requesting 2 additional engines, 1 truck, 1 medic for relief">${escapeHtml(tactical.followUp.resourceDetermination || "")}</textarea>
        </div>

        <div class="field-group">
          <label class="field-label">Additional Info</label>
          <textarea id="followup_additional" class="field-input" rows="2"
            placeholder="Other notes you want captured in the summary">${escapeHtml(tactical.followUp.additional || "")}</textarea>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">Generated Tactical Summary</h2>
      <pre class="output" id="tacticalOutputBox">${escapeHtml(tactical.followUp.generatedText || "")}</pre>

      <footer class="screen-footer">
        <button class="nav-btn" id="backToIrrBtn">◀ Back: IRR</button>
        <button class="nav-btn nav-btn-primary" id="printBtn">Print / PDF</button>
      </footer>
    </section>
  `;
}

export function attachHandlersC() {
  // Back
  const backBtn = document.getElementById("backToIrrBtn");
  if (backBtn) backBtn.addEventListener("click", () => setScreen("irr"));

  // Print
  const printBtn = document.getElementById("printBtn");
  if (printBtn) printBtn.addEventListener("click", () => window.print());

  // Status cycle
  document.querySelectorAll(".tactical-unit-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const unitId = btn.dataset.unitId;
      const currentStatus = btn.dataset.status || "available";
      const next = nextStatus(currentStatus);
      if (unitId && next) setUnitStatus(unitId, next);
      updateTacticalOutput();
    });
  });

  // Command
  const icUnitSelect = document.getElementById("tacticalIcUnitSelect");
  const icNameInput = document.getElementById("tacticalIcNameInput");

  const applyCommandUpdate = () => {
    const unitId = icUnitSelect ? icUnitSelect.value : "";
    const icName = icNameInput ? icNameInput.value : "";
    setCommand(unitId, icName);
    updateTacticalOutput();
  };

  if (icUnitSelect) icUnitSelect.addEventListener("change", applyCommandUpdate);
  if (icNameInput) icNameInput.addEventListener("input", applyCommandUpdate);

  // Benchmarks
  document.querySelectorAll(".benchmark-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.benchmarkId;
      const label = btn.dataset.benchmarkLabel;
      if (!id || !label) return;

      const state = getState();
      const already = (state.tactical.benchmarks || []).some((b) => b.id === id);
      if (!already) addBenchmark(id, label, []);
      updateTacticalOutput();
    });
  });

  // Follow-up
  const followUpFields = ["r360","safety","confirmStrategy","confirmNotes","resourceDetermination","additional"];
  followUpFields.forEach((field) => {
    const el = document.getElementById(`followup_${field}`);
    if (!el) return;
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      setFollowUpField(field, el.value);
      updateTacticalOutput();
    });
  });

  updateTacticalOutput();
}

function updateTacticalOutput() {
  const state = getState();
  const { incident, tactical } = state;

  const battalionArr = Array.isArray(incident.battalion) ? incident.battalion : [];
  const battalionText = battalionDisplay(battalionArr[0]) || battalionArr[0] || "Command";

  const lines = [];
  lines.push(`${battalionText}: tactical update.`);
  lines.push("");

  if (tactical.command.icName || tactical.command.currentIcUnitId) {
    const icUnit = (tactical.units || []).find((u) => u.id === tactical.command.currentIcUnitId);
    const icLabel = icUnit ? icUnit.label : tactical.command.currentIcUnitId;
    lines.push(`Command: ${tactical.command.icName || "Command"}${icLabel ? ` (${icLabel})` : ""}.`);
    lines.push("");
  }

  const f = tactical.followUp || {};
  if (f.r360) lines.push(`360: ${f.r360}.`);
  if (f.safety) lines.push(`Safety: ${f.safety}.`);
  if (f.confirmStrategy) lines.push(`Strategy: ${f.confirmStrategy}.`);
  if (f.confirmNotes) lines.push(`Notes: ${f.confirmNotes}.`);
  if (f.resourceDetermination) lines.push(`Resources: ${f.resourceDetermination}.`);
  if (f.additional) lines.push(`Additional: ${f.additional}.`);

  if (lines[lines.length - 1] !== "") lines.push("");

  if (tactical.benchmarks && tactical.benchmarks.length) {
    lines.push("Benchmarks:");
    tactical.benchmarks.forEach((b) => {
      const timeStr = formatTime(b.completedAt);
      lines.push(`- ${b.label}${timeStr ? ` at ${timeStr}` : ""}.`);
    });
  }

  const text = lines.join("\n");

  const outEl = document.getElementById("tacticalOutputBox");
  if (outEl) outEl.textContent = text;

  setFollowUpGeneratedText(text);
}

function battalionDisplay(code) {
  const c = (code || "").trim();
  if (c === "BC1") return "Battalion 1";
  if (c === "BC2") return "Battalion 2";
  return "";
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

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
