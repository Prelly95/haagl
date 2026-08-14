'use strict';
/* =====================================================================
 * canvas.js — LCD editor rendering + pixel painting
 * ===================================================================== */

const cv = $('editor'), ctx = cv.getContext('2d');

let sideW = 380, sideCollapsed = false;   // layout state consumed by cellSize()

function cellSize() {
  const codeH = $('codepanel').offsetHeight;
  const availW = Math.min(window.innerWidth - (sideCollapsed ? 0 : sideW) - 110, 900);
  const availH = window.innerHeight - 215 - codeH;   // header + toolbar + iconbar + status + bezel chrome
  const maxSide = Math.max(220, Math.min(availW, availH));
  return Math.max(4, Math.min(72, Math.floor(maxSide / Math.max(W, H))));
}

function draw() {
  const cs = cellSize(), dpr = window.devicePixelRatio || 1;
  cv.style.width = (W * cs) + 'px';
  cv.style.height = (H * cs) + 'px';
  cv.width = W * cs * dpr;
  cv.height = H * cs * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const styles = getComputedStyle(document.documentElement);
  const cOn = styles.getPropertyValue('--lcd-on').trim();
  const cGhost = styles.getPropertyValue('--lcd-ghost').trim();

  ctx.clearRect(0, 0, W * cs, H * cs);
  const gap = cs >= 10 ? Math.max(1, Math.round(cs * 0.01)) : 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      ctx.fillStyle = grid[y * W + x] ? cOn : cGhost;
      ctx.globalAlpha = grid[y * W + x] ? 1 : 0.35;   // unlit segments faintly visible
      ctx.fillRect(x * cs + gap, y * cs + gap, cs - gap * 2, cs - gap * 2);
    }
  }
  ctx.globalAlpha = 1;
}

function refresh() {
  draw();
  $('stSize').textContent = W + '×' + H;
  $('stOn').textContent = grid.reduce((a, b) => a + b, 0);
  updateIconBar();
  genCode();
}

/* ================= painting ================= */
let painting = false, paintVal = 1;

function cellFromEvent(e) {
  const r = cv.getBoundingClientRect();
  const cs = r.width / W;
  const x = Math.floor((e.clientX - r.left) / cs);
  const y = Math.floor((e.clientY - r.top) / cs);
  return (x >= 0 && x < W && y >= 0 && y < H) ? { x, y } : null;
}

cv.addEventListener('pointerdown', e => {
  const c = cellFromEvent(e); if (!c) return;
  pushUndo();
  painting = true;
  paintVal = grid[c.y * W + c.x] ? 0 : 1;
  grid[c.y * W + c.x] = paintVal;
  cv.setPointerCapture(e.pointerId);
  refresh();
});

cv.addEventListener('pointermove', e => {
  const c = cellFromEvent(e);
  $('stPos').innerHTML = c ? '@ <b>' + c.x + ',' + c.y + '</b>' : '';
  if (!painting || !c) return;
  if (grid[c.y * W + c.x] !== paintVal) { grid[c.y * W + c.x] = paintVal; refresh(); }
});

cv.addEventListener('pointerleave', () => $('stPos').textContent = '');
window.addEventListener('pointerup', () => painting = false);
