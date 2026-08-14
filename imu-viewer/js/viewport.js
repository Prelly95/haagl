// 3D viewport: camera orbit, projection, drawing

const CS = getComputedStyle(document.documentElement);
const C = {
  bg:     CS.getPropertyValue('--bg').trim(),
  line:   CS.getPropertyValue('--line').trim(),
  muted:  CS.getPropertyValue('--muted').trim(),
  accent: CS.getPropertyValue('--accent').trim(),
  x:      CS.getPropertyValue('--ax-x').trim(),
  y:      CS.getPropertyValue('--ax-y').trim(),
  z:      CS.getPropertyValue('--ax-z').trim(),
};

let camAz      = -0.55;
let camEl      =  0.38;
let perspMode  = false;
const PERSP_D  = 4.5;   // camera distance in world units for perspective
let drag       = null;

let handleWorld = null;
let cursorCSS   = null;

const c3   = document.getElementById('imuCanvas');
const ctx3 = c3.getContext('2d');

// ── camera ────────────────────────────────────────────
function camTransform(v) {
  const ca = Math.cos(camAz), sa = Math.sin(camAz);
  const x1 =  v[0]*ca + v[2]*sa;
  const y1 =  v[1];
  const z1 = -v[0]*sa + v[2]*ca;
  const ce = Math.cos(camEl), se = Math.sin(camEl);
  const y2 = y1*ce - z1*se;
  const z2 = y1*se + z1*ce;
  return [x1, y2, z2];
}

function project(v, cx, cy, scale) {
  const [px, py, pz] = camTransform(v);
  if (!perspMode) return [cx + px * scale, cy - py * scale];
  // camera sits at cam-Z = +PERSP_D looking toward -Z; near objects have larger pz
  const w = PERSP_D / (PERSP_D - pz);
  return [cx + px * scale * w, cy - py * scale * w];
}

function projectCSS(v, cx, cy, scale) {
  const [px, py, pz] = camTransform(v);
  if (!perspMode) return [cx + px * scale, cy - py * scale];
  const w = PERSP_D / (PERSP_D - pz);
  return [cx + px * scale * w, cy - py * scale * w];
}

function unprojectToPlane(mx, my) {
  const w = c3.offsetWidth, h = c3.offsetHeight;
  const cx = w * 0.5, cy = h * 0.5;
  const scale = Math.min(w, h) * 0.28;

  const camX = (mx - cx) / scale;
  const camY = (cy - my) / scale;

  const ca = Math.cos(-camAz), sa = Math.sin(-camAz);
  const ce = Math.cos(-camEl), se = Math.sin(-camEl);

  function invRot(v) {
    const y1 =  v[1]*ce - v[2]*se;
    const z1 =  v[1]*se + v[2]*ce;
    const v2 = [v[0], y1, z1];
    return [v2[0]*ca + v2[2]*sa, v2[1], -v2[0]*sa + v2[2]*ca];
  }

  let origin, dir;
  if (!perspMode) {
    // ortho: parallel ray from screen point in -Z direction
    origin = invRot([camX, camY, 0]);
    dir    = invRot([0, 0, 1]);
  } else {
    // perspective: ray from camera eye through screen point
    // eye is at cam-Z = +PERSP_D; projection plane is at cam-Z = 0
    // so direction in camera space = (camX, camY, 0) - (0, 0, PERSP_D) = (camX, camY, -PERSP_D)
    origin = invRot([0, 0, PERSP_D]);
    const rawDir = invRot([camX, camY, -PERSP_D]);
    const dlen = Math.sqrt(rawDir[0]*rawDir[0] + rawDir[1]*rawDir[1] + rawDir[2]*rawDir[2]);
    dir = [rawDir[0]/dlen, rawDir[1]/dlen, rawDir[2]/dlen];
  }

  if (Math.abs(dir[1]) < 1e-6) return null;
  const t  = -origin[1] / dir[1];
  if (t < 0) return null;   // plane is behind the camera
  const wx = origin[0] + t * dir[0];
  const wz = origin[2] + t * dir[2];

  const G = 2.0;
  if (wx < -G || wx > G || wz < -G || wz > G) return null;
  return [wx, 0, wz];
}

