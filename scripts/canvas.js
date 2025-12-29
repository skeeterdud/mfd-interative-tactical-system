// scripts/canvas.js
// Smartboard-friendly drawing canvas (pen/eraser/clear) using pointer events.

import { setCanvasDataUrl } from "./state.js";

let canvas = null;
let ctx = null;

let drawing = false;
let tool = "pen"; // "pen" | "eraser"
let last = { x: 0, y: 0 };

// Basic settings (keep simple; no color picking unless you want it later)
const PEN_WIDTH = 4;
const ERASER_WIDTH = 20;

export function initCanvas(canvasEl) {
  canvas = canvasEl;
  if (!canvas) return;

  ctx = canvas.getContext("2d", { willReadFrequently: false });

  // Size to container
  resizeToCSS();

  // Pointer events
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onUp);

  // Resize observer
  const ro = new ResizeObserver(() => resizeToCSS(true));
  ro.observe(canvas.parentElement || canvas);

  // If user rotates / resizes window
  window.addEventListener("resize", () => resizeToCSS(true));
}

export function setCanvasTool(nextTool) {
  tool = nextTool === "eraser" ? "eraser" : "pen";
}

export function clearCanvas() {
  if (!ctx || !canvas) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  snapshotToState();
}

export function snapshotToState() {
  if (!canvas) return;
  try {
    const dataUrl = canvas.toDataURL("image/png");
    setCanvasDataUrl(dataUrl);
  } catch {
    // ignore
  }
}

function resizeToCSS(preserve = false) {
  if (!canvas || !ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // Preserve existing drawing by copying to temp canvas
  let old = null;
  if (preserve && canvas.width && canvas.height) {
    old = document.createElement("canvas");
    old.width = canvas.width;
    old.height = canvas.height;
    const octx = old.getContext("2d");
    octx.drawImage(canvas, 0, 0);
  }

  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // restore old drawing
  if (old) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(old, 0, 0, old.width, old.height, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function canvasPointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y };
}

function onDown(e) {
  if (!ctx) return;
  drawing = true;
  canvas.setPointerCapture(e.pointerId);

  const p = canvasPointFromEvent(e);
  last = p;

  // Start a dot if needed
  strokeLine(p, p);
}

function onMove(e) {
  if (!drawing || !ctx) return;

  const p = canvasPointFromEvent(e);
  strokeLine(last, p);
  last = p;
}

function onUp(e) {
  if (!drawing) return;
  drawing = false;

  // save snapshot for printing
  snapshotToState();
}

function strokeLine(a, b) {
  if (!ctx) return;

  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = ERASER_WIDTH;
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = PEN_WIDTH;
    ctx.strokeStyle = "#ffffff";
  }

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
