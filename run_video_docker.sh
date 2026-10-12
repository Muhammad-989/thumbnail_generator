#!/usr/bin/env bash
set -euo pipefail

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "nvidia-smi was not found. Install a working NVIDIA driver before using this script." >&2
  exit 1
fi

nvidia-smi
mkdir -p outputs/video

docker run --rm --gpus all \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  -v "$PWD/outputs:/app/outputs" \
  thumbnail-lora-video \
  python3 generate_video.py \
  --prompt "$*"