const DEFAULT_HANDLE = [2, 0, 2];
const DEFAULT_HANDLE_HIT_R = 24; // CSS px

// ── pointer events ────────────────────────────────────
c3.addEventListener('pointerdown', e => {
  const rect    = c3.getBoundingClientRect();
  const mx      = e.clientX - rect.left;
  const my      = e.clientY - rect.top;
  const scaleCSS = Math.min(c3.offsetWidth, c3.offsetHeight) * 0.28;
  const dhp     = projectCSS(DEFAULT_HANDLE, c3.offsetWidth * 0.5, c3.offsetHeight * 0.5, scaleCSS);
  const distToDefault = Math.hypot(mx - dhp[0], my - dhp[1]);

  // always allow grab via the default handle corner
  const hit = distToDefault <= DEFAULT_HANDLE_HIT_R
    ? DEFAULT_HANDLE
    : unprojectToPlane(mx, my);
  if (!hit) return;

  handleWorld = hit;
  cursorCSS   = { x: mx, y: my };
  drag = { startClientX: e.clientX, startClientY: e.clientY, az: camAz, el: camEl };
  c3.setPointerCapture(e.pointerId);
  c3.classList.add('dragging');
  e.preventDefault();
});

c3.addEventListener('pointermove', e => {
  if (!drag) return;
  const rect = c3.getBoundingClientRect();
  cursorCSS = { x: e.clientX - rect.left, y: e.clientY - rect.top };

  const scaleCSS = Math.min(c3.offsetWidth, c3.offsetHeight) * 0.28;
  const handleR  = Math.hypot(handleWorld[0], handleWorld[2]) || 1;
  const divisor  = handleR * scaleCSS;
  const dx = e.clientX - drag.startClientX;
  const dy = e.clientY - drag.startClientY;
  camAz = drag.az + dx / divisor;
  camEl = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, drag.el + dy / divisor));
});

c3.addEventListener('pointerup', () => {
  drag = null; cursorCSS = null; handleWorld = null;
  c3.classList.remove('dragging');
});
c3.addEventListener('pointercancel', () => {
  drag = null; cursorCSS = null; handleWorld = null;
  c3.classList.remove('dragging');
});

// ── drawing helpers ───────────────────────────────────
function resize3D() {
  c3.width  = c3.offsetWidth  * devicePixelRatio;
  c3.height = c3.offsetHeight * devicePixelRatio;
}

function quatRotate(qw, qx, qy, qz, v) {
  const ux = qy*v[2] - qz*v[1];
  const uy = qz*v[0] - qx*v[2];
  const uz = qx*v[1] - qy*v[0];
  return [
    v[0] + 2*qw*ux + 2*(qy*uz - qz*uy),
    v[1] + 2*qw*uy + 2*(qz*ux - qx*uz),
    v[2] + 2*qw*uz + 2*(qx*uy - qy*ux),
  ];
}

function drawArrow(cx, cy, dir, color, label, scale) {
  const tip  = project(dir, cx, cy, scale);
  const base = project([0, 0, 0], cx, cy, scale);
  const dx = tip[0] - base[0], dy = tip[1] - base[1];
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len < 2) return;
  const ux = dx/len, uy = dy/len;
  const hw = scale * 0.12, hl = scale * 0.22;
  const dpr = devicePixelRatio;

  ctx3.beginPath();
  ctx3.moveTo(base[0], base[1]);
  ctx3.lineTo(tip[0] - ux*hl, tip[1] - uy*hl);
  ctx3.strokeStyle = color;
  ctx3.lineWidth   = 2.5 * dpr;
  ctx3.stroke();

  ctx3.beginPath();
  ctx3.moveTo(tip[0], tip[1]);
  ctx3.lineTo(tip[0] - ux*hl - uy*hw, tip[1] - uy*hl + ux*hw);
  ctx3.lineTo(tip[0] - ux*hl + uy*hw, tip[1] - uy*hl - ux*hw);
  ctx3.closePath();
  ctx3.fillStyle = color;
  ctx3.fill();

  ctx3.fillStyle = color;
  ctx3.font = `bold ${12*dpr}px monospace`;
  ctx3.fillText(label, tip[0] + ux*6*dpr, tip[1] + uy*6*dpr + 4*dpr);
}

