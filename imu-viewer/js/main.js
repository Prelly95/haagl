// Boot, render loop, UI events

function frame() {
  draw3D();
  drawGraph(accelCanvas, ['ax','ay','az'], 20);
  drawGraph(gyroCanvas,  ['gx','gy','gz'], 360);
  requestAnimationFrame(frame);
}

const ro = new ResizeObserver(() => {
  resize3D();
  resizeGraph(accelCanvas);
  resizeGraph(gyroCanvas);
});
ro.observe(c3);
ro.observe(accelCanvas);
ro.observe(gyroCanvas);

// ── UI events ──────────────────────────────────────────
document.getElementById('btnPersp').addEventListener('click', () => {
  perspMode = !perspMode;
  document.getElementById('btnPersp').textContent = perspMode ? 'ortho' : 'persp';
});

document.getElementById('btnNoSignalConnect').addEventListener('click', () => {
  document.getElementById('connModal').removeAttribute('hidden');
  document.getElementById('wsUrl').focus();
});

document.getElementById('btnConnect').addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    disconnectWS();
  } else {
    document.getElementById('connModal').removeAttribute('hidden');
    document.getElementById('wsUrl').focus();
  }
});

document.getElementById('btnDoConnect').addEventListener('click', () => {
  const url = document.getElementById('wsUrl').value.trim();
  document.getElementById('connModal').setAttribute('hidden', '');
  connectWS(url);
});

document.getElementById('btnModalClose').addEventListener('click', () => {
  document.getElementById('connModal').setAttribute('hidden', '');
});

document.getElementById('connModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.setAttribute('hidden', '');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('connModal').setAttribute('hidden', '');
});

// ── boot ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  resize3D();
  resizeGraph(accelCanvas);
  resizeGraph(gyroCanvas);
  requestAnimationFrame(frame);

  const defaultUrl = document.getElementById('wsUrl').value;
  setStatus('connecting', 'connecting…');
  try {
    ws = new WebSocket(defaultUrl);
    ws.addEventListener('open', () => {
      setStatus('live', `live — ${defaultUrl}`);
      document.getElementById('noSignal').setAttribute('hidden', '');
    });
    ws.addEventListener('close', () => {
      setStatus('err', 'disconnected');
      document.getElementById('noSignal').removeAttribute('hidden');
    });
    ws.addEventListener('error', () => {
      setStatus('err', 'no signal');
      document.getElementById('noSignal').removeAttribute('hidden');
      document.getElementById('connModal').removeAttribute('hidden');
    });
    ws.addEventListener('message', ev => {
      try { ingestFrame(JSON.parse(ev.data)); } catch { /* skip malformed */ }
    });
  } catch {
    setStatus('err', 'no signal');
    document.getElementById('noSignal').removeAttribute('hidden');
    document.getElementById('connModal').removeAttribute('hidden');
  }
});
