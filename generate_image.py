"""Generate an image using the base SDXL model and a trained LoRA adapter."""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lora-dir", type=Path, default=Path("outputs/smoke_test"))
    parser.add_argument(
        "--prompt",
        default="yt_thumbnail style, a dramatic YouTube thumbnail with bold composition, vivid colors, cinematic lighting",
    )
    parser.add_argument("--output", type=Path, default=Path("outputs/smoke_test/generated.png"))
    parser.add_argument("--steps", type=int, default=10)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--width", type=int, default=512)
    parser.add_argument("--height", type=int, default=512)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda", "directml"), default="auto")
    args = parser.parse_args()

    import torch
    from diffusers import DiffusionPipeline

    if args.device == "directml":
        import torch_directml
        device = torch_directml.device()
        dtype = torch.float32
    elif args.device == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA was requested, but torch.cuda.is_available() is False.")
        device, dtype = "cuda", torch.float16
    else:
        use_cuda = args.device == "auto" and torch.cuda.is_available()
        device, dtype = ("cuda", torch.float16) if use_cuda else ("cpu", torch.float32)
    print(f"Loading SDXL on {device}; this may take time and memory.")
    pipeline = DiffusionPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=dtype,
        use_safetensors=True,
    )
    pipeline.load_lora_weights(args.lora_dir)
    pipeline = pipeline.to(device)
    generator = torch.Generator(device=device).manual_seed(args.seed)
    result = pipeline(
        prompt=args.prompt,
        num_inference_steps=args.steps,
        width=args.width,
        height=args.height,
        generator=generator,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.images[0].save(args.output)
    print(f"Generated image: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
