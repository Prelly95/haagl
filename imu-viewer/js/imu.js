// IMU state and frame ingestion

const HISTORY = 300;

const hist = {
  ax: new Float32Array(HISTORY), ay: new Float32Array(HISTORY), az: new Float32Array(HISTORY),
  gx: new Float32Array(HISTORY), gy: new Float32Array(HISTORY), gz: new Float32Array(HISTORY),
  head: 0, count: 0,
};

let imu = { ax:0, ay:0, az:0, gx:0, gy:0, gz:0, qw:1, qx:0, qy:0, qz:0 };

let intRoll = 0, intPitch = 0, intYaw = 0, lastTs = null;

function integrateGyro(gx, gy, gz, ts) {
  if (lastTs !== null) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    intRoll  += gx * dt;
    intPitch += gy * dt;
    intYaw   += gz * dt;
  }
  lastTs = ts;
}

function eulerToQuat(rollDeg, pitchDeg, yawDeg) {
  const r = rollDeg  * Math.PI / 180 * 0.5;
  const p = pitchDeg * Math.PI / 180 * 0.5;
  const y = yawDeg   * Math.PI / 180 * 0.5;
  return {
    qw: Math.cos(r)*Math.cos(p)*Math.cos(y) + Math.sin(r)*Math.sin(p)*Math.sin(y),
    qx: Math.sin(r)*Math.cos(p)*Math.cos(y) - Math.cos(r)*Math.sin(p)*Math.sin(y),
    qy: Math.cos(r)*Math.sin(p)*Math.cos(y) + Math.sin(r)*Math.cos(p)*Math.sin(y),
    qz: Math.cos(r)*Math.cos(p)*Math.sin(y) - Math.sin(r)*Math.sin(p)*Math.cos(y),
  };
}

function quatToEuler(qw, qx, qy, qz) {
  const sinr = 2*(qw*qx + qy*qz);
  const cosr = 1 - 2*(qx*qx + qy*qy);
  const roll  = Math.atan2(sinr, cosr);
  const sinp  = 2*(qw*qy - qz*qx);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp)*Math.PI/2 : Math.asin(sinp);
  const siny  = 2*(qw*qz + qx*qy);
  const cosy  = 1 - 2*(qy*qy + qz*qz);
  const yaw   = Math.atan2(siny, cosy);
  return { roll: roll*180/Math.PI, pitch: pitch*180/Math.PI, yaw: yaw*180/Math.PI };
}

function ingestFrame(f) {
  if (f.qw === undefined) {
    integrateGyro(f.gx ?? 0, f.gy ?? 0, f.gz ?? 0, f.ts ?? Date.now());
    const q = eulerToQuat(intRoll, intPitch, intYaw);
    f.qw = q.qw; f.qx = q.qx; f.qy = q.qy; f.qz = q.qz;
  }
  imu = { ...imu, ...f };

  const h = hist.head;
  hist.ax[h] = f.ax ?? 0; hist.ay[h] = f.ay ?? 0; hist.az[h] = f.az ?? 0;
  hist.gx[h] = f.gx ?? 0; hist.gy[h] = f.gy ?? 0; hist.gz[h] = f.gz ?? 0;
  hist.head  = (h + 1) % HISTORY;
  hist.count = Math.min(hist.count + 1, HISTORY);

  updateReadout();
}

function fmt(v, d = 3) { return (v >= 0 ? ' ' : '') + v.toFixed(d); }

function updateReadout() {
  document.getElementById('rAx').textContent = fmt(imu.ax);
  document.getElementById('rAy').textContent = fmt(imu.ay);
  document.getElementById('rAz').textContent = fmt(imu.az);
  document.getElementById('rGx').textContent = fmt(imu.gx);
  document.getElementById('rGy').textContent = fmt(imu.gy);
  document.getElementById('rGz').textContent = fmt(imu.gz);
  const e = quatToEuler(imu.qw, imu.qx, imu.qy, imu.qz);
  document.getElementById('rRoll').textContent  = fmt(e.roll,  1);
  document.getElementById('rPitch').textContent = fmt(e.pitch, 1);
  document.getElementById('rYaw').textContent   = fmt(e.yaw,   1);
}
