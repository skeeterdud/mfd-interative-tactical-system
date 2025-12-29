// ===========================
// state.js
// Central app state + helpers
// (Updated units to include Trk 5, Med 5, Trk 11, Med 11, EMS 1)
// ===========================

// --- Unit Definitions ---
export const UNIT_TYPES = {
  TRUCK: "truck",
  ENGINE: "engine",
  MEDIC: "medic",
  OTHER: "other",
};

const BATTALIONS = ["BC1", "BC2"];
const CALL_TYPES = ["Fire", "Accident", "Large Scale Event (EMS/RTF)"];

const UNITS = [
  "Trk 1","Eng 2","Trk 3","Eng 4","Trk 5",
  "Eng 6","Eng 7","Trk 9","Eng 10","Trk 11",
  "Med 1","Med 2","Med 3","Med 5","Med 6",
  "Med 7","Med 9","Med 10","Med 11",
  "EMS 1"
];

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

  { id: "EMS1", label: "EMS 1", type: UNIT_TYPES.OTHER },
];

// --- Default State Shape ---
const defaultState = {
  screen: "incident",

  // Screen A – incident setup
  incident: {
    callType: "Fire",
    battalion: [],          // MULTI-select array ["BC1","BC2"]
    selectedUnitIds: [],
  },

  // Screen B – IRR inputs + generated text
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
    generatedText: "",
  },

  // Screen C – units and tactical view
  tactical: {
    units: ALL_UNITS.map((u) => ({
      ...u,
      status: "available",
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
      additional: "",
      safety: "",
      confirmStrategy: "",
      confirmNotes: "",
      resourceDetermination: "",
      generatedText: "",
    },
  },
};

// --- State Store ---
let state = deepClone(defaultState);
const listeners = new Set();

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((fn) => fn(state));
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

// --- Incident helpers (Screen A) ---

export function setScreen(screenName) {
  updateState((s) => {
    s.screen = screenName;
    return s;
  });
}

export function setIncidentField(field, value) {
  updateState((s) => {
    if (field in s.incident) {
      s.incident[field] = value;
    }
    return s;
  });
}

export function toggleIncidentUnit(unitId) {
  updateState((s) => {
    const list = s.incident.selectedUnitIds;
    if (list.includes(unitId)) {
      s.incident.selectedUnitIds = list.filter((id) => id !== unitId);
    } else {
      s.incident.selectedUnitIds = [...list, unitId];
    }
    return s;
  });
}

// --- IRR helpers (Screen B) ---

export function setIrrField(field, value) {
  updateState((s) => {
    if (field in s.irr) {
      s.irr[field] = value;
    }
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

export function setIrrGeneratedText(text) {
  updateState((s) => {
    s.irr.generatedText = text;
    return s;
  });
}

// --- Tactical / Units helpers (Screen C) ---

function findTacticalUnit(s, unitId) {
  return s.tactical.units.find((u) => u.id === unitId);
}

export function setUnitStatus(unitId, status) {
  const valid = ["available", "enroute", "level1", "onscene"];
  if (!valid.includes(status)) return;

  updateState((s) => {
    const u = findTacticalUnit(s, unitId);
    if (u) {
      u.status = status;
      const now = new Date().toISOString();
      if (status === "enroute") u.timestamps.enroute = now;
      if (status === "level1") u.timestamps.level1 = now;
      if (status === "onscene") u.timestamps.onscene = now;
    }
    return s;
  });
}

export function setUnitAssignment(unitId, { task, locations, objectives, extraUnits = [] }) {
  updateState((s) => {
    const u = findTacticalUnit(s, unitId);
    if (u) {
      u.assignment = {
        task,
        locations,
        objectives,
        extraUnits,
        startedAt: new Date().toISOString(),
        completedAt: null,
        status: "active",
      };

      if (u.status === "level1" || u.status === "enroute") {
        u.status = "onscene";
        u.timestamps.onscene = new Date().toISOString();
      }
    }
    return s;
  });
}

export function updateUnitAssignmentStatus(unitId, newStatus) {
  updateState((s) => {
    const u = findTacticalUnit(s, unitId);
    if (u && u.assignment) {
      u.assignment.status = newStatus;
      if (newStatus === "complete") {
        u.assignment.completedAt = new Date().toISOString();
      }
    }
    return s;
  });
}

export function setCommand(unitId, icName) {
  updateState((s) => {
    s.tactical.command.currentIcUnitId = unitId || "";
    s.tactical.command.icName = icName || "";
    return s;
  });
}

// --- Follow-Up ---

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
    s.tactical.followUp.generatedText = text;
    return s;
  });
}

// --- Benchmarks ---

export function addBenchmark(id, label, unitIds = []) {
  updateState((s) => {
    s.tactical.benchmarks.push({
      id,
      label,
      units: unitIds,
      completedAt: new Date().toISOString(),
    });
    return s;
  });
}
