'use strict';
/* =====================================================================
 * codegen.js — bit packing, multi-icon header generation, highlighting,
 * and header parsing (applied with Ctrl+S in the code panel)
 * ===================================================================== */

/* ---- packing (per icon) ---- */
function packIconBytes(ic) {
  const msb = $('bitorder').value === 'msb';
  const bytes = [];
  if ($('pack').value === 'h') {
    const bpr = Math.ceil(ic.w / 8);
    for (let y = 0; y < ic.h; y++)
      for (let b = 0; b < bpr; b++) {
        let v = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = b * 8 + bit;
          if (x < ic.w && ic.grid[y * ic.w + x]) v |= 1 << (msb ? 7 - bit : bit);
        }
        bytes.push(v);
      }
  } else {
    const pages = Math.ceil(ic.h / 8);
    for (let p = 0; p < pages; p++)
      for (let x = 0; x < ic.w; x++) {
        let v = 0;
        for (let bit = 0; bit < 8; bit++) {
          const y = p * 8 + bit;
          if (y < ic.h && ic.grid[y * ic.w + x]) v |= 1 << (msb ? 7 - bit : bit);
        }
        bytes.push(v);
      }
  }
  return bytes;
}

function sanitizeName(raw) {
  let n = String(raw).replace(/[^A-Za-z0-9_]/g, '_');
  if (!n || /^[0-9]/.test(n)) n = '_' + n;
  return n;
}

function cName() {
  return sanitizeName($('name').value);
}

/* ---- header generation (all icons, one file) ---- */
function guardName() {
  return icons.length === 1
    ? '_ICON_' + sanitizeName(icons[0].name).toUpperCase()
    : '_ICONS_H';
}

function headerText() {
  saveCur();   // include live edits of the current icon
  const packH = $('pack').value === 'h';
  const msb = $('bitorder').value === 'msb';
  const lines = [];

  lines.push(`#ifndef ${guardName()}`);
  lines.push(`#define ${guardName()}`);
  lines.push('');
  lines.push('#include "../icon_manager.h"');
  lines.push('');
  lines.push(`// ${icons.length} icon${icons.length > 1 ? 's' : ''}, 1 bpp — generated with Icon Creator`);
  lines.push(`// packing: ${packH
    ? 'horizontal, row-major, ' + (msb ? 'MSB' : 'LSB') + ' = leftmost pixel'
    : 'vertical, 8-px pages (SSD1306 style), ' + (msb ? 'bit7' : 'bit0') + ' = top pixel'}`);
  lines.push('');

  for (const ic of icons) {
    const name = sanitizeName(ic.name);
    const bytes = packIconBytes(ic);

    lines.push(`// ${name} — ${ic.w}x${ic.h} px, ${bytes.length} bytes`);

    lines.push(`static unsigned char ${name}_data[] = {`);
    const byteLines = [];
    for (let i = 0; i < bytes.length; i += 12) {
      byteLines.push('    ' + bytes.slice(i, i + 12)
        .map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0'))
        .join(', ') + (i + 12 < bytes.length ? ',' : ''));
    }
    byteLines[byteLines.length - 1] += '};';
    lines.push(...byteLines);
    lines.push('');
    lines.push(`inline constexpr BitmapData ${name}_bitmap = {`);
    lines.push(`    .width = ${ic.w},`);
    lines.push(`    .height = ${ic.h},`);
    lines.push(`    .pixel_data = ${name}_data,`);
    lines.push('};');
    lines.push('');
  }
  lines.push('#endif');
  lines.push('');
  return lines.join('\n');
}

/* ---- highlighting ---- */
let editingCode = false;   // true while a change originated in the textarea

function highlight() {
  const esc = $('code').value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  $('hl').innerHTML = esc
    .replace(/^(\/\/.*)$/gm, '<span class="cm">$1</span>')
    .replace(/\b(ifndef|define|endif|include|pragma|once|inline|constexpr|static|const|unsigned|char|int|uint8_t|BitmapData)\b/g, '<span class="kw">$1</span>')
    .replace(/\b(0[xX][0-9a-fA-F]+|\d+)\b/g, '<span class="num">$1</span>')
    + '\n';
}

function genCode() {
  saveCur();
  $('stBytes').textContent = icons.reduce((a, ic) => a + packIconBytes(ic).length, 0);
  if (!editingCode) {
    $('code').value = headerText();
    setParseError(null);
    setDirty(false);
  }
  highlight();
}

/* ---- dirty / error state ---- */
let codeDirty = false;

