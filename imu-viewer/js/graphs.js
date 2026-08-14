// Scrolling time-series graphs

const accelCanvas = document.getElementById('accelGraph');
const gyroCanvas  = document.getElementById('gyroGraph');

function resizeGraph(canvas) {
  canvas.width  = canvas.offsetWidth  * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
}

function drawGraph(canvas, keys, rangeMax) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio;
  const mid = h * 0.5;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = C.line;
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = C.muted;
  ctx.font      = `${9*dpr}px monospace`;
  ctx.fillText(`+${rangeMax}`, 4*dpr, 12*dpr);
  ctx.fillText(`-${rangeMax}`, 4*dpr, h - 4*dpr);

  const colors = [C.x, C.y, C.z];
  const { head, count } = hist;

  keys.forEach((key, ki) => {
    if (count < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = colors[ki];
    ctx.lineWidth   = 1.5 * dpr;
    for (let i = 0; i < count; i++) {
      const idx = (head - count + i + HISTORY) % HISTORY;
      const val = hist[key][idx];
      const x   = (i / (HISTORY - 1)) * w;
      const y   = mid - (val / rangeMax) * mid * 0.9;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}
