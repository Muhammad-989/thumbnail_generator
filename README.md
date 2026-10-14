# Thumbnail Generator

MERN web application for generating:

- YouTube thumbnails with an SDXL LoRA image pipeline.
- Short text-to-video clips with Wan 2.1.
- Prompt-pack discovery, favorites, and asynchronous generation jobs.

The intended production setup is an NVIDIA Linux machine with Docker,
Docker Compose, and a CUDA-capable GPU. MongoDB stores catalog records,
favorites, and job state. Express provides the API. React/Vite provides the
browser UI. Separate GPU workers claim queued jobs from MongoDB so the API
process stays responsive while models generate.

## 1. Architecture

```text
Browser (React/Vite :3000)
             |
             v
      Express API (:5000) -------- MongoDB (:27017)
             |                         |
             |                         +-- prompts
             |                         +-- favorites
             |                         +-- generationjobs
             |                         +-- videojobs
             |
             +-- shared generated_outputs volume
                    ^
                    |
        +-----------+-----------+
        |                       |
  SDXL GPU worker       Wan 2.1 video worker
```

### Repository map

| Path | Responsibility |
| --- | --- |
| `client/` | React/Vite frontend |
| `client/src/api.ts` | Typed API request boundary |
| `client/src/components/PlaygroundModal.tsx` | Model selection and polling UI |
| `client/src/data/sampleCreatives.ts` | Frontend fallback prompt catalog |
| `server/index.js` | Express API, Mongoose schemas, static output serving |
| `server/seed.js` | Prompt catalog seed/upsert and obsolete-record cleanup |
| `worker.py` | SDXL image job worker |
| `worker_video.py` | Wan 2.1 video job worker |
| `generate_image.py` | SDXL image pipeline and LoRA generation |
| `generate_video.py` | Wan 2.1 text-to-video CLI pipeline |
| `docker-compose.yml` | MongoDB, API, and optional GPU services |
| `outputs/` | Runtime-only outputs; ignored by Git |

## 2. GPU-machine prerequisites

Run these checks on the NVIDIA Linux machine:

```bash
git --version
docker --version
docker compose version
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

Install Node.js 22 or newer in addition to the NVIDIA driver, Docker Engine, Docker Compose plugin, and NVIDIA
Container Toolkit using the instructions for the machine's Linux
distribution. The last command must show the GPU from inside a container.
Do not continue if `nvidia-smi` fails on the host or in Docker.

The project uses CUDA 12.4 base images. The GPU driver must support that CUDA
runtime. Wan 2.1 and SDXL are memory-intensive; generation is configured for
one job at a time per worker.

## 3. Clone and configure

```bash
git clone https://github.com/Muhammad-989/thumbnail_generator.git
cd thumbnail_generator
cp .env.example .env
```

Edit `.env` if needed:

```dotenv
MONGO_URL=mongodb://mongodb:27017/thumbnail_generator
PORT=5000
LORA_DIR=/app/outputs/sdxl-youtube-thumbnail-lora
WORKER_POLL_SECONDS=2
```

The Compose file supplies the container-to-container MongoDB URL and runtime
paths. Do not commit `.env`, model weights, datasets, generated images, or
videos. They are excluded by `.gitignore`.

## 4. Prepare the SDXL LoRA

The image worker expects a trained adapter at:

```text
outputs/sdxl-youtube-thumbnail-lora/
```

Copy the trained adapter directory to that exact host path, or change
`LORA_DIR` in `docker-compose.yml` to the host-mounted container path. The
directory must contain the adapter files produced by the training workflow.

If you need to train the adapter on this machine:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install --index-url https://download.pytorch.org/whl/cu124 torch torchvision
python -m pip install -r requirements-gpu.txt
python train_local.py --gpu-smoke-test
```

For a real run, provide the validated dataset and use the documented
`train_local.py --gpu` options. Training is separate from web serving and
should be completed before starting `gpu-worker`.

