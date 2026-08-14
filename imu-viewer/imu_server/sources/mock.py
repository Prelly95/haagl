"""Synthetic IMU source — smooth tumbling motion, no hardware required."""

import math
import time


def _euler_to_quat(roll_deg: float, pitch_deg: float, yaw_deg: float) -> tuple:
    r = math.radians(roll_deg)  * 0.5
    p = math.radians(pitch_deg) * 0.5
    y = math.radians(yaw_deg)   * 0.5
    cr, sr = math.cos(r), math.sin(r)
    cp, sp = math.cos(p), math.sin(p)
    cy, sy = math.cos(y), math.sin(y)
    return (
        cr*cp*cy + sr*sp*sy,
        sr*cp*cy - cr*sp*sy,
        cr*sp*cy + sr*cp*sy,
        cr*cp*sy - sr*sp*cy,
    )


class MockSource:
    """Async iterator that yields synthetic IMU frames."""

    def __init__(self, rate: float = 60.0):
        self._dt = 1.0 / rate
        self._t  = 0.0

    def __aiter__(self):
        return self

    async def __anext__(self) -> dict:
        t  = self._t
        dt = self._dt
        self._t += dt

        roll  =  30.0 * math.sin(t * 0.40)
        pitch =  20.0 * math.sin(t * 0.27 + 1.1)
        yaw   =  45.0 * math.sin(t * 0.15)

        roll_p  = 30.0 * math.sin((t - dt) * 0.40)
        pitch_p = 20.0 * math.sin((t - dt) * 0.27 + 1.1)
        yaw_p   = 45.0 * math.sin((t - dt) * 0.15)

        qw, qx, qy, qz = _euler_to_quat(roll, pitch, yaw)

        return {
            "ax": round(2.0  * math.sin(t * 1.30),           4),
            "ay": round(1.5  * math.cos(t * 0.90 + 0.5),     4),
            "az": round(9.81 + 0.3 * math.sin(t * 2.10),     4),
            "gx": round((roll  - roll_p)  / dt,               4),
            "gy": round((pitch - pitch_p) / dt,               4),
            "gz": round((yaw   - yaw_p)   / dt,               4),
            "qw": round(qw, 6), "qx": round(qx, 6),
            "qy": round(qy, 6), "qz": round(qz, 6),
        }
