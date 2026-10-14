# Frontend and API architecture

The frontend is a React/Vite client. It does not run model inference. It
loads prompt packs, submits asynchronous jobs to the Express API, polls job
status, and renders the returned asset URL.

## Frontend flow

1. `src/App.tsx` loads MongoDB-backed prompt packs.
2. `src/components/AdCard.tsx` renders catalog cards.
3. `PromptDetailView` displays variants and preserves the pack media type.
4. `PlaygroundModal` lets the user choose `SDXL · YouTube thumbnails` or
   `Wan 2.1 · 4-second videos`.
5. Image mode submits `/api/images`; video mode submits `/api/videos`.
6. The modal polls the returned `statusUrl` until the job completes.
7. `resolveApiUrl` converts the API-relative result URL into a browser URL.

`src/data/sampleCreatives.ts` is only a fallback catalog for API outages.
MongoDB is the catalog source of truth after running `server/seed.js`.

## Configuration

The API defaults to `http://localhost:5000`. Set this in
`client/.env.local` when the browser and API use different hosts:

```dotenv
VITE_API_BASE_URL=http://GPU_MACHINE_IP:5000
```

The Vite client defaults to port `3000`.

## Common response conventions

- `200`: successful read or status lookup.
- `201`: favorite created.
- `202`: generation job accepted and queued.
- `400`: validation error; response contains `{ "error": "..." }`.
- `404`: requested prompt or job does not exist.
- `500`: unexpected server error.

Generation job status is separate from HTTP status:

```text
queued -> processing -> completed
                     \-> failed
```

## Prompt catalog endpoints

### `GET /api/prompts`

Optional query parameters:

- `collection`
- `mediaType=image|video`

Example:

```http
GET http://localhost:5000/api/prompts?mediaType=video
```

Each prompt pack includes an ID, title, media type, variants, use case, and
model compatibility metadata:

```json
{
  "id": "text-to-video-ad-scenes",
  "title": "4-Second Video Ad Scenes",
  "tagline": "Text prompts for compact cinematic clips that stop the scroll.",
  "kicker": "Short-form video",
  "collection": "Thumbnails",
  "mediaType": "video",
  "itemCount": 3,
  "image": "/assets/images/cyberpunk_motion_1791460573506.jpg",
  "previewImage": "/assets/images/cyberpunk_motion_1791460573506.jpg",
  "useCase": "Short-form text-to-video generation",
  "worksWith": "Wan 2.1, AI Playground",
  "variants": [
    {
      "id": "product-reveal",
      "name": "Product reveal",
      "prompt": "A polished 4-second product reveal..."
    }
  ],
  "relatedPrompts": []
}
```

### `GET /api/prompts/:id`

Returns one prompt pack or:

```json
{ "error": "prompt pack not found" }
```

### `GET /api/categories`

Returns the values displayed in the prompt category dropdown.

## Favorite endpoints

```http
GET    /api/favorites
PUT    /api/favorites/:id
DELETE /api/favorites/:id
```

Authentication is not implemented yet. The server currently persists
favorites under the fixed development user ID `local-dev-user`.

## Health endpoint

```http
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Image generation

### `POST /api/images`

Queues an SDXL image job for the image GPU worker:

```json
{
  "prompt": "A dramatic YouTube thumbnail of a creator discovering a hidden feature",
  "width": 1024,
  "height": 576,
  "steps": 10,
  "seed": 42
}
```

Defaults are width `512`, height `512`, steps `10`, and seed `42`.
Dimensions must be integers from `256` to `2048`. Steps must be from `1` to
`100`. Seed must be from `0` to `2147483647`.

Response (`202`):

```json
{
  "jobId": "job-id",
  "status": "queued",
  "statusUrl": "/api/images/job-id"
}
```

### `GET /api/images/:id`

Completed response:

```json
{
  "jobId": "job-id",
  "status": "completed",
  "prompt": "A dramatic YouTube thumbnail...",
  "createdAt": "2026-10-14T10:00:00.000Z",
  "url": "/generated/job-id.png",
  "completedAt": "2026-10-14T10:00:08.000Z"
}
```

The image worker claims documents from MongoDB's `generationjobs` collection,
loads the SDXL pipeline once, and writes the PNG to the shared generated
output volume.

## Video generation

### `POST /api/videos`

Queues a Wan 2.1 text-to-video job:

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

Validation rules:

- Prompt: non-empty, maximum 2,000 characters.
- Dimensions: `256-1536`, divisible by 8.
- Frames: `5 + a multiple of 4`, from 5 to 161.
- FPS: integer from 1 to 60.
- Steps: integer from 1 to 100.
- Guidance scale: number from 0 to 20.
- Seed: integer from 0 to 2147483647.

Response (`202`):

```json
{
  "jobId": "video-job-id",
  "status": "queued",
  "statusUrl": "/api/videos/video-job-id",
  "prompt": "A polished 4-second vertical product reveal...",
  "createdAt": "2026-10-14T10:00:00.000Z"
}
```

### `GET /api/videos/:id`

Completed response:

```json
{
  "jobId": "video-job-id",
  "status": "completed",
  "prompt": "A polished 4-second vertical product reveal...",
  "createdAt": "2026-10-14T10:00:00.000Z",
  "url": "/generated/video-job-id.mp4",
  "completedAt": "2026-10-14T10:02:00.000Z"
}
```

The video worker claims documents from MongoDB's `videojobs` collection,
keeps the Wan 2.1 pipeline in GPU memory, and writes MP4 files to the shared
generated output volume.

## Static assets and generated files

- `/assets/*` serves bundled frontend assets copied into the API container.
- `/generated/*` serves completed image and video job files.
- API-relative URLs must be prefixed with the API origin in a separately
  hosted frontend.

Generated job output is persisted by the Compose `generated_outputs` volume.
Permanent prompt-pack demo videos should use object storage in production;
MongoDB should store their URL, not the binary.

## Operational ownership

| Concern | Owner |
| --- | --- |
| Prompt catalog and favorites | Express/Mongoose API |
| Image inference | `worker.py` and `generate_image.py` |
| Video inference | `worker_video.py` and `generate_video.py` |
| Job coordination | MongoDB status documents |
| Browser polling | `PlaygroundModal.tsx` |
| Runtime files | `generated_outputs` Docker volume |
