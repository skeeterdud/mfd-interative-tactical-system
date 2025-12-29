// scripts/canvas.js
// Drawing canvas helper for Screen C (stores as dataUrl in state)

import { getState, setCanvasDataUrl } from "./state.js";

let canvasEl = null;
let ctx = null;

let drawing = false;
let lastX = 0;
let lastY = 0;

// Call after Screen C renders and the canvas exists in the DOM
export function initCanvas(canvasId = "tacticalCanvas") {
  canvasEl = document.getElementById(canvasId);
  if (!canvasEl) return;

  ctx = canvasEl.getContext("2d");
  if (!ctx) return;

  // Resize to match element size (important for crisp drawing)
  resizeToDisplaySize();

  // Restore saved drawing (if any)
  restoreFromState();

  // Pointer events (works for mouse + touch + stylus)
  canvasEl.addEventListener("pointerdown", onPointerDown);
  canvasEl.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  // Prevent scroll/zoom gestures from hijacking drawing on touch devices
  canvasEl.style.touchAction = "none";

  // If window resizes, keep drawing scaled-ish
  window.addEventListener("resize", () => {
    const old = canvasEl.toDataURL("image/png");
    resizeToDisplaySize();
    redrawFromDataUrl(old);
    saveToState(); // keep state consistent with new size
  });
}

export function clearCanvas() {
  if (!canvasEl || !ctx) return;
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  saveToState();
}

export function saveToState() {
  if (!canvasEl) return;
  const dataUrl = canvasEl.toDataURL("image/png");
  setCanvasDataUrl(dataUrl);
}

function restoreFromState() {
  const state = getState();
  const dataUrl = state?.tactical?.canvas?.dataUrl || "";
  if (dataUrl) redrawFromDataUrl(dataUrl);
}

function resizeToDisplaySize() {
  if (!canvasEl) return;

  const rect = canvasEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));

  if (canvasEl.width !== w) canvasEl.width = w;
  if (canvasEl.height !== h) canvasEl.height = h;

  // Default pen settings
  ctx.lineWidth = 3 * dpr;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#e9eefc";
}

function getCanvasPoint(evt) {
  const rect = canvasEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (evt.clientX - rect.left) * dpr;
  const y = (evt.clientY - rect.top) * dpr;
  return { x, y };
}

function onPointerDown(evt) {
  if (!canvasEl || !ctx) return;
  drawing = true;
  canvasEl.setPointerCapture?.(evt.pointerId);

  const p = getCanvasPoint(evt);
  lastX = p.x;
  lastY = p.y;
}

function onPointerMove(evt) {
  if (!drawing || !canvasEl || !ctx) return;

  const p = getCanvasPoint(evt);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();

  lastX = p.x;
  lastY = p.y;
}

function onPointerUp() {
  if (!drawing) return;
  drawing = false;
  saveToState();
}

function redrawFromDataUrl(dataUrl) {
  if (!canvasEl || !ctx) return;

  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
  };
  img.src = dataUrl;
}