## 5. Start the complete application

Start MongoDB, the API, the SDXL worker, and the Wan 2.1 worker:

```bash
docker compose --profile gpu up --build
```

The first build downloads Python dependencies. The first generation downloads
the Hugging Face SDXL or Wan model into the container cache. Persist the cache
to avoid downloading models after container recreation:

```bash
mkdir -p "$HOME/.cache/huggingface"
```

To persist the cache, add this volume to both GPU services in
`docker-compose.yml`:

```yaml
      - ${HOME}/.cache/huggingface:/root/.cache/huggingface
```

The web UI is served by Vite during development:

```bash
cd client
npm ci
VITE_API_BASE_URL=http://GPU_MACHINE_IP:5000 npm run dev -- --host 0.0.0.0
```

Open `http://GPU_MACHINE_IP:3000` from a browser that can reach the GPU
machine. For a browser on the same machine, use `http://localhost:3000`.

If the UI is built and hosted separately:

```bash
cd client
npm ci
VITE_API_BASE_URL=http://GPU_MACHINE_IP:5000 npm run build
```

The generated `client/dist/` directory can be served by any static web
server. The API must remain reachable at the configured `VITE_API_BASE_URL`.

## 6. Seed the prompt catalog

The API container includes the catalog seed script. Run it after MongoDB is
healthy:

```bash
docker compose exec api npm run seed
```

The seed script upserts the supported packs and removes obsolete IDs from
earlier versions. Current packs include:

- 4-Second Video Ad Scenes
- Thumbnail Hook Systems
- YouTube Shorts Thumbnails
- Instagram Reels Ad Covers
- Shorts Hook Scenes

The frontend has a fallback catalog for temporary API outages, but MongoDB is
the source of truth when the API is available.

## 7. Verify the deployment

Check service status:

```bash
docker compose --profile gpu ps
```

Check the API and database:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/categories
curl 'http://localhost:5000/api/prompts?mediaType=image'
curl 'http://localhost:5000/api/prompts?mediaType=video'
```

Expected health response:

```json
{"status":"ok","database":"connected"}
```

View worker logs:

```bash
docker compose logs -f gpu-worker
docker compose logs -f video-worker
```

The workers should report that the model loaded and that they are ready.

## 8. API contracts

All generation is asynchronous. A create request returns `202 Accepted` with
a job ID and status URL. Poll the status URL until the status is `completed` or
`failed`.

### Prompt catalog

```http
GET /api/prompts
GET /api/prompts/:id
GET /api/categories
```

`GET /api/prompts` accepts `collection` and `mediaType=image|video`.

### Favorites

```http
GET    /api/favorites
PUT    /api/favorites/:id
DELETE /api/favorites/:id
```

Authentication is not implemented yet. Development favorites use the fixed
`local-dev-user` account and are persisted in MongoDB.

### Image generation

```http
POST /api/images
Content-Type: application/json
```

Request:

```json
{
  "prompt": "A dramatic YouTube thumbnail of a creator discovering a hidden feature",
  "width": 1024,
  "height": 576,
  "steps": 10,
  "seed": 42
}
```

The SDXL worker claims the job from MongoDB and writes
`/generated/<job-id>.png`.

```http
GET /api/images/:id
```

Completed response:

```json
{
  "jobId": "job-id",
  "status": "completed",
  "prompt": "A dramatic YouTube thumbnail...",
  "url": "/generated/job-id.png",
  "completedAt": "2026-10-14T10:00:00.000Z"
}
```

### Video generation

```http
POST /api/videos
Content-Type: application/json
```

Request:

```json
{
  "prompt": "A polished 4-second vertical product reveal with a smooth camera push-in",
  "width": 576,
  "height": 1024,
  "frames": 49,
  "fps": 16,
  "steps": 20,
  "guidanceScale": 5,
  "seed": 42,
  "cpuOffload": false
}
```

Video constraints are intentional: `frames` must be `5 + a multiple of 4`
between 5 and 161; dimensions must be between 256 and 1536 and divisible by
8; FPS is 1-60; steps is 1-100; guidance scale is 0-20.

```http
GET /api/videos/:id
```

The Wan 2.1 worker writes completed files to
`/generated/<job-id>.mp4`. The frontend renders this URL in a video player.

## 9. Runtime storage

Docker volumes persist MongoDB and generated API outputs:

- `mongodb_data`: MongoDB database files.
- `generated_outputs`: completed PNG and MP4 job outputs.

The host `outputs/` directory is mounted into GPU workers for the LoRA and
other local model artifacts. It is ignored by Git and must be backed up
separately if outputs or model adapters matter.

Prompt-pack demo videos should be stored separately from generated job output,
for example:

```text
outputs/prompt-previews/
  shorts-hook-scenes/
    pattern-interrupt.mp4
  text-to-video-ad-scenes/
    product-reveal.mp4