function drawWorldArrow(cx, cy, tip3d, color, label, scale) {
  const tip  = project(tip3d, cx, cy, scale);
  const base = project([0, 0, 0], cx, cy, scale);
  const dx = tip[0] - base[0], dy = tip[1] - base[1];
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len < 2) return;
  const ux = dx/len, uy = dy/len;
  const hw = scale * 0.07, hl = scale * 0.14;
  const dpr = devicePixelRatio;

  ctx3.save();
  ctx3.globalAlpha = 0.38;
  ctx3.setLineDash([4*dpr, 4*dpr]);
  ctx3.beginPath();
  ctx3.moveTo(base[0], base[1]);
  ctx3.lineTo(tip[0] - ux*hl, tip[1] - uy*hl);
  ctx3.strokeStyle = color;
  ctx3.lineWidth   = 1.5 * dpr;
  ctx3.stroke();
  ctx3.setLineDash([]);

  ctx3.beginPath();
  ctx3.moveTo(tip[0], tip[1]);
  ctx3.lineTo(tip[0] - ux*hl - uy*hw, tip[1] - uy*hl + ux*hw);
  ctx3.lineTo(tip[0] - ux*hl + uy*hw, tip[1] - uy*hl - ux*hw);
  ctx3.closePath();
  ctx3.fillStyle = color;
  ctx3.fill();

  ctx3.fillStyle = color;
  ctx3.font = `${10*dpr}px monospace`;
  ctx3.fillText(label, tip[0] + ux*5*dpr, tip[1] + uy*5*dpr + 3*dpr);
  ctx3.restore();
}

