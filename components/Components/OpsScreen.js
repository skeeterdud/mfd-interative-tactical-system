import { UnitsTab } from "./UnitsTab.js";

export function OpsScreen(){

  const container = document.createElement("div");
  container.className = "screen ops-screen";

  const units = UnitsTab();
  container.appendChild(units);

  const canvas = document.createElement("div");
  canvas.className = "canvas";
  container.appendChild(canvas);

  return container;
}

