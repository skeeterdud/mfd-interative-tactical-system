// scripts/state.js
// Simple state store for MFD Interactive Tactical System (A/B/C)

const listeners = new Set();

export const ALL_UNITS = [
  // Engines / Trucks (match your Size Up order)
  { id: "TRK1", label: "Trk 1" },
  { id: "ENG2", label: "Eng 2" },
  { id: "TRK3", label: "Trk 3" },
  { id: "ENG4", label: "Eng 4" },
  { id: "TRK5", label: "Trk 5" },
  { id: "ENG6", label: "Eng 6" },
  { id: "ENG7", label: "Eng 7" },
  { id: "TRK9", label: "Trk 9" },
  { id: "ENG10", label: "Eng 10" },
  { id: "TRK11", label: "Trk 11" },

  // Medics
  { id: "MED1", label: "Med 1" },
  { id: "MED2", label: "Med 2" },
  { id: "MED3", label: "Med 3" },
  { id: "MED5", label: "Med 5" },
  { id: "MED6", label: "Med 6" },
  { id: "MED7", label: "Med 7" },
  { id: "MED9", label: "Med 9" },
  { id: "MED10", label: "Med 10" },
  { id: "MED11", label: "Med 11" },

  // EMS
  { id: "EMS1", label: "EMS 1" },

  // Battalion (optional to treat like a “unit” later if you want)
  // { id: "BC1", label: "BC1" },
  // { id: "BC2", label: "BC2" },
];

const defaultAssignment = () => ({
  task: "",
  locations: [],
  objectives: [],
  notes: "",
});

const defaultState = () => ({
  screen: "incident",

  incident: {
    battalion: [], // ["BC1","BC2"]
    selectedUnitIds: [],
    callType: "Fire",
  },

  // Screen B (Size Up style IRR / IAP)
  irr: {
    irrUnitId: "", // <-- unit giving IRR (selected on Screen B header)

    buildingSize: "",
    height: "",
    occupancy: "",
    occupancyOther: "",

    conditions: "",
    problemSides: [],
    problemLocQuick: [],
    problemLocationText: "",

    iapTasks: [],
    iapLocation: [],
    iapLocationOther: "",
    iapObjectives: [],

    strategy: "Offensive",
    commandText: "",
  },

  tactical: {
    // Drawing
    canvasDataUrl: "",

    // Tabs / UI state
    activeTab: "units", // units | benchmarks | followup | command | transfer
    activeUnitId: "",   // selected unit for modal

    // Unit board
    units: [],

    // Command tracking
    command: {
      currentIcUnitId: "",
      icName: "",
      incidentName: "", // auto-fill from command name in IRR
      transferTo: "",   // "BC1" / "BC2"
      canConditions: "",
      canActions: "",
      canNeeds: "",
    },

    benchmarks: [],

    followUp: {
      r360: "",
      safety: "",
      confirmStrategy: "",
      confirmNotes: "",
      resourceDetermination: "",
      additional: "",
      generatedText: "",
    },
  },
});

let state = defaultState();

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(state);
}

export function setScreen(screen) {
  state = { ...state, screen };
  emit();
}

// -------------------- Incident --------------------

export function setIncidentField(field, value) {
  state = {
    ...state,
    incident: { ...state.incident, [field]: value },
  };
  emit();
}

export function toggleIncidentUnit(unitId) {
  const cur = Array.isArray(state.incident.selectedUnitIds)
    ? state.incident.selectedUnitIds
    : [];
  const next = cur.includes(unitId)
    ? cur.filter((x) => x !== unitId)
    : [...cur, unitId];

  state = {
    ...state,
    incident: { ...state.incident, selectedUnitIds: next },
  };
  emit();
}

// -------------------- IRR --------------------

export function setIrrField(field, value) {
  state = {
    ...state,
    irr: { ...state.irr, [field]: value },
  };

  // Auto-fill Incident Name from commandText (normalize to something useful)
  if (field === "commandText") {
    const incidentName = (value || "").trim();
    state = {
      ...state,
      tactical: {
        ...state.tactical,
        command: {
          ...state.tactical.command,
          incidentName,
          // if IC name not set yet, optionally mirror it:
          icName: state.tactical.command.icName || incidentName,
        },
      },
    };
  }

  emit();
}