function setDirty(d) {
  codeDirty = d;
  $('codebox').classList.toggle('dirty', d);
  $('codeHint').textContent = d ? 'unsaved — Ctrl+S to apply' : '';
}

function setParseError(msg) {
  $('parseErr').textContent = msg ? '✗ ' + msg : '';
  $('codebox').classList.toggle('bad', !!msg);
}

function applyCode() {
  const err = parseHeader($('code').value);
  setParseError(err);
  if (!err) { setDirty(false); toast('applied to canvas'); }
}

/* ---- header text → icons (multi-array) ----
 * Every `<name>_data[] = {...}` byte array (unsigned char / uint8_t /
 * uchar, optionally static) becomes an icon named <name>. Dimensions are
 * read from the matching `BitmapData <name>_bitmap` initializer
 * (.width / .height); legacy `<name>_width/_height` constants also work.
 * If neither exists, a same-named icon already loaded keeps its size.
 *
 * The struct dimensions are authoritative: the byte array is decoded to
 * fit them — short data is zero-padded, excess bytes are dropped — and
 * the header is regenerated so the array always matches .width/.height.
 * Decoding uses the packing/bit-order currently selected in the panel. */
function parseHeader(text) {
  const packH = $('pack').value === 'h';
  const msb = $('bitorder').value === 'msb';
  const re = /(?:static\s+)?(?:const\s+)?(?:unsigned\s+char|uint8_t|uchar)\s+(\w+)\s*\[\s*\]\s*=\s*\{([\s\S]*?)\}/g;
  const found = [];
  let adjusted = false;
  let m;

  while ((m = re.exec(text))) {
    const name = m[1].replace(/_data$/, '');
    const nums = m[2].match(/0[xX][0-9a-fA-F]+|\b\d+\b/g) || [];
    const bytes = nums.map(s => parseInt(s) & 0xFF);

    let w, h;
    const structM = text.match(new RegExp('\\b' + name + '_bitmap\\s*=\\s*\\{([\\s\\S]*?)\\}'));
    if (structM) {
      const wM = structM[1].match(/\.width\s*=\s*(\d+)/);
      const hM = structM[1].match(/\.height\s*=\s*(\d+)/);
      if (wM && hM) { w = +wM[1]; h = +hM[1]; }
    }
    if (w === undefined) {                              // legacy constants
      const wM = text.match(new RegExp('\\b' + name + '_width\\s*=\\s*(\\d+)'));
      const hM = text.match(new RegExp('\\b' + name + '_height\\s*=\\s*(\\d+)'));
      if (wM && hM) { w = +wM[1]; h = +hM[1]; }
    }
    if (w === undefined) {                              // same-named icon
      const ex = icons.find(ic => ic.name === name);
      if (!ex) return `cannot size "${name}" — add a ${name}_bitmap struct with .width/.height`;
      w = ex.w; h = ex.h;
    }
    if (w < 1 || w > 128 || h < 1 || h > 128)
      return `"${name}": size out of range (1\u2013128)`;

    // dims define the array: decode what's there, zero-pad or drop the rest
    const expected = packH ? Math.ceil(w / 8) * h : w * Math.ceil(h / 8);
    if (bytes.length !== expected) adjusted = true;

    const g = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const idx = packH ? y * Math.ceil(w / 8) + (x >> 3)
          : (y >> 3) * w + x;
        const b = idx < bytes.length ? bytes[idx] : 0;
        const bit = packH ? (msb ? 7 - (x & 7) : x & 7)
          : (msb ? 7 - (y & 7) : y & 7);
        g[y * w + x] = (b >> bit) & 1;
      }
    found.push({ name, w, h, grid: g });
  }

  if (!found.length) return 'no array literals found';

  pushUndo();
  icons = found;
  srcImage = null;             // manual edit takes over from any imported image
  loadCur(Math.min(cur, icons.length - 1));
  if (adjusted) {
    refresh();                 // regenerate the header so arrays match dims
    toast('array data resized to match .width/.height');
  } else {
    editingCode = true;        // dims and data agree — keep the user's text
    refresh();
    editingCode = false;
  }
  return null;
}

/* ---- code panel events ---- */
$('code').addEventListener('input', () => {
  highlight();
  setParseError(null);
  setDirty(true);
});
$('code').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();          // keep the browser's save dialog out of it
    applyCode();
  }
});
$('code').addEventListener('scroll', () => {
  $('hl').scrollTop = $('code').scrollTop;
  $('hl').scrollLeft = $('code').scrollLeft;
});

$('name').addEventListener('input', () => { saveCur(); updateIconBar(); genCode(); });
['pack', 'bitorder'].forEach(id => $(id).addEventListener('input', genCode));
