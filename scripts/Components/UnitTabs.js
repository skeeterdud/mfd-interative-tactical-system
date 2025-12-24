import { appState } from "../state.js";

export function UnitsTab(){

  const wrap = document.createElement("div");
  wrap.className = "units-tab";

  const header = document.createElement("div");
  header.className = "units-header";
  header.textContent = "UNITS";
  wrap.appendChild(header);

  const drawer = document.createElement("div");
  drawer.className = "units-drawer";
  wrap.appendChild(drawer);

  header.onclick = () => wrap.classList.toggle("open");

  function render(){
    drawer.innerHTML = "";

    const enroute = document.createElement("div");
    enroute.innerHTML = `<h4>🚒 En Route</h4>`;
    drawer.appendChild(enroute);

    appState.unitsResponding.forEach(u=>{
      const pill = document.createElement("button");
      pill.className = "pill";
      pill.textContent = u;
      enroute.appendChild(pill);
    });
  }

  render();
  return wrap;
}
