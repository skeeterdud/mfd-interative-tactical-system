// scripts/screens/screenB_irr.js
// Screen B: matches Size Up Step 2 styling + adds "Select Unit Giving IRR"

import {
  setScreen,
  setIrrField,
  toggleIrrArrayField,
  resetAll,
  ALL_UNITS,
} from "../state.js";

const PROBLEM_QUICK = [
  "1st Floor","2nd Floor","3rd Floor","Corner","Roof","Roof Line","Backyard","Garage","Other"
];

const CONFIG = [
  { key:"buildingSize", title:"Building Size", mode:"single", options:[
    { value:"Small",  label:"Small",  phrase:"Small" },
    { value:"Medium", label:"Medium", phrase:"Medium" },
    { value:"Large",  label:"Large",  phrase:"Large" },
    { value:"Mega",   label:"Mega",   phrase:"Mega" }
  ]},
  { key:"height", title:"Building Height", mode:"single", options:[
    { value:"1", label:"1", phrase:"1 story" },
    { value:"2", label:"2", phrase:"2 story" },
    { value:"3", label:"3", phrase:"3 story" },
    { value:"4", label:"4", phrase:"4 story" },
    { value:"5", label:"5", phrase:"5 story" }
  ]},
  { key:"occupancy", title:"Occupancy Type", mode:"single", options:[
    { value:"house", label:"House", phrase:"house" },
    { value:"apartment", label:"Apartment", phrase:"apartment" },
    { value:"strip", label:"Strip Center", phrase:"strip center" },
    { value:"commercial", label:"Commercial", phrase:"commercial" },
    { value:"other", label:"Other", phrase:"" }
  ]},

  { key:"conditions", title:"Condition", mode:"single", options:[
    { value:"nothing", label:"Nothing Showing", phrase:"nothing showing" },
    { value:"light", label:"Light Smoke", phrase:"light smoke" },
    { value:"heavy", label:"Heavy Smoke", phrase:"heavy smoke" },
    { value:"working", label:"Working Fire", phrase:"working fire" },
    { value:"defensive", label:"Defensive Conditions", phrase:"defensive conditions" }
  ]},
  { key:"problemSides", title:"Location of the Problem (multi)", mode:"multi", options:[
    { value:"Alpha", label:"Alpha", phrase:"alpha" },
    { value:"Bravo", label:"Bravo", phrase:"bravo" },
    { value:"Charlie", label:"Charlie", phrase:"charlie" },
    { value:"Delta", label:"Delta", phrase:"delta" }
  ]},

  { key:"iapTasks", title:"Task (multi)", mode:"multi", options:[
    { value:"Investigate", label:"Investigate", phrase:"investigating" },
    { value:"Water Supply", label:"Water Supply", phrase:"setting up water supply" },
    { value:"Attack Line", label:"Attack Line", phrase:"attack line" },
    { value:"Rescue", label:"Rescue", phrase:"rescue" },
    { value:"OEO", label:"OEO", phrase:"OEO" },
    { value:"Defensive Op", label:"Defensive Op", phrase:"defensive operations" }
  ]},
  { key:"iapLocation", title:"IAP Location (multi)", mode:"multi", options:[
    { value:"1st Floor", label:"1st Floor", phrase:"1st floor" },
    { value:"2nd Floor", label:"2nd Floor", phrase:"2nd floor" },
    { value:"3rd Floor", label:"3rd Floor", phrase:"3rd floor" },
    { value:"4th Floor", label:"4th Floor", phrase:"4th floor" },
    { value:"Alpha",     label:"Alpha",     phrase:"alpha" },
    { value:"Bravo",     label:"Bravo",     phrase:"bravo" },
    { value:"Charlie",   label:"Charlie",   phrase:"charlie" },
    { value:"Delta",     label:"Delta",     phrase:"delta" },
    { value:"other",     label:"Other",     phrase:"" }
  ]},
  { key:"iapObjectives", title:"Objective (multi)", mode:"multi", options:[
    { value:"Fire Attack", label:"Fire Attack", phrase:"fire attack" },
    { value:"Primary Search", label:"Primary Search", phrase:"primary search" }
  ]},
];