```

For production, use S3, Cloudflare R2, or another object store and save only
the URL in the prompt-pack document. Do not store video binaries in MongoDB.

## 10. Development without Docker

Start MongoDB separately, then run the API:

```bash
cd server
npm ci
MONGO_URL=mongodb://127.0.0.1:27017/thumbnail_generator npm start
```

Run the frontend:

```bash
cd client
npm ci
VITE_API_BASE_URL=http://localhost:5000 npm run dev
```

Run workers from an environment containing the matching CUDA dependencies:

```bash
python worker.py
python worker_video.py
```

Do not run both workers in the same Python process. Each worker owns a
different MongoDB collection and model pipeline.

## 11. Tests and release checks

Run the backend syntax check:

```bash
cd server
npm test
```

Run frontend type checking:

```bash
cd client
npm run lint
```

Run Python syntax checks:

```bash
python -m py_compile generate_image.py generate_video.py worker.py worker_video.py mux_audio.py
```

Validate Compose:

```bash
docker compose config --quiet
```

Run the dataset tests when the dataset is available:

```bash
python -m unittest discover -s tests
```

## 12. Troubleshooting

### `database: disconnected`

Check MongoDB logs and service status:

```bash
docker compose logs mongodb
docker compose ps
```

### Worker remains idle

Confirm the API created a queued job, then inspect the matching worker logs.
The image worker watches `generationjobs`; the video worker watches `videojobs`.
Verify both services use the same `MONGO_URL`.

### CUDA is unavailable

Run `nvidia-smi` on the host and the CUDA container test from section 2.
Confirm Docker was installed with NVIDIA Container Toolkit and that the
Compose service has `gpus: all`.

### Out of memory

For Wan 2.1, reduce to 49 frames, use `640x368` or another smaller divisible
resolution, and enable CPU offload in the request. For SDXL, reduce resolution
and generation steps, and keep one job per worker.

### Browser cannot reach the API

Set `VITE_API_BASE_URL` to the GPU machine's reachable IP address, expose port
5000 in the firewall, and restart the Vite dev server after changing it.

### Model download or Hugging Face authentication

Public models normally download without a token. If the chosen model requires
authentication, log in on the GPU host or pass a token through a protected
environment variable. Never commit tokens to `.env`, Dockerfiles, or source.

## 13. Important operational commands

```bash
# Start in background
docker compose --profile gpu up --build -d

# Follow all logs
docker compose logs -f

# Stop services without deleting data
docker compose --profile gpu down

# Stop and delete persistent MongoDB/output volumes (destructive)
docker compose --profile gpu down -v

# Rebuild only after code or dependency changes
docker compose --profile gpu build
```

The repository is ready to be pulled onto the GPU machine after the release
checks above pass. Keep the GPU machine's `.env`, model cache, LoRA adapter,
dataset, and generated outputs outside Git.
