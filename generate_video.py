"""Generate a short Wan 2.1 video on a CUDA-capable NVIDIA GPU."""

from __future__ import annotations

import argparse
from pathlib import Path


MODEL_ID = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", type=Path, default=Path("outputs/video/wan21.mp4"))
    parser.add_argument("--frames", type=int, default=81, help="81 frames is about 5 seconds at 16 FPS.")
    parser.add_argument("--fps", type=int, default=16)
    parser.add_argument("--width", type=int, default=832)
    parser.add_argument("--height", type=int, default=480)
    parser.add_argument("--steps", type=int, default=30)
    parser.add_argument("--guidance-scale", type=float, default=5.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--cpu-offload", action="store_true")
    args = parser.parse_args()

    if args.frames < 5 or args.frames > 161 or args.frames % 4 != 1:
        raise ValueError("--frames must be 5 + a multiple of 4, between 5 and 161.")
    if args.width < 256 or args.height < 256 or args.steps < 1:
        raise ValueError("Width, height, and steps must be positive practical values.")

    import torch
    from diffusers import WanPipeline
    from diffusers.utils import export_to_video

    if not torch.cuda.is_available():
        raise RuntimeError(
            "CUDA is unavailable. This Wan 2.1 workflow requires an NVIDIA GPU "
            "with a working CUDA PyTorch installation."
        )
    gpu_name = torch.cuda.get_device_name(0)
    capability = torch.cuda.get_device_capability(0)
    print(f"GPU: {gpu_name}; compute capability: {capability}")
    print(f"Loading {MODEL_ID}; first run downloads several GB.")

    pipe = WanPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.float16)
    if args.cpu_offload:
        pipe.enable_model_cpu_offload()
        generator_device = "cuda"
    else:
        pipe.to("cuda")
        generator_device = "cuda"

    generator = torch.Generator(device=generator_device).manual_seed(args.seed)
    result = pipe(
        prompt=args.prompt,
        height=args.height,
        width=args.width,
        num_frames=args.frames,
        guidance_scale=args.guidance_scale,
        num_inference_steps=args.steps,
        generator=generator,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    export_to_video(result.frames[0], str(args.output), fps=args.fps)
    print(f"Video written to: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