export function renderScreenB(state) {
  const irr = state.irr || {};
  const incident = state.incident || {};

  const selectedIds = Array.isArray(incident.selectedUnitIds) ? incident.selectedUnitIds : [];
  const selectedUnits = selectedIds
    .map((id) => ALL_UNITS.find((u) => u.id === id))
    .filter(Boolean);

  const sizeupText = buildIrrText(state);

  const isSelected = (key, value) => (irr[key] || "") === value;
  const isInArray = (key, value) => Array.isArray(irr[key]) && irr[key].includes(value);

  return `
    <!-- TOP: Select Unit Giving IRR (this is what you said you lost) -->
    <section class="card">
      <div class="helper-text">Step 2 of 3 – IRR & IAP</div>
      <h1 style="margin:6px 0 0 0;">Select Unit Giving IRR</h1>
      <p class="helper-text">Tap one of the units you selected on Screen A.</p>

      <div class="unit-grid" style="margin-top:10px;">
        ${
          selectedUnits.length
            ? selectedUnits
                .map(
                  (u) => `
            <button type="button"
              class="choice irr-unit-btn ${irr.irrUnitId === u.id ? "selected" : ""}"
              data-unit-id="${u.id}">
              ${u.label}
            </button>
          `
                )
                .join("")
            : `<div class="helper-text">No units selected on Screen A. Go back and select units.</div>`
        }
      </div>
    </section>

    <!-- IRR + IAP layout (Size Up Step 2 style) -->
    <section class="card">
      <div class="irrWrap">
        <div class="irrTitle">IRR</div>

        <div class="block building">
          <h2>Building Description</h2>
          ${renderButtonGroupHtml("buildingSize", irr, isSelected, isInArray)}
          ${renderButtonGroupHtml("height", irr, isSelected, isInArray)}
          ${renderButtonGroupHtml("occupancy", irr, isSelected, isInArray)}
          ${
            irr.occupancy === "other"
              ? `
                <label class="field-label">Occupancy Type</label>
                <input type="text" class="field-input" id="irrOccupancyOther"
                  placeholder="e.g., school, church, warehouse…"
                  value="${escapeHtml(irr.occupancyOther || "")}"
                />
              `
              : ""
          }
        </div>

        <div class="block problem">
          <h2>Problem Description</h2>
          ${renderButtonGroupHtml("conditions", irr, isSelected, isInArray)}
          ${renderButtonGroupHtml("problemSides", irr, isSelected, isInArray)}

          <label class="field-label">Location of the Problem Area (quick)</label>
          <div class="grid small">
            ${PROBLEM_QUICK.map((label) => `
              <button type="button"
                class="choice small problem-quick ${isInArray("problemLocQuick", label) ? "selected" : ""}"
                data-quick="${escapeAttr(label)}">${label}</button>
            `).join("")}
          </div>

          <label class="field-label">Location of the Problem (Free Text)</label>
          <input type="text" class="field-input" id="irrProblemLocationText"
            placeholder="e.g., rear storage, stairwell, room off hallway…"
            value="${escapeHtml(irr.problemLocationText || "")}"
          />
        </div>
      </div>

      <div class="block iap">
        <h2>Initial Action Plan</h2>
        ${renderButtonGroupHtml("iapTasks", irr, isSelected, isInArray)}
        ${renderButtonGroupHtml("iapLocation", irr, isSelected, isInArray)}
        ${
          Array.isArray(irr.iapLocation) && irr.iapLocation.includes("other")
            ? `
              <label class="field-label">IAP Location (Other)</label>
              <input type="text" class="field-input" id="irrIapLocationOther"
                placeholder="e.g., interior stairwell, basement, roof division…"
                value="${escapeHtml(irr.iapLocationOther || "")}"
              />
            `
            : ""
        }
        ${renderButtonGroupHtml("iapObjectives", irr, isSelected, isInArray)}
      </div>

      <div class="block cmd">
        <h2>Strategy / Command</h2>

        <div style="margin:0 0 10px 0;"><b>Strategy</b></div>
        <div class="grid">
          ${["Offensive","Defensive"].map((v) => `
            <button type="button"
              class="choice irr-strategy ${((irr.strategy || "Offensive") === v) ? "selected" : ""}"
              data-strategy="${v}">${v}</button>
          `).join("")}
        </div>

        <label class="field-label" style="font-weight:900;color:var(--text);">Command</label>
        <input type="text" class="field-input" id="irrCommandText"
          placeholder="e.g., Main Street Command"
          value="${escapeHtml(irr.commandText || "")}"
        />
      </div>
    </section>

    <section class="card">
      <div class="helper-text"><b>Generated Size-Up</b></div>
      <pre class="output" id="irrOutputBox">${escapeHtml(sizeupText)}</pre>

      <footer class="screen-footer">
        <button class="nav-btn" id="irrBackBtn">◀ Back: Incident</button>
        <button class="nav-btn" id="irrStartOverBtn">Start Over</button>
        <button class="nav-btn nav-btn-primary" id="toTacticalBtn">Next: Tactical View ▶</button>
      </footer>
    </section>
  `;
}