function draw3D() {
  const w = c3.width, h = c3.height;
  const cx = w * 0.5, cy = h * 0.5;
  const scale = Math.min(w, h) * 0.28;
  const { qw, qx, qy, qz } = imu;
  const dpr = devicePixelRatio;

  ctx3.clearRect(0, 0, w, h);

  // world grid — green (top) or red (bottom), depth-faded per line
  const gridR = camEl >= 0 ? [106,171,106] : [224,108,90];

  // camera-space depth of a world point: larger = further away
  function camDepth(v) { return camTransform(v)[2]; }
  // grid spans roughly -2.83 to +2.83 in depth; normalise to [0,1]
  const depthMax = Math.hypot(2, 2) * 1.05;

  ctx3.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    // depth at midpoint of each line
    const depthX = camDepth([i,   -0.02, 0]);
    const depthZ = camDepth([0,   -0.02, i]);
    const alphaX = Math.max(0.06, 0.06 + (depthX + depthMax) / (2 * depthMax) * 0.64);
    const alphaZ = Math.max(0.06, 0.06 + (depthZ + depthMax) / (2 * depthMax) * 0.64);

    const a  = project([i,  -0.02, -2], cx, cy, scale);
    const b  = project([i,  -0.02,  2], cx, cy, scale);
    ctx3.strokeStyle = `rgba(${gridR[0]},${gridR[1]},${gridR[2]},${alphaX.toFixed(2)})`;
    ctx3.beginPath(); ctx3.moveTo(a[0],a[1]); ctx3.lineTo(b[0],b[1]); ctx3.stroke();

    const p  = project([-2, -0.02,  i], cx, cy, scale);
    const q2 = project([ 2, -0.02,  i], cx, cy, scale);
    ctx3.strokeStyle = `rgba(${gridR[0]},${gridR[1]},${gridR[2]},${alphaZ.toFixed(2)})`;
    ctx3.beginPath(); ctx3.moveTo(p[0],p[1]); ctx3.lineTo(q2[0],q2[1]); ctx3.stroke();
  }

  // world-frame reference axes
  drawWorldArrow(cx, cy, [1.6, 0, 0],  C.x, '+X', scale);
  drawWorldArrow(cx, cy, [0, 1.6, 0],  C.y, '+Y', scale);
  drawWorldArrow(cx, cy, [0, 0, 1.6],  C.z, '+Z', scale);

  // IMU body cube
  const s = 0.18;
  const corners = [
    [-s,-s,-s],[ s,-s,-s],[ s, s,-s],[-s, s,-s],
    [-s,-s, s],[ s,-s, s],[ s, s, s],[-s, s, s],
  ].map(v => quatRotate(qw, qx, qy, qz, v));

  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  ctx3.strokeStyle = C.muted;
  ctx3.lineWidth   = 1.5 * dpr;
  edges.forEach(([a, b]) => {
    const pa = project(corners[a], cx, cy, scale);
    const pb = project(corners[b], cx, cy, scale);
    ctx3.beginPath();
    ctx3.moveTo(pa[0], pa[1]);
    ctx3.lineTo(pb[0], pb[1]);
    ctx3.stroke();
  });

  // IMU axis arrows
  [
    { v:[1,0,0], color:C.x, label:'X' },
    { v:[0,1,0], color:C.y, label:'Y' },
    { v:[0,0,1], color:C.z, label:'Z' },
  ].forEach(({ v, color, label }) => {
    drawArrow(cx, cy, quatRotate(qw, qx, qy, qz, v), color, label, scale);
  });

  // default handle — always drawn at the [2,0,2] corner
  const dhp      = project(DEFAULT_HANDLE, cx, cy, scale);
  const isDragging = !!drag;
  const defActive  = isDragging && handleWorld === DEFAULT_HANDLE;

  // grip dots helper
  function drawGrip(px, py, dotColor, bgColor, radius) {
    ctx3.beginPath();
    ctx3.arc(px, py, radius, 0, Math.PI * 2);
    ctx3.fillStyle   = bgColor;
    ctx3.globalAlpha = 0.9;
    ctx3.fill();
    ctx3.globalAlpha = 1;
    const sp = 3 * dpr;
    ctx3.fillStyle   = dotColor;
    ctx3.globalAlpha = 0.85;
    for (let row = -1; row <= 1; row++) {
      for (let col = -1; col <= 1; col++) {
        ctx3.beginPath();
        ctx3.arc(px + col*sp, py + row*sp, 0.9*dpr, 0, Math.PI*2);
        ctx3.fill();
      }
    }
    ctx3.globalAlpha = 1;
  }

  drawGrip(dhp[0], dhp[1],
    defActive ? '#1a1206' : C.bg,
    defActive ? C.accent  : C.muted,
    (defActive ? 10 : 7) * dpr);

  // active drag handle (when user grabbed a non-default grid point)
  if (isDragging && handleWorld !== DEFAULT_HANDLE) {
    const hp = project(handleWorld, cx, cy, scale);

    if (cursorCSS) {
      ctx3.beginPath();
      ctx3.moveTo(hp[0], hp[1]);
      ctx3.lineTo(cursorCSS.x * dpr, cursorCSS.y * dpr);
      ctx3.strokeStyle = C.accent;
      ctx3.lineWidth   = 1.5 * dpr;
      ctx3.setLineDash([3*dpr, 4*dpr]);
      ctx3.globalAlpha = 0.5;
      ctx3.stroke();
      ctx3.setLineDash([]);
      ctx3.globalAlpha = 1;
    }

    drawGrip(hp[0], hp[1], '#1a1206', C.accent, 10 * dpr);
  }

  // dashed line from default handle to cursor while dragging via it
  if (defActive && cursorCSS) {
    ctx3.beginPath();
    ctx3.moveTo(dhp[0], dhp[1]);
    ctx3.lineTo(cursorCSS.x * dpr, cursorCSS.y * dpr);
    ctx3.strokeStyle = C.accent;
    ctx3.lineWidth   = 1.5 * dpr;
    ctx3.setLineDash([3*dpr, 4*dpr]);
    ctx3.globalAlpha = 0.5;
    ctx3.stroke();
    ctx3.setLineDash([]);
    ctx3.globalAlpha = 1;
  }

  if (!isDragging) {
    ctx3.fillStyle = C.muted;
    ctx3.font      = `${9*dpr}px monospace`;
    ctx3.fillText('drag grid to orbit', 8*dpr, h - 8*dpr);
  }
}
