import { SetupScreen } from "./components/SetupScreen.js";
import { OpsScreen } from "./components/OpsScreen.js";

const app = document.getElementById("app");

function showSetup(){
  app.innerHTML = "";
  app.appendChild(SetupScreen(showOps));
}

function showOps(){
  app.innerHTML = "";
  app.appendChild(OpsScreen());
}

showSetup();

