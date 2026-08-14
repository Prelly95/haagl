'use strict';
/* =====================================================================
 * import.js — image import, downscale, threshold, dithering
 * ===================================================================== */

const drop = $('drop'), file = $('file');

drop.addEventListener('click', () => file.click());
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => {
  e.preventDefault(); drop.classList.remove('over');
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});
file.addEventListener('change', () => { if (file.files[0]) loadFile(file.files[0]); });

/* paste an image from the clipboard anywhere in the app */
window.addEventListener('paste', e => {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const it of items) {
    if (it.type.startsWith('image/')) {
      const f = it.getAsFile();
      if (f) { e.preventDefault(); loadFile(f); }
      return;
    }
  }
});

function loadFile(f) {
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => { srcImage = img; pushUndo(); rasterize(); };
  img.onerror = () => { URL.revokeObjectURL(url); alert('Could not read that file as an image.'); };
  img.src = url;
}

function rasterize() {
  if (!srcImage) return;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);       // transparency → background

  const iw = srcImage.width, ih = srcImage.height, fit = $('fit').value;
  if (fit === 'stretch') {
    g.drawImage(srcImage, 0, 0, W, H);
  } else {
    const s = (fit === 'cover') ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
    const dw = iw * s, dh = ih * s;
    g.drawImage(srcImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  const d = g.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = d[i * 4 + 3] / 255;
    const l = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    lum[i] = l * a + 255 * (1 - a);
  }

  const thr = +$('thr').value, inv = $('imgInv').checked;
  if ($('dith').checked) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const nv = lum[i] < thr ? 0 : 255;
      const err = lum[i] - nv;
      lum[i] = nv;
      if (x + 1 < W) lum[i + 1] += err * 7 / 16;
      if (y + 1 < H) {
        if (x > 0) lum[i + W - 1] += err * 3 / 16;
        lum[i + W] += err * 5 / 16;
        if (x + 1 < W) lum[i + W + 1] += err * 1 / 16;
      }
    }
  }
  for (let i = 0; i < W * H; i++)
    grid[i] = ((lum[i] < thr) ? 1 : 0) ^ (inv ? 1 : 0);
  refresh();
}

$('thr').addEventListener('input', () => { $('thrVal').textContent = $('thr').value; rasterize(); });
$('imgInv').addEventListener('change', rasterize);
$('dith').addEventListener('change', rasterize);
$('fit').addEventListener('change', rasterize);
