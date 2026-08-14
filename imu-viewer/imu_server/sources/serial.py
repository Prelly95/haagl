"""
Serial IMU source — reads from a USB/UART device.

Expected device output (choose one):
  1. Newline-delimited JSON:   {"ax":0.1,"ay":0.2,"az":9.8,"gx":1.0,"gy":0.5,"gz":0.2}
  2. Bare CSV:                 ax,ay,az,gx,gy,gz[,qw,qx,qy,qz]

Install extra dep:
  uv add pyserial
"""

import asyncio
import json


class SerialSource:
    """Async iterator that yields IMU frames from a serial port."""

    KEYS = ["ax", "ay", "az", "gx", "gy", "gz", "qw", "qx", "qy", "qz"]

    def __init__(self, port: str = "/dev/ttyUSB0", baud: int = 115200):
        self._port = port
        self._baud = baud
        self._ser  = None

    def _open(self):
        try:
            import serial
        except ImportError:
            raise SystemExit("pyserial not found — run: uv add pyserial")
        self._ser = serial.Serial(self._port, self._baud, timeout=1)
        print(f"  serial open  {self._port}  {self._baud} baud")

    def _read_line(self) -> bytes:
        return self._ser.readline()

    def _parse(self, raw: bytes) -> dict | None:
        line = raw.strip()
        if not line:
            return None
        try:
            return json.loads(line)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass
        try:
            parts = [float(x) for x in line.split(b",")]
            return {self.KEYS[i]: parts[i] for i in range(min(len(parts), len(self.KEYS)))}
        except ValueError:
            return None

    def __aiter__(self):
        return self

    async def __anext__(self) -> dict:
        if self._ser is None:
            self._open()
        loop = asyncio.get_event_loop()
        while True:
            raw   = await loop.run_in_executor(None, self._read_line)
            frame = self._parse(raw)
            if frame is not None:
                return frame