export function toggleIrrArrayField(field, value) {
  const cur = Array.isArray(state.irr[field]) ? state.irr[field] : [];
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  setIrrField(field, next);
}

// -------------------- Tactical (Screen C) --------------------

export function setTacticalField(field, value) {
  state = {
    ...state,
    tactical: { ...state.tactical, [field]: value },
  };
  emit();
}

export function setActiveTab(tab) {
  setTacticalField("activeTab", tab);
}

export function setActiveUnit(unitId) {
  state = { ...state, tactical: { ...state.tactical, activeUnitId: unitId } };
  emit();
}

export function setCanvasDataUrl(dataUrl) {
  state = {
    ...state,
    tactical: { ...state.tactical, canvasDataUrl: dataUrl || "" },
  };
  emit();
}

export function clearCanvas() {
  setCanvasDataUrl("");
}

export function setUnitStatus(unitId, status) {
  const nextUnits = (state.tactical.units || []).map((u) =>
    u.id === unitId ? { ...u, status } : u
  );
  state = { ...state, tactical: { ...state.tactical, units: nextUnits } };
  emit();
}

export function setUnitAssignment(unitId, patch) {
  const nextUnits = (state.tactical.units || []).map((u) => {
    if (u.id !== unitId) return u;

    const current = u.assignment || defaultAssignment();
    return {
      ...u,
      assignment: {
        ...current,
        ...(patch || {}),
      },
    };
  });

  state = { ...state, tactical: { ...state.tactical, units: nextUnits } };
  emit();
}

export function clearUnitAssignment(unitId) {
  const nextUnits = (state.tactical.units || []).map((u) => {
    if (u.id !== unitId) return u;
    return { ...u, assignment: defaultAssignment(), status: "level1" };
  });

  state = { ...state, tactical: { ...state.tactical, units: nextUnits } };
  emit();
}

export function setCommand(unitId, icName) {
  state = {
    ...state,
    tactical: {
      ...state.tactical,
      command: { ...state.tactical.command, currentIcUnitId: unitId, icName },
    },
  };
  emit();
}

export function setCommandField(field, value) {
  state = {
    ...state,
    tactical: {
      ...state.tactical,
      command: { ...state.tactical.command, [field]: value },
    },
  };
  emit();
}

export function setFollowUpField(field, value) {
  state = {
    ...state,
    tactical: {
      ...state.tactical,
      followUp: { ...state.tactical.followUp, [field]: value },
    },
  };
  emit();
}

export function setFollowUpGeneratedText(text) {
  state = {
    ...state,
    tactical: {
      ...state.tactical,
      followUp: { ...state.tactical.followUp, generatedText: text },
    },
  };
  emit();
}

export function addBenchmark(id, label, units = []) {
  const exists = (state.tactical.benchmarks || []).some((b) => b.id === id);
  if (exists) return;

  const next = [
    ...(state.tactical.benchmarks || []),
    { id, label, units, completedAt: new Date().toISOString() },
  ];

  state = { ...state, tactical: { ...state.tactical, benchmarks: next } };
  emit();
}

// Called when entering Tactical screen to ensure tactical.units matches incident selection
export function syncTacticalUnitsFromIncident() {
  const selected = Array.isArray(state.incident.selectedUnitIds)
    ? state.incident.selectedUnitIds
    : [];

  const wanted = selected
    .map((id) => ALL_UNITS.find((u) => u.id === id))
    .filter(Boolean)
    .map((u) => {
      const existing = (state.tactical.units || []).find((x) => x.id === u.id);

      return {
        id: u.id,
        label: u.label,
        status: existing?.status || "enroute", // default incoming
        assignment: existing?.assignment || defaultAssignment(),
      };
    });

  // Keep the IRR command text mirrored into incident name if it exists
  const incidentName = (state.irr.commandText || "").trim();

  state = {
    ...state,
    tactical: {
      ...state.tactical,
      units: wanted,
      command: {
        ...state.tactical.command,
        incidentName: incidentName || state.tactical.command.incidentName || "",
        icName: state.tactical.command.icName || incidentName || "",
        currentIcUnitId: wanted.some((u) => u.id === state.tactical.command.currentIcUnitId)
          ? state.tactical.command.currentIcUnitId
          : "",
      },
    },
  };

  emit();
}

export function resetAll() {
  state = defaultState();
  emit();
}
