'use strict';
/* =====================================================================
 * panels.js — resizable/collapsible side panel, resizable code panel,
 * toast, copy/download
 * ===================================================================== */

/* ---- resizable code panel ---- */
const hdiv = $('hdivider');
hdiv.addEventListener('pointerdown', e => {
  e.preventDefault();
  hdiv.setPointerCapture(e.pointerId);
  hdiv.classList.add('dragging');
  const chrome = $('codepanel').offsetHeight - $('codebox').offsetHeight; // bar + handle + margins
  const move = ev => {
    const panelH = window.innerHeight - ev.clientY;
    const boxH = Math.max(60, Math.min(window.innerHeight - 240, panelH - chrome));
    $('codebox').style.height = boxH + 'px';
    draw();
  };
  hdiv.addEventListener('pointermove', move);
  hdiv.addEventListener('pointerup', () => {
    hdiv.removeEventListener('pointermove', move);
    hdiv.classList.remove('dragging');
  }, { once: true });
});

/* ---- resizable / collapsible side panel ---- */
const divider = $('divider'), app = document.querySelector('.app');
const sidePanel = document.querySelector('.side');

function applySideLayout() {
  sidePanel.classList.toggle('collapsed', sideCollapsed);
  app.style.gridTemplateColumns = sideCollapsed ? '1fr 0px 44px' : `1fr 6px ${sideW}px`;
  divider.style.pointerEvents = sideCollapsed ? 'none' : '';
  $('btnSidebar').title = sideCollapsed ? 'Open sidebar' : 'Close sidebar';
  draw();
}
$('btnSidebar').addEventListener('click', () => { sideCollapsed = !sideCollapsed; applySideLayout(); });
app.addEventListener('transitionend', e => { if (e.propertyName === 'grid-template-columns') draw(); });

divider.addEventListener('pointerdown', e => {
  if (sideCollapsed) return;
  e.preventDefault();
  divider.setPointerCapture(e.pointerId);
  divider.classList.add('dragging');
  app.classList.add('no-anim');
  const move = ev => {
    sideW = Math.max(300, Math.min(Math.max(340, window.innerWidth - 420), window.innerWidth - ev.clientX - 3));
    app.style.gridTemplateColumns = `1fr 6px ${sideW}px`;
    draw();
  };
  divider.addEventListener('pointermove', move);
  divider.addEventListener('pointerup', () => {
    divider.removeEventListener('pointermove', move);
    divider.classList.remove('dragging');
    app.classList.remove('no-anim');
  }, { once: true });
});

/* ---- toast ---- */
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1400);
}

/* ---- copy / download ---- */
$('btnCopy').addEventListener('click', async () => {
  const text = $('code').value;
  try { await navigator.clipboard.writeText(text); toast('copied to clipboard'); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
    toast('copied to clipboard');
  }
});

$('btnDl').addEventListener('click', () => {
  const blob = new Blob([$('code').value], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (icons.length > 1 ? 'icons' : sanitizeName(icons[0].name)) + '.h';
  a.click();
  URL.revokeObjectURL(a.href);
});
