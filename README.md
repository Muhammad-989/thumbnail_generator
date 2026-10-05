# SDXL YouTube Thumbnail LoRA

This project trains a LoRA for `stabilityai/stable-diffusion-xl-base-1.0` from a
local `metadata.jsonl` plus nested creator image folders. The dataset is not
committed: put `curated_captioned_thumbnails.zip` beside `train_local.py`, or
use an already extracted `curated_captioned_thumbnails/` directory.

## First run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-cpu.txt
python validate_dataset.py
.\run_smoke_test.ps1
```

The CPU requirements include the CPU PyTorch wheel and the non-CUDA
dependencies needed for the optional SDXL smoke-training attempt. They do not
install bitsandbytes or torchao.

The Linux/macOS equivalents are `source .venv/bin/activate`, `python
validate_dataset.py`, and `bash run_smoke_test.sh`. The default CPU smoke test
extracts/validates the dataset, checks nested paths and captions, and exits
through a safe validation-only fallback. It does not claim CUDA, fp16, GPU
memory, or GPU speed compatibility. To attempt the real tiny CPU model step
(which may be impractical for SDXL), run `python train_local.py --train-smoke`.
You can increase the sample size and steps explicitly, for example:

```bash
python train_local.py --train-smoke --examples 50 --steps 5 --resolution 256
```

This creates a temporary validated subset under `outputs/smoke_test/` and
leaves the original dataset unchanged. CPU SDXL training can use substantial
RAM and may take a long time; increase one value at a time.

## Proof-of-concept training and generation

After installing `requirements-cpu.txt`, try the smallest real training run:

```bash
python train_local.py --train-smoke --examples 8 --steps 1 --resolution 256
```

If it completes, the LoRA adapter is saved under `outputs/smoke_test/`.
Generate an image with that adapter:

```bash
python generate_image.py \
  --lora-dir outputs/smoke_test \
  --output outputs/smoke_test/generated.png \
  --steps 10 \
  --width 512 \
  --height 512 \
  --prompt "yt_thumbnail style, a giant robot on a neon city street, dramatic lighting, bold composition"
```

On CPU, both model loading and generation can take minutes and require
substantial RAM. The first run downloads the SDXL base model. A one-step LoRA
run is only a pipeline proof of concept; it is not enough to noticeably teach
the model the full thumbnail style. GPU training is recommended for useful
results.

## AMD GPU without ROCm

If the AMD GPU is not ROCm-compatible, do not install CUDA PyTorch and do not
use `--gpu`: the official Diffusers SDXL LoRA training script in this project
uses CUDA/ROCm-oriented Accelerate behavior and is not a reliable DirectML
training backend. The wrapper deliberately rejects DirectML training instead
of silently running on CPU or producing misleading results.

For experimental **image generation only**, use native Windows PowerShell (not
WSL) and a separate environment:

```powershell
py -3.12 -m venv .venv-amd
.\.venv-amd\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-amd-directml.txt
python generate_image.py --device directml --lora-dir outputs\smoke_test --output outputs\smoke_test\amd-test.png --steps 5 --width 512 --height 512 --prompt "yt_thumbnail style, dramatic gaming thumbnail"
```

This requires a current Windows AMD driver with DirectML support. DirectML
support varies by operator and model; SDXL may still fail or fall back for
some components. `torch-directml` is not supported in WSL in this workflow.
The existing LoRA adapter must already have been trained elsewhere; this
project does not claim non-ROCm AMD LoRA training support.

For AMD LoRA training, use a ROCm-compatible Linux/PyTorch installation if
your specific GPU is supported, or use an NVIDIA/cloud GPU. Verify ROCm with
`torch.cuda.is_available()` and the reported device before using
`python train_local.py --gpu`.

### If the AMD GPU is ROCm-compatible

Use the native Linux host or a ROCm-enabled Linux container. Do not use the
CPU Docker image as a GPU image. First check the host and exact GPU:

```bash
rocminfo
rocm-smi
```

Then create a separate environment and install the ROCm PyTorch command
generated for your installed ROCm version at
https://pytorch.org/get-started/locally/:

```bash
python3 -m venv .venv-rocm
source .venv-rocm/bin/activate
python -m pip install --upgrade pip
# Run the exact ROCm torch/torchvision command from pytorch.org here.
python -m pip install -r requirements-rocm.txt
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

For a ROCm PyTorch build, `torch.cuda.is_available()` normally reports
`True` because ROCm uses PyTorch's CUDA-compatible device API. Only continue
when it reports `True` and the AMD device name is shown. Then run the tiny
hardware test before production:

