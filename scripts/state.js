// scripts/state.js
// Central app state + helpers for the MFD Interactive Tactical System

export const UNIT_TYPES = {
  TRUCK: "truck",
  ENGINE: "engine",
  MEDIC: "medic",
  OTHER: "other",
};

export const ALL_UNITS = [
  { id: "TRK1", label: "Trk 1", type: UNIT_TYPES.TRUCK },
  { id: "ENG2", label: "Eng 2", type: UNIT_TYPES.ENGINE },
  { id: "TRK3", label: "Trk 3", type: UNIT_TYPES.TRUCK },
  { id: "ENG4", label: "Eng 4", type: UNIT_TYPES.ENGINE },
  { id: "TRK5", label: "Trk 5", type: UNIT_TYPES.TRUCK },
  { id: "ENG6", label: "Eng 6", type: UNIT_TYPES.ENGINE },
  { id: "ENG7", label: "Eng 7", type: UNIT_TYPES.ENGINE },
  { id: "TRK9", label: "Trk 9", type: UNIT_TYPES.TRUCK },
  { id: "ENG10", label: "Eng 10", type: UNIT_TYPES.ENGINE },
  { id: "TRK11", label: "Trk 11", type: UNIT_TYPES.TRUCK },

  { id: "MED1", label: "Med 1", type: UNIT_TYPES.MEDIC },
  { id: "MED2", label: "Med 2", type: UNIT_TYPES.MEDIC },
  { id: "MED3", label: "Med 3", type: UNIT_TYPES.MEDIC },
  { id: "MED5", label: "Med 5", type: UNIT_TYPES.MEDIC },
  { id: "MED6", label: "Med 6", type: UNIT_TYPES.MEDIC },
  { id: "MED7", label: "Med 7", type: UNIT_TYPES.MEDIC },
  { id: "MED9", label: "Med 9", type: UNIT_TYPES.MEDIC },
  { id: "MED10", label: "Med 10", type: UNIT_TYPES.MEDIC },
  { id: "MED11", label: "Med 11", type: UNIT_TYPES.MEDIC },

  // ✅ EMS 1 acts exactly like any other unit
  { id: "EMS1", label: "EMS 1", type: UNIT_TYPES.OTHER },
];

// --- Default State ----------------------------------------------------------

const defaultState = {
  screen: "incident",

  incident: {
    callType: "Fire",
    battalion: [],          // ✅ multi-select array ["BC1","BC2"]
    selectedUnitIds: [],    // ✅ list of responding units
  },

  irr: {
    irrUnitId: "",

    buildingSize: "",
    height: "",
    occupancy: "",
    occupancyOther: "",

    conditions: "",
    problemSides: [],
    problemLocationText: "",

    iapTasks: [],
    iapLocations: [],
    iapLocationOther: "",
    iapObjectives: [],

    strategy: "Offensive",
    commandText: "",
  },

  tactical: {
    // Status board uses this list
    units: ALL_UNITS.map((u) => ({
      ...u,
      status: "available", // available | enroute | level1 | onscene
      assignment: null,
      timestamps: {
        enroute: null,
        level1: null,
        onscene: null,
      },
    })),

    command: {
      currentIcUnitId: "",
      icName: "",
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
};

// --- Store -----------------------------------------------------------------

let state = deepClone(defaultState);
const listeners = new Set();

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateState(updater) {
  const next = typeof updater === "function" ? updater(deepClone(state)) : updater;
  state = next;
  notify();
}

export function resetState() {
  state = deepClone(defaultState);
  notify();
}

// --- Navigation ------------------------------------------------------------

export function setScreen(screenName) {
  updateState((s) => {
    s.screen = screenName;
    return s;
  });
}

// --- Incident --------------------------------------------------------------

export function setIncidentField(field, value) {
  updateState((s) => {
    if (field in s.incident) s.incident[field] = value;
    return s;
  });
}

export function toggleIncidentUnit(unitId) {
  updateState((s) => {
    const list = Array.isArray(s.incident.selectedUnitIds)
      ? s.incident.selectedUnitIds
      : [];

    if (list.includes(unitId)) {
      s.incident.selectedUnitIds = list.filter((id) => id !== unitId);
    } else {
      s.incident.selectedUnitIds = [...list, unitId];
    }
    return s;
  });
}

// --- IRR -------------------------------------------------------------------

export function setIrrField(field, value) {
  updateState((s) => {
    if (field in s.irr) s.irr[field] = value;
    return s;
  });
}

export function toggleIrrArrayField(field, value) {
  updateState((s) => {
    const arr = Array.isArray(s.irr[field]) ? s.irr[field] : [];
    if (arr.includes(value)) {
      s.irr[field] = arr.filter((v) => v !== value);
    } else {
      s.irr[field] = [...arr, value];
    }
    return s;
  });
}

// --- Tactical: Company Status ---------------------------------------------

export function setUnitStatus(unitId, status) {
  const allowed = new Set(["available", "enroute", "level1", "onscene"]);
  if (!allowed.has(status)) return;

  updateState((s) => {
    const u = s.tactical.units.find((x) => x.id === unitId);
    if (!u) return s;

    u.status = status;

    const now = new Date().toISOString();
    if (status === "enroute") u.timestamps.enroute = now;
    if (status === "level1") u.timestamps.level1 = now;
    if (status === "onscene") u.timestamps.onscene = now;

    return s;
  });
}

// --- Tactical: Command / IC ------------------------------------------------

export function setCommand(icUnitId, icName) {
  updateState((s) => {
    s.tactical.command.currentIcUnitId = icUnitId || "";
    s.tactical.command.icName = icName || "";
    return s;
  });
}

// --- Tactical: Follow-up ---------------------------------------------------

export function setFollowUpField(field, value) {
  updateState((s) => {
    if (field in s.tactical.followUp) {
      s.tactical.followUp[field] = value;
    }
    return s;
  });
}

export function setFollowUpGeneratedText(text) {
  updateState((s) => {
    s.tactical.followUp.generatedText = text || "";
    return s;
  });
}

// --- Tactical: Benchmarks --------------------------------------------------

export function addBenchmark(id, label, unitIds = []) {
  updateState((s) => {
    const list = Array.isArray(s.tactical.benchmarks) ? s.tactical.benchmarks : [];
    const already = list.some((b) => b.id === id);
    if (already) return s;

    list.push({
      id,
      label,
      units: Array.isArray(unitIds) ? unitIds : [],
      completedAt: new Date().toISOString(),
    });

    s.tactical.benchmarks = list;
    return s;
  });
}
