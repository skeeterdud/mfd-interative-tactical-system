// scripts/canvas.js
// Simple drawing canvas that saves to state as a dataURL.

import { getState, setCanvasDataUrl } from "./state.js";

let isDown = false;
let lastX = 0;
let lastY = 0;

export function initCanvas(canvasId = "tacticalCanvas") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  resizeCanvasToCSS(canvas, ctx);

  // Load saved drawing (if any)
  const state = getState();
  if (state.tactical.canvasDataUrl) {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
    };
    img.src = state.tactical.canvasDataUrl;
  }

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const down = (e) => {
    isDown = true;
    const p = getPos(e);
    lastX = p.x;
    lastY = p.y;
  };

  const move = (e) => {
    if (!isDown) return;
    e.preventDefault();

    const p = getPos(e);

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,.95)";

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    lastX = p.x;
    lastY = p.y;
  };

  const up = () => {
    if (!isDown) return;
    isDown = false;

    // Save
    try {
      const dataUrl = canvas.toDataURL("image/png");
      setCanvasDataUrl(dataUrl);
    } catch {
      // ignore
    }
  };

  // Mouse
  canvas.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);

  // Touch
  canvas.addEventListener("touchstart", down, { passive: true });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", up);

  // Resize handling
  window.addEventListener("resize", () => {
    // Save old image
    const old = canvas.toDataURL("image/png");
    resizeCanvasToCSS(canvas, ctx);

    // Restore
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = old;
  });
}

export function clearCanvas(canvasId = "tacticalCanvas") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasDataUrl("");
}

function resizeCanvasToCSS(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