```bash
python train_local.py --gpu-smoke-test --examples 8 --steps 1 --resolution 512
python train_local.py --gpu --resolution 768 --steps 5
```

If the GPU is supported but memory is limited, use 512px or 768px, keep batch
size 1, and reduce gradient accumulation. Do not install `torchao` by default.
Only enable 8-bit Adam after verifying that bitsandbytes supports your exact
ROCm/PyTorch combination; otherwise omit `--use-8bit-adam`.

For Docker, use an AMD/ROCm base image matching the host ROCm release and
follow that image's device-mapping instructions. ROCm containers require a
ROCm-capable host, compatible kernel/driver, `/dev/kfd`, `/dev/dri`, and
matching user permissions. Because these requirements vary by GPU and ROCm
release, this repository's generic `Dockerfile` remains CPU-only.

## Linux and Docker

DirectML is a native-Windows backend; it does not provide AMD acceleration in
your Linux system or in a Linux container. The included [Dockerfile](./Dockerfile)
is a reproducible **CPU** environment. It is suitable for dataset validation,
the optional CPU proof-of-concept, and CPU image generation:

```bash
docker build -t thumbnail-lora-cpu .
docker run --rm \
  -v "$PWD/curated_captioned_thumbnails:/app/curated_captioned_thumbnails:ro" \
  -v "$PWD/outputs:/app/outputs" \
  thumbnail-lora-cpu \
  python train_local.py --train-smoke --examples 8 --steps 1 --resolution 256
```

To generate from an adapter produced in the mounted output directory:

```bash
docker run --rm \
  -v "$PWD/outputs:/app/outputs" \
  thumbnail-lora-cpu \
  python generate_image.py --lora-dir outputs/smoke_test \
  --output outputs/smoke_test/generated.png --steps 5 --width 512 --height 512
```

The first model operation downloads SDXL into the container user's Hugging
Face cache. Persist it to avoid downloading again:

```bash
docker run --rm \
  -v "$PWD/outputs:/app/outputs" \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  thumbnail-lora-cpu \
  python generate_image.py --lora-dir outputs/smoke_test
```

Do not pass `--gpu` to this CPU image. A Linux Docker container can use AMD
GPU acceleration only with a ROCm-supported GPU, a matching ROCm host driver,
the ROCm PyTorch image/packages, and the required device mappings. Since your
target GPU is assumed not to be ROCm-compatible, Docker cannot make it a
training GPU; use the CPU image above or an NVIDIA/cloud GPU for training.

## GPU setup and tests

Install PyTorch using the CUDA-specific command generated at
https://pytorch.org/get-started/locally/; do not blindly install a CPU wheel.
Then install the remaining requirements:

```powershell
python -m pip install -r requirements-gpu.txt
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'no CUDA')"
python train_local.py --gpu-smoke-test
```

The GPU smoke test uses 512px, a few steps, and `outputs/gpu_smoke_test/`, and
is the first test that exercises CUDA/fp16 behavior. Production defaults are
1024px, batch size 1, gradient accumulation 4, gradient checkpointing, LoRA
rank 16, checkpointing every 100 steps, and five retained checkpoints:

```powershell
.\run_gpu_training.ps1
# or: python train_local.py --gpu --resolution 768 --steps 5
```

The wrapper downloads the pinned Diffusers v0.30.3 SDXL LoRA example on first
training use, streams child output to the terminal, and writes a timestamped
log beside the output. It does not install `torchao`; 8-bit Adam is not enabled
by default. To opt in after confirming a compatible bitsandbytes installation,
add `--use-8bit-adam` to a GPU command.

Resume without deleting outputs:

```powershell
python train_local.py --gpu --resume latest
python train_local.py --gpu --resume checkpoint-100
```

For private or gated models, authenticate with `huggingface-cli login` (or set
`HF_TOKEN` in your shell). Never put a real token in `.env.example` or source.

## Layout, tests, and safety

```text
train_local.py
validate_dataset.py
requirements-cpu.txt
requirements-gpu.txt
tests/test_project.py
curated_captioned_thumbnails/   # local only
outputs/                         # local only
```

Run `python -m unittest discover -s tests -v` for lightweight JSONL, missing
image, empty caption, nested path, and device tests. CUDA out-of-memory errors
can usually be reduced by using `--resolution 768` or `512`, fewer gradient
accumulation steps, and a short GPU smoke run before production. `.gitignore`
excludes ZIPs, raw data, caches, checkpoints/weights, virtual environments,
tokens, and outputs. Do not push them to GitHub.
