// =========================
// scripts/state.js
// =========================
const listeners = new Set();

export const ALL_UNITS = [
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
  { id: "MED1", label: "Med 1" },
  { id: "MED2", label: "Med 2" },
  { id: "MED3", label: "Med 3" },
  { id: "MED5", label: "Med 5" },
  { id: "MED6", label: "Med 6" },
  { id: "MED7", label: "Med 7" },
  { id: "MED9", label: "Med 9" },
  { id: "MED10", label: "Med 10" },
  { id: "MED11", label: "Med 11" },
  { id: "EMS1", label: "EMS 1" },
];

const defaultState = () => ({
  screen: "incident",
  incident: {
    battalion: [],            // multi-select
    selectedUnitIds: [],      // multi-select
    callType: "Fire",
  },
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
  },
  tactical: {
    units: [],
    command: { currentIcUnitId: "", icName: "" },
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

export function getState(){ return state; }
export function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
function emit(){ for (const fn of listeners) fn(state); }

export function setScreen(screen){
  state = { ...state, screen };
  emit();
}

export function setIncidentField(field, value){
  state = { ...state, incident: { ...state.incident, [field]: value } };
  emit();
}

export function toggleIncidentUnit(unitId){
  const cur = Array.isArray(state.incident.selectedUnitIds) ? state.incident.selectedUnitIds : [];
  const next = cur.includes(unitId) ? cur.filter(x => x !== unitId) : [...cur, unitId];
  state = { ...state, incident: { ...state.incident, selectedUnitIds: next } };
  emit();
}

export function setIrrField(field, value){
  state = { ...state, irr: { ...state.irr, [field]: value } };
  emit();
}

export function toggleIrrArrayField(field, value){
  const cur = Array.isArray(state.irr[field]) ? state.irr[field] : [];
  const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
  setIrrField(field, next);
}

/* Screen C helpers */
export function setUnitStatus(unitId, status){
  const nextUnits = (state.tactical.units || []).map(u => u.id === unitId ? { ...u, status } : u);
  state = { ...state, tactical: { ...state.tactical, units: nextUnits } };
  emit();
}

export function setCommand(unitId, icName){
  state = {
    ...state,
    tactical: {
      ...state.tactical,
      command: { ...state.tactical.command, currentIcUnitId: unitId, icName },
    },
  };
  emit();
}

export function setFollowUpField(field, value){
  state = {
    ...state,
    tactical: {
      ...state.tactical,
      followUp: { ...state.tactical.followUp, [field]: value },
    },
  };
  emit();
}

export function setFollowUpGeneratedText(text){
  state = {
    ...state,
    tactical: {
      ...state.tactical,
      followUp: { ...state.tactical.followUp, generatedText: text },
    },
  };
  emit();
}

export function addBenchmark(id, label, units = []){
  const exists = (state.tactical.benchmarks || []).some(b => b.id === id);
  if (exists) return;
  const next = [...(state.tactical.benchmarks || []), { id, label, units, completedAt: new Date().toISOString() }];
  state = { ...state, tactical: { ...state.tactical, benchmarks: next } };
  emit();
}

/* Sync tactical.units from incident selection whenever entering Screen C */
export function syncTacticalUnitsFromIncident(){
  const selected = Array.isArray(state.incident.selectedUnitIds) ? state.incident.selectedUnitIds : [];
  const wanted = selected
    .map(id => ALL_UNITS.find(u => u.id === id))
    .filter(Boolean)
    .map(u => ({ id: u.id, label: u.label, status: "available" }));

  state = {
    ...state,
    tactical: {
      ...state.tactical,
      units: wanted,
      command: {
        ...state.tactical.command,
        currentIcUnitId: wanted.some(u => u.id === state.tactical.command.currentIcUnitId)
          ? state.tactical.command.currentIcUnitId
          : "",
      },
    },
  };
  emit();
}

export function resetAll(){
  state = defaultState();
  emit();
}