export function attachHandlersB(state) {
  // Select Unit Giving IRR
  document.querySelectorAll(".irr-unit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.unitId;
      if (id) setIrrField("irrUnitId", id);
    });
  });

  // Single + Multi group buttons
  document.querySelectorAll("button.choice[data-key]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      const value = btn.dataset.value;
      if (!key) return;

      const group = CONFIG.find((g) => g.key === key);
      if (!group) return;

      if (group.mode === "single") setIrrField(key, value);
      else toggleIrrArrayField(key, value);
    });
  });

  // Strategy
  document.querySelectorAll(".irr-strategy").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.strategy;
      if (v) setIrrField("strategy", v);
    });
  });

  // Quick problem location
  document.querySelectorAll(".problem-quick").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.quick;
      if (v) toggleIrrArrayField("problemLocQuick", v);
    });
  });

  // Inputs (these will still re-render—your app.js should preserve focus/cursor)
  const occOther = document.getElementById("irrOccupancyOther");
  if (occOther) occOther.addEventListener("input", () => setIrrField("occupancyOther", occOther.value));

  const probFree = document.getElementById("irrProblemLocationText");
  if (probFree) probFree.addEventListener("input", () => setIrrField("problemLocationText", probFree.value));

  const iapOther = document.getElementById("irrIapLocationOther");
  if (iapOther) iapOther.addEventListener("input", () => setIrrField("iapLocationOther", iapOther.value));

  const cmd = document.getElementById("irrCommandText");
  if (cmd) cmd.addEventListener("input", () => setIrrField("commandText", cmd.value));

  // Nav
  const backBtn = document.getElementById("irrBackBtn");
  if (backBtn) backBtn.addEventListener("click", () => setScreen("incident"));

  const startOverBtn = document.getElementById("irrStartOverBtn");
  if (startOverBtn) startOverBtn.addEventListener("click", () => resetAll());

  const nextBtn = document.getElementById("toTacticalBtn");
  if (nextBtn) nextBtn.addEventListener("click", () => setScreen("tactical"));
}

/* ---------------- UI Helpers ---------------- */

function renderButtonGroupHtml(key, irr, isSelected, isInArray) {
  const group = CONFIG.find((g) => g.key === key);
  if (!group) return "";

  const title = `<div style="margin:0 0 10px 0;"><b>${group.title}</b></div>`;
  const buttons = group.options
    .map((opt) => {
      const selected =
        group.mode === "single"
          ? isSelected(key, opt.value)
          : (isInArray ? isInArray(key, opt.value) : false);

      return `
        <button type="button" class="choice ${selected ? "selected" : ""}"
          data-key="${group.key}" data-value="${escapeAttr(opt.value)}">
          ${opt.label}
        </button>
      `;
    })
    .join("");

  return `${title}<div class="grid">${buttons}</div>`;
}

/* ---------------- Text Builder (Size Up logic + From [IRR Unit]) ---------------- */

function optionPhrase(groupKey, value){
  const group = CONFIG.find(g => g.key === groupKey);
  if (!group) return "";
  return (group.options.find(o => o.value === value)?.phrase || "").trim();
}

function singlePhrase(irr, key){
  const val = irr[key];
  if (!val) return "";
  return optionPhrase(key, val);
}

function multiList(irr, key){
  const arr = Array.isArray(irr[key]) ? irr[key] : [];
  return arr.filter(Boolean);
}

function niceSidesDisplay(sidesArr){
  return sidesArr.map(s => s.toLowerCase()).join(" ");
}

