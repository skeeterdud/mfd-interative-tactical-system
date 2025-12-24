// Components/SetupScreens.js
// Incident Setup screen using pill buttons instead of dropdowns

// expects from state.js:
// - appState
// - BATTALIONS, CALL_TYPES, UNITS
// - setBattalion(id), setCallType(type), toggleUnit(unitId), goToScreen(screenKey)

/**
 * Helper: create a pill button
 */
function createPill(label, isSelected, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pill";
  if (isSelected) btn.classList.add("is-selected");
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

/**
 * Main render function for Screen A – Incident Setup
 */
function renderSetupScreen(rootEl) {
  const setup = appState.setup || {};

  // Clear root
  rootEl.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "incident-setup";

  // Header
  const header = document.createElement("div");
  header.className = "incident-setup-header";

  const title = document.createElement("div");
  title.className = "incident-setup-title";
  title.textContent = "Incident Setup";

  const subtitle = document.createElement("div");
  subtitle.className = "incident-setup-subtitle";
  subtitle.textContent = "Select battalion, call type, and units responding.";

  header.appendChild(title);
  header.appendChild(subtitle);
  wrapper.appendChild(header);

  // --- Battalion pills ---
  const battSection = document.createElement("div");
  battSection.className = "setup-section";

  const battLabel = document.createElement("div");
  battLabel.className = "setup-section-label";
  battLabel.textContent = "Battalion";
  battSection.appendChild(battLabel);

  const battRow = document.createElement("div");
  battRow.className = "pill-row";

  (BATTALIONS || []).forEach((battId) => {
    const isSelected = setup.battalion === battId;
    const pill = createPill(battId, isSelected, () => {
      setBattalion(battId);
    });
    battRow.appendChild(pill);
  });

  battSection.appendChild(battRow);
  wrapper.appendChild(battSection);

  // --- Call Type pills ---
  const callSection = document.createElement("div");
  callSection.className = "setup-section";

  const callLabel = document.createElement("div");
  callLabel.className = "setup-section-label";
  callLabel.textContent = "Call Type";
  callSection.appendChild(callLabel);

  const callRow = document.createElement("div");
  callRow.className = "pill-row";

  (CALL_TYPES || []).forEach((type) => {
    const isSelected = setup.callType === type;
    const pill = createPill(type, isSelected, () => {
      setCallType(type);
    });
    callRow.appendChild(pill);
  });

  callSection.appendChild(callRow);
  wrapper.appendChild(callSection);

  // --- Units (apparatus) grid ---
  const unitSection = document.createElement("div");
  unitSection.className = "setup-section";

  const unitLabel = document.createElement("div");
  unitLabel.className = "setup-section-label";
  unitLabel.textContent = "Apparatus En Route";
  unitSection.appendChild(unitLabel);

  const unitGrid = document.createElement("div");
  unitGrid.className = "unit-grid";

  const activeUnits = setup.units || []; // expecting an array of selected unit IDs/labels

  (UNITS || []).forEach((unitId) => {
    const isSelected = activeUnits.includes(unitId);
    const pill = createPill(unitId, isSelected, () => {
      toggleUnit(unitId);
    });
    unitGrid.appendChild(pill);
  });

  unitSection.appendChild(unitGrid);
  wrapper.appendChild(unitSection);

  // --- Footer with Start Incident button ---
  const footer = document.createElement("div");
  footer.className = "setup-footer";

  const canStart =
    setup.battalion && setup.callType && (setup.units && setup.units.length > 0);

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "start-incident-btn";
  startBtn.textContent = "Start Incident";
  startBtn.disabled = !canStart;
  startBtn.addEventListener("click", () => {
    if (!canStart) return;
    // move to Screen B (IRR / Ops) – name it whatever you’re using
    goToScreen("ops"); // or "irr" or "screenB"
  });

  footer.appendChild(startBtn);
  wrapper.appendChild(footer);

  rootEl.appendChild(wrapper);
}
