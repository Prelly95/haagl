// WebSocket connection management

let ws = null;

function connectWS(url) {
  if (ws) { ws.close(); ws = null; }
  setStatus('connecting', 'connecting…');
  try {
    ws = new WebSocket(url);
  } catch {
    setStatus('err', 'invalid URL');
    return;
  }
  ws.addEventListener('open', () => {
    setStatus('live', `live — ${url}`);
    document.getElementById('noSignal').setAttribute('hidden', '');
  });
  ws.addEventListener('close', () => {
    setStatus('err', 'disconnected');
    document.getElementById('noSignal').removeAttribute('hidden');
  });
  ws.addEventListener('error', () => {
    setStatus('err', 'connection failed');
    document.getElementById('noSignal').removeAttribute('hidden');
  });
  ws.addEventListener('message', ev => {
    try { ingestFrame(JSON.parse(ev.data)); } catch { /* skip malformed */ }
  });
}

function disconnectWS() {
  if (ws) { ws.close(); ws = null; }
  setStatus('', 'not connected');
  document.getElementById('noSignal').removeAttribute('hidden');
}

function setStatus(state, label) {
  const dot = document.getElementById('connDot');
  dot.className = 'conn-dot';
  if (state === 'live') dot.classList.add('live');
  if (state === 'err')  dot.classList.add('err');
  document.getElementById('connLabel').textContent = label;
  document.getElementById('statusMsg').textContent = label;

  const btn = document.getElementById('btnConnect');
  if (state === 'live') {
    btn.textContent = 'disconnect';
    btn.classList.add('active');
  } else {
    btn.textContent = 'connect';
    btn.classList.remove('active');
  }
}
