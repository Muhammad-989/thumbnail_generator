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

The PyTorch requirement starts at 2.7 because ComfyUI's current
`comfy-kitchen` custom operators use PEP 585 annotations such as `list[int]`,
which older PyTorch schema inference rejects during startup. If this
environment already has PyTorch 2.5 or older, upgrade the matching PyTorch
and torchvision pair before starting ComfyUI:

```bash
python -m pip install --upgrade "torch>=2.7,<2.8" "torchvision>=0.22,<0.23"
```

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

## NVIDIA video generation with Wan 2.1

For the Quadro P5200 16 GB laptop, the project includes a conservative
short-video workflow using `Wan-AI/Wan2.1-T2V-1.3B-Diffusers`. It targets 832x480,
81 frames (about 5 seconds at 16 FPS), one video at a time. The P5200 is an
older Pascal GPU, so generation may take a long time and modern optimizations
may not be supported. Check the actual driver and CUDA visibility first:

```bash
nvidia-smi
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'no CUDA'); print(torch.cuda.get_device_capability(0) if torch.cuda.is_available() else '')"
```

### Docker video setup

From the project root on the NVIDIA Linux machine:

```bash
docker build -f Dockerfile.video -t thumbnail-lora-video .
mkdir -p outputs/video
docker run --rm --gpus all thumbnail-lora-video nvidia-smi
docker run --rm --gpus all thumbnail-lora-video \
  python3 -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

Generate a first, shorter test before a 5-second clip:

```bash
docker run --rm --gpus all \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  -v "$PWD/outputs:/app/outputs" \
  thumbnail-lora-video \
  python3 generate_video.py \
  --prompt "a cinematic gaming thumbnail scene, dramatic camera movement, vivid lighting" \
  --frames 49 --fps 16 --width 640 --height 368 --steps 20 \
  --output outputs/video/test.mp4
```

Then use the target clip settings:

```bash
docker run --rm --gpus all \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  -v "$PWD/outputs:/app/outputs" \
  thumbnail-lora-video \
  python3 generate_video.py \
  --prompt "a cinematic gaming thumbnail scene, dramatic camera movement, vivid lighting" \
  --output outputs/video/wan21-5s.mp4
```

If the P5200 runs out of VRAM, add `--cpu-offload`, reduce to `640x368`, or
use 49 frames. CPU offload saves VRAM but is slower. Do not start with the
Wan 14B model, 720p, batch generation, or audio-video models on this laptop.

Wan 2.1 produces video without audio. Add narration, music, or sound effects
separately and mux them with:

```bash
python3 mux_audio.py --video outputs/video/wan21-5s.mp4 \
  --audio narration.wav --output outputs/video/final.mp4
```

The Docker image includes `ffmpeg` for this step. The image is intentionally
separate from the CPU SDXL image because it requires an NVIDIA CUDA runtime.

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

## MERN application and queued image generation

The Express API and Python worker use MongoDB as a durable job queue. MongoDB
is the only containerized service; the API and worker run locally so the worker
can use the machine's Python environment and GPU.

Start MongoDB and the API from the project root:

```powershell
docker compose up -d --build mongodb api
```

Seed the MongoDB prompt catalog:

```powershell
cd server
MONGO_URL=mongodb://localhost:27017/thumbnail_generator node seed.js
```

The API is available at `http://localhost:5000`. Check both API and database
connectivity:

```powershell
curl http://localhost:5000/api/health
curl http://localhost:5000/api/prompts
```

In a second terminal, install the Python requirements if needed and start the
long-running worker:

```powershell
python -m pip install -r requirements-cpu.txt
python worker.py
```

When the worker runs in a container, use
`MONGO_URL=mongodb://mongodb:27017/thumbnail_generator`; when it runs on the
host, use `MONGO_URL=mongodb://127.0.0.1:27017/thumbnail_generator`.

The worker loads the SDXL pipeline once, claims queued jobs atomically, and
updates each job to `processing`, `completed`, or `failed`. Make sure a trained
adapter exists at `outputs/smoke_test`, or set `LORA_DIR` to another adapter
directory.

## GPU machine workflow with Docker

Use this workflow on the machine that has the NVIDIA GPU. It assumes Linux or
WSL2 with Docker, an NVIDIA driver, and the NVIDIA Container Toolkit.

### 1. Clone and prepare the machine

```bash
git clone https://github.com/Muhammad-989/thumbnail_generator.git
cd thumbnail_generator
cp .env.example .env
```

