"""
imu_server — WebSocket IMU server

Streams IMU data over WebSocket at a configurable rate.
Supports pluggable sources: mock (default) or serial hardware.

Frame format (JSON):
  {
    "ts":  <unix ms>,
    "ax":  <float m/s²>,  "ay": ..., "az": ...,
    "gx":  <float deg/s>, "gy": ..., "gz": ...,
    "qw":  <float>,       "qx": ..., "qy": ..., "qz": ...
  }

Usage:
  uv run server.py                              # mock data
  uv run server.py --source serial --port /dev/ttyUSB0
"""

import asyncio
import argparse
import json
import time

import websockets

from sources.mock   import MockSource
from sources.serial import SerialSource   # noqa: F401  (imported for --source serial)

clients: set = set()


async def handler(ws):
    clients.add(ws)
    print(f"  + {ws.remote_address}")
    try:
        await ws.wait_closed()
    finally:
        clients.discard(ws)
        print(f"  - {ws.remote_address}")


async def broadcaster(source, rate: float):
    interval = 1.0 / rate
    async for frame in source:
        frame["ts"] = time.time() * 1000
        if clients:
            payload = json.dumps(frame)
            await asyncio.gather(
                *[c.send(payload) for c in list(clients)],
                return_exceptions=True,
            )
        await asyncio.sleep(interval)


async def main(args):
    if args.source == "mock":
        source = MockSource(rate=args.rate)
    elif args.source == "serial":
        source = SerialSource(port=args.port, baud=args.baud)
    else:
        raise SystemExit(f"Unknown source: {args.source}")

    print(f"IMU server  ws://{args.host}:{args.ws_port}  source={args.source}  {args.rate:.0f} Hz")
    async with websockets.serve(handler, args.host, args.ws_port):
        await broadcaster(source, args.rate)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IMU WebSocket server")
    parser.add_argument("--host",     default="localhost")
    parser.add_argument("--ws-port",  type=int,   default=8765)
    parser.add_argument("--rate",     type=float, default=60.0,        help="Hz")
    parser.add_argument("--source",   default="mock",                  choices=["mock", "serial"])
    parser.add_argument("--port",     default="/dev/ttyUSB0",          help="Serial port (--source serial)")
    parser.add_argument("--baud",     type=int,   default=115200,      help="Baud rate  (--source serial)")
    args = parser.parse_args()
    try:
        asyncio.run(main(args))
    except KeyboardInterrupt:
        print("\nStopped.")
