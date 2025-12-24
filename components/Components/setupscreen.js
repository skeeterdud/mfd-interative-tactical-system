import { appState } from "../state.js";
import { ALL_UNITS } from "../data/units.js";

export function SetupScreen(onStartIncident){
  
  const container = document.createElement("div");
  container.className = "screen setup-screen";

  // Title
  const title = document.createElement("h2");
  title.textContent = "Incident Setup";
  container.appendChild(title);

  // Call Type
  const callWrap = document.createElement("div");
  callWrap.className = "card";
  callWrap.innerHTML = `<h3>Call Type</h3>`;
  container.appendChild(callWrap);

  ["Fire","Accident","Large Scale Event"].forEach(type => {
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.textContent = type;
    btn.onclick = () => {
      appState.callType = type;
      refresh();
    };
    callWrap.appendChild(btn);
  });

  // Battalion
  const battWrap = document.createElement("div");
  battWrap.className = "card";
  battWrap.innerHTML = `<h3>Battalion</h3>`;
  container.appendChild(battWrap);

  ["BC1","BC2"].forEach(b => {
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.textContent = b;
    btn.onclick = () => {
      appState.battalion = b;
      refresh();
    };
    battWrap.appendChild(btn);
  });

  // Units
  const unitWrap = document.createElement("div");
  unitWrap.className = "card";
  unitWrap.innerHTML = `<h3>Units Responding</h3>`;
  container.appendChild(unitWrap);

  ALL_UNITS.forEach(u => {
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.textContent = u;
    btn.onclick = () => toggleUnit(u);
    unitWrap.appendChild(btn);
  });

  // Start Button
  const startBtn = document.createElement("button");
  startBtn.className = "primary start-btn";
  startBtn.textContent = "Start Incident";
  startBtn.onclick = () => onStartIncident();
  container.appendChild(startBtn);

  function toggleUnit(u){
    const list = appState.unitsResponding;
    if(list.includes(u)){
      appState.unitsResponding = list.filter(x => x!==u);
    } else {
      appState.unitsResponding.push(u);
    }
    refresh();
  }

  function refresh(){
    container.querySelectorAll(".pill").forEach(btn=>{
      btn.classList.remove("selected");
      if(btn.textContent===appState.callType) btn.classList.add("selected");
      if(btn.textContent===appState.battalion) btn.classList.add("selected");
      if(appState.unitsResponding.includes(btn.textContent)) btn.classList.add("selected");
    });
  }

  refresh();
  return container;
}
