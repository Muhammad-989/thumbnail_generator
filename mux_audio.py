"""Mux an existing audio file into a generated video using ffmpeg."""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not args.video.is_file() or not args.audio.is_file():
        raise FileNotFoundError("Both --video and --audio must exist.")
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required to combine audio and video.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(args.video), "-i", str(args.audio),
         "-c:v", "copy", "-c:a", "aac", "-shortest", str(args.output)],
        check=True,
    )
    print(f"Video with audio written to: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
