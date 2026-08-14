'use strict';
/* =====================================================================
 * state.js — application state
 *
 * The document is a list of icons; exactly one is "current" and is
 * edited through the working copy (W, H, grid, name input). All other
 * modules read/write the working copy; saveCur()/loadCur() move data
 * between it and the icons list.
 * ===================================================================== */

const $ = id => document.getElementById(id);

/* ---- icon list ---- */
let icons = [{ name: 'icon', w: 8, h: 8, grid: new Uint8Array(64) }];
let cur = 0;

/* ---- working copy of icons[cur] ---- */
let W = 8, H = 8;
let grid = new Uint8Array(W * H);   // 1 = pixel on (dark ink)

let srcImage = null;                 // last imported Image, for live re-threshold

/* Persist the working copy back into icons[cur]. */
function saveCur() {
  icons[cur].name = cName();
  icons[cur].w = W;
  icons[cur].h = H;
  icons[cur].grid = grid;
}

/* Make icons[i] the working copy and sync the inputs. */
function loadCur(i) {
  cur = Math.max(0, Math.min(icons.length - 1, i));
  const ic = icons[cur];
  W = ic.w; H = ic.h; grid = ic.grid;
  $('name').value = ic.name;
}

/* ================= undo ================= */
const undoStack = [];

function snapshot() {
  saveCur();
  return {
    cur,
    icons: icons.map(ic => ({ name: ic.name, w: ic.w, h: ic.h, grid: ic.grid.slice() })),
  };
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
}

function undo() {
  const s = undoStack.pop();
  if (!s) return;
  icons = s.icons;
  loadCur(s.cur);
  refresh();
}
