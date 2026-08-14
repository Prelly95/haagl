'use strict';
/* =====================================================================
 * icons.js — icon switcher bar (cycle / add / duplicate / delete)
 * ===================================================================== */

function updateIconBar() {
  $('icLabel').innerHTML = '<b></b> · ' + (cur + 1) + '/' + icons.length;
  $('icLabel').querySelector('b').textContent = icons[cur].name;
  $('icPrev').disabled = icons.length < 2;
  $('icNext').disabled = icons.length < 2;
  $('icDel').disabled = icons.length < 2;
}

function switchIcon(i) {
  saveCur();
  loadCur((i + icons.length) % icons.length);
  refresh();
}

/* Unique name generator: icon_2, icon_3, ... */
function uniqueName(base) {
  let n = base, k = 2;
  while (icons.some(ic => ic.name === n)) n = base + '_' + k++;
  return n;
}

$('icPrev').addEventListener('click', () => switchIcon(cur - 1));
$('icNext').addEventListener('click', () => switchIcon(cur + 1));

$('icAdd').addEventListener('click', () => {
  pushUndo();
  saveCur();
  icons.push({ name: uniqueName('icon'), w: W, h: H, grid: new Uint8Array(W * H) });
  loadCur(icons.length - 1);
  refresh();
});

$('icDup').addEventListener('click', () => {
  pushUndo();
  saveCur();
  const src = icons[cur];
  icons.splice(cur + 1, 0, {
    name: uniqueName(src.name + '_copy'),
    w: src.w, h: src.h, grid: src.grid.slice(),
  });
  loadCur(cur + 1);
  refresh();
});

$('icDel').addEventListener('click', () => {
  if (icons.length < 2) return;
  pushUndo();
  icons.splice(cur, 1);
  loadCur(Math.min(cur, icons.length - 1));
  refresh();
});
