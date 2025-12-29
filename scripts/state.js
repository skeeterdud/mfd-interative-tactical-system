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
];

const defaultState = () => ({
  screen: "incident",

  incident: {
    battalion: [], // ["BC1","BC2"]
    selectedUnitIds: [],
    callType: "Fire",
  },

  // Screen B (Size Up style IRR / IAP)
  irr: {
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
    irrUnitId: "",
  },

  // Screen C
  tactical: {
    // Units selected from Screen A will populate this list
    units: [],
    command: {
      currentIcUnitId: "",
      icName: "",
    },
    benchmarks: [],
    notes: "",

    // for backward compatibility with your earlier tactical output
    followUp: {
      r360: "",
      safety: "",
      confirmStrategy: "",
      confirmNotes: "",
      resourceDetermination: "",
      additional: "",
      generatedText: "",
    },

    // Canvas image snapshot for print (optional)
    canvasDataUrl: "",
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

// ---------- Incident (Screen A) ----------
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

// ---------- IRR (Screen B) ----------
export function setIrrField(field, value) {
  state = {
    ...state,
    irr: { ...state.irr, [field]: value },
  };
  emit();
}

export function toggleIrrArrayField(field, value) {
  const cur = Array.isArray(state.irr[field]) ? state.irr[field] : [];
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  setIrrField(field, next);
}

// ---------- Tactical (Screen C) ----------
export function setUnitStatus(unitId, status) {
  const nextUnits = (state.tactical.units || []).map((u) =>
    u.id === unitId ? { ...u, status } : u
  );
  state = { ...state, tactical: { ...state.tactical, units: nextUnits } };
  emit();
}

export function setUnitAssignment(unitId, assignmentPatch) {
  const nextUnits = (state.tactical.units || []).map((u) => {
    if (u.id !== unitId) return u;
    const curA = u.assignment || { task: "", locations: [], objectives: [], notes: "" };
    return { ...u, assignment: { ...curA, ...assignmentPatch } };
  });

  state = { ...state, tactical: { ...state.tactical, units: nextUnits } };
  emit();
}

export function clearUnitAssignment(unitId) {
  setUnitAssignment(unitId, { task: "", locations: [], objectives: [], notes: "" });
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

export function setTacticalNotes(text) {
  state = {
    ...state,
    tactical: { ...state.tactical, notes: text },
  };
  emit();
}

export function setCanvasDataUrl(dataUrl) {
  state = {
    ...state,
    tactical: { ...state.tactical, canvasDataUrl: dataUrl || "" },
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

// Called when entering Tactical screen
export function syncTacticalUnitsFromIncident() {
  const selected = Array.isArray(state.incident.selectedUnitIds)
    ? state.incident.selectedUnitIds
    : [];

  const wanted = selected
    .map((id) => ALL_UNITS.find((u) => u.id === id))
    .filter(Boolean)
    .map((u) => ({
      id: u.id,
      label: u.label,
      status: "enroute", // default lane for tactical flow
      assignment: { task: "", locations: [], objectives: [], notes: "" },
    }));

  state = {
    ...state,
    tactical: {
      ...state.tactical,
      units: wanted,
      command: {
        ...state.tactical.command,
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