function mapIapLocation(val){
  if (!val) return "";
  const lower = String(val).toLowerCase();
  if (["alpha","bravo","charlie","delta"].includes(lower)) return `${lower} side`;
  if (lower.includes("floor")) return lower;
  return lower;
}

function buildIapLocationPhrase(iapLocArr, otherText){
  const arr = Array.isArray(iapLocArr) ? iapLocArr : [];
  const parts = [];
  for (const v of arr){
    if (v === "other") continue;
    parts.push(mapIapLocation(v));
  }
  const other = (otherText || "").trim();
  if (arr.includes("other") && other) parts.push(other.toLowerCase());
  const uniq = [...new Set(parts)].filter(Boolean);
  return uniq.join(", ");
}

function normalizeCommandName(raw){
  let s = (raw || "").trim();
  if (!s) return "";
  if (/command\.?$/i.test(s)) return s.replace(/\.*$/,"");
  return `${s} Command`;
}

function battalionDisplay(code){
  const c = (code || "").trim();
  if (c === "BC1") return "Battalion 1";
  if (c === "BC2") return "Battalion 2";
  return "";
}

function buildIrrText(state){
  const irr = state.irr || {};
  const battalionArr = Array.isArray(state.incident?.battalion) ? state.incident.battalion : [];
  const battalion = battalionDisplay(battalionArr[0] || "");

  const irrUnit = ALL_UNITS.find((u) => u.id === irr.irrUnitId);
  const apparatus = irrUnit ? irrUnit.label : ""; // ✅ From selected unit

  const bSize = (irr.buildingSize || "").trim();
  const bHeight = singlePhrase(irr, "height");

  let occ = "";
  if (irr.occupancy === "other") occ = (irr.occupancyOther || "").trim();
  else if (irr.occupancy) occ = optionPhrase("occupancy", irr.occupancy);

  const condition = singlePhrase(irr, "conditions");

  const sides = multiList(irr, "problemSides");
  const sidesText = sides.length ? niceSidesDisplay(sides) : "";

  const quick = Array.isArray(irr.problemLocQuick) ? irr.problemLocQuick : [];
  const quickText = quick.length ? quick.map(x => x.toLowerCase()).join(", ") : "";

  const locFree = (irr.problemLocationText || "").trim();
  const locCombined = [quickText, locFree].filter(Boolean).join(", ").trim();

  const tasks = multiList(irr, "iapTasks").map(v => optionPhrase("iapTasks", v)).filter(Boolean);
  const iapLocPhrase = buildIapLocationPhrase(irr.iapLocation, irr.iapLocationOther);
  const objectives = multiList(irr, "iapObjectives").map(v => optionPhrase("iapObjectives", v)).filter(Boolean);

  const strategy = (irr.strategy || "Offensive");
  const cmdText = normalizeCommandName(irr.commandText);

  const buildingParts = [bSize, bHeight, occ].filter(Boolean);
  const buildingPhrase = buildingParts.length ? buildingParts.join(" ") : "a structure";

  let probPhrase = "";
  if (sidesText && !locCombined) probPhrase = `${sidesText} side`;
  else probPhrase = [sidesText ? `${sidesText} side` : "", locCombined].filter(Boolean).join(" ").trim();

  const taskPhrase = tasks.length ? tasks.join(", ") : "";
  const objPhrase = objectives.length ? objectives.join(", ") : "";

  const line1 =
    `${battalion ? battalion + " " : ""}` +
    `${apparatus ? "From " + apparatus + ", " : ""}` +
    `We are on scene with a ${buildingPhrase}` +
    `${condition ? ", with " + condition : ""}` +
    `${probPhrase ? " on the " + probPhrase : ""}.`;

  const line2 =
    `${apparatus ? apparatus + " " : ""}` +
    `${taskPhrase ? "will be " + taskPhrase : "will be operating"}` +
    `${iapLocPhrase ? " on the " + iapLocPhrase : ""}` +
    `${objPhrase ? " for " + objPhrase : ""}.`;

  const line3 =
    `We will be in the ${strategy} strategy` +
    `${cmdText ? ", we are " + cmdText : ""}.`;

  return [line1, line2, line3].join("\n\n");
}

/* ---------- tiny safe escaping helpers ---------- */
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s); }
