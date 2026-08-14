'use strict';
/* =====================================================================
 * transforms.js — grid transforms, canvas resize, keyboard shortcuts
 * ===================================================================== */

const ops = {
  rotcw() {
    const nW = H, nH = W, n = new Uint8Array(nW * nH);
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++)
      n[y * nW + x] = grid[(H - 1 - x) * W + y];
    W = nW; H = nH; grid = n;
  },
  rotccw() {
    const nW = H, nH = W, n = new Uint8Array(nW * nH);
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++)
      n[y * nW + x] = grid[x * W + (W - 1 - y)];
    W = nW; H = nH; grid = n;
  },
  fliph() {
    const n = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      n[y * W + x] = grid[y * W + (W - 1 - x)];
    grid = n;
  },
  flipv() {
    const n = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      n[y * W + x] = grid[(H - 1 - y) * W + x];
    grid = n;
  },
  shl() { shift(-1, 0) }, shr() { shift(1, 0) },
  shu() { shift(0, -1) }, shd() { shift(0, 1) },
  invert() { for (let i = 0; i < grid.length; i++) grid[i] ^= 1; },
  clear() { grid.fill(0); },
};

function shift(dx, dy) {
  const n = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    n[((y + dy + H) % H) * W + ((x + dx + W) % W)] = grid[y * W + x];
  grid = n;
}

document.querySelectorAll('.toolbar button').forEach(b => {
  b.addEventListener('click', () => {
    const op = b.dataset.op;
    if (op === 'undo') { undo(); return; }
    pushUndo();
    ops[op]();
    refresh();
  });
});

window.addEventListener('keydown', e => {
  if (e.target === $('code')) return;   // native text undo inside the code editor
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
});