If the base model is gated, put `HF_TOKEN` in `.env` or export it in the shell.
Never commit `.env`, tokens, model credentials, or datasets. Place the dataset
ZIP beside `train_local.py`:

```text
curated_captioned_thumbnails.zip
```

### 2. Verify GPU passthrough

Both commands must show the GPU:

```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

If the Docker command fails, install/configure NVIDIA Container Toolkit before
continuing.

### 3. Build the CUDA image

`Dockerfile.gpu` contains CUDA-enabled PyTorch, Diffusers, the training
scripts, and the worker:

```bash
docker build -f Dockerfile.gpu -t thumbnail-generator-gpu .
```

### 4. Train the LoRA adapter in Docker

Run a small GPU smoke test first:

```bash
docker run --rm --gpus all \
  --env-file .env \
  -v "$PWD:/app" -w /app \
  thumbnail-generator-gpu \
  python3 train_local.py --gpu-smoke-test --examples 8 --steps 3 --resolution 512
```

Then run the full training job:

```bash
docker run --rm --gpus all \
  --env-file .env \
  -v "$PWD:/app" -w /app \
  thumbnail-generator-gpu \
  python3 train_local.py --gpu --resolution 1024 --steps 1200
```

The trained adapter should be at
`outputs/sdxl-youtube-thumbnail-lora`. Resume interrupted training with:

```bash
docker run --rm --gpus all \
  --env-file .env \
  -v "$PWD:/app" -w /app \
  thumbnail-generator-gpu \
  python3 train_local.py --gpu --resume latest
```

The bind mount keeps datasets, checkpoints, and the adapter on the host after
the temporary training container is removed.

### 5. Start MongoDB, API, and GPU worker

The `gpu` Compose profile adds the model worker and passes through all GPUs:

```bash
docker compose --profile gpu up -d --build mongodb api gpu-worker
docker compose exec api node seed.js
```

Container services must use this MongoDB hostname:

```text
mongodb://mongodb:27017/thumbnail_generator
```

Host commands must use:

```text
mongodb://127.0.0.1:27017/thumbnail_generator
```

The API and worker share the `generated_outputs` volume. The worker writes
completed images there, and the API serves them from `/generated/...`. The
trained adapter is shared through the host `./outputs` mount.

Validate the complete stack:

```bash
docker compose --profile gpu ps
curl http://localhost:5000/api/health
curl http://localhost:5000/api/prompts
docker compose logs --tail=100 gpu-worker
```

Expected health response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

### 6. Run the client

On the same GPU machine:

```bash
cd client
printf 'VITE_API_BASE_URL=http://localhost:5000\n' > .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

To test one generation request:

```bash
curl -X POST http://localhost:5000/api/images \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"a dramatic futuristic gaming thumbnail","width":512,"height":512,"steps":10,"seed":42}'
```

Poll the returned `statusUrl`:

```bash
curl http://localhost:5000/api/images/<job-id>
```

When the status is `completed`, open the returned URL at
`http://localhost:5000/generated/<filename>`.

### 7. Troubleshooting

- If `nvidia-smi` works on the host but not in Docker, fix NVIDIA Container
  Toolkit before changing application code.
- If the worker cannot find the adapter, confirm
  `outputs/sdxl-youtube-thumbnail-lora` exists.
- If jobs stay `queued`, inspect `docker compose logs gpu-worker`.
- If jobs become `failed`, read the job `error` field and worker logs. Common
  causes are insufficient VRAM, an invalid adapter path, or incompatible CUDA
  and PyTorch versions.
- If a job completes but its image is unavailable, confirm both `api` and
  `gpu-worker` mount `generated_outputs`.

Stop the stack without deleting MongoDB data:

```bash
docker compose --profile gpu down
```

Use `docker compose down -v` only when you intentionally want to delete the
MongoDB and generated-output volumes.

Create a job:

```powershell
Invoke-RestMethod http://localhost:5000/api/images -Method Post `
  -ContentType "application/json" `
  -Body '{"prompt":"a dramatic futuristic gaming thumbnail","width":512,"height":512,"steps":10,"seed":42}'
```

The API returns a `jobId` immediately. Poll the returned `statusUrl` until the
status is `completed`, then prefix the returned `url` with
`http://localhost:5000`. Failed jobs include an `error` field.

For a React client, the request flow is:

```text
POST /api/images       -> { jobId, status: "queued", statusUrl }
GET  /api/images/:id   -> { status: "queued" | "processing" | "completed" | "failed" }
GET  /generated/name   -> completed PNG
```

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
