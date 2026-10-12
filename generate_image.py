"""Generate an image using the base SDXL model and a trained LoRA adapter."""

from __future__ import annotations

import argparse
from pathlib import Path


def create_pipeline(lora_dir: Path, device_name: str = "auto"):
    import torch
    from diffusers import DiffusionPipeline

    if device_name == "directml":
        import torch_directml
        device = torch_directml.device()
        dtype = torch.float32
    elif device_name == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA was requested, but torch.cuda.is_available() is False.")
        device, dtype = "cuda", torch.float16
    else:
        use_cuda = device_name == "auto" and torch.cuda.is_available()
        device, dtype = ("cuda", torch.float16) if use_cuda else ("cpu", torch.float32)
    print(f"Loading SDXL on {device}; this may take time and memory.")
    pipeline = DiffusionPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=dtype,
        use_safetensors=True,
    )
    pipeline.load_lora_weights(lora_dir)
    return pipeline.to(device), device


def generate_image(
    pipeline,
    *,
    device,
    prompt: str,
    output: Path,
    steps: int,
    seed: int,
    width: int,
    height: int,
) -> None:
    import torch

    generator = torch.Generator(device=device).manual_seed(seed)
    result = pipeline(
        prompt=prompt,
        num_inference_steps=steps,
        width=width,
        height=height,
        generator=generator,
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    result.images[0].save(output)
    print(f"Generated image: {output}")


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

    pipeline, device = create_pipeline(args.lora_dir, args.device)
    generate_image(
        pipeline,
        device=device,
        prompt=args.prompt,
        output=args.output,
        steps=args.steps,
        seed=args.seed,
        width=args.width,
        height=args.height,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
