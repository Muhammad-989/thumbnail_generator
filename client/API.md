# Frontend API notes

This document describes the API currently available to the frontend and marks
the places where the UI is still using demo/local behavior. The goal is to give
you a map for replacing each piece yourself without changing the UI contract
all at once.

## How to read the frontend

The main flow starts in `src/App.tsx`:

1. `PROMPT_PACKS` is imported from `src/data/sampleCreatives.ts`.
2. `packs` holds that local catalog.
3. `filteredPacks` applies the search text and media category.
4. `AdCard` renders each result.
5. Clicking a card sets `activePack`, which switches to `PromptDetailView`.
6. “Use prompt” copies the selected text into `PlaygroundModal`.
7. The modal currently runs a timer instead of calling the server.

State names are useful landmarks while reading:

- `packs`: all catalog records currently loaded.
- `activePack`: the detail page record, or `null` for the catalog.
- `likedIds`: saved IDs currently held only in browser memory.
- `playgroundPrompt`: text passed from a card/detail view to the modal.
- `isGenerating` and `generationProgress`: simulated generation state.

The inline comments marked `TODO(API)` are next to the code that should change.

## Current API

The Express server runs on `http://localhost:5000` by default
(`server/index.js`). The Vite client runs on port `3000`.

The frontend uses `src/api.ts` as its typed request boundary. Set
`VITE_API_BASE_URL=http://localhost:5000` in `client/.env.local` when the API
is not served from the same origin.

### `GET /api/prompts`

Returns prompt packs stored in MongoDB. Optional filters are
`collection` and `mediaType=image|video`.

```json
[
  {
    "id": "image-to-video-motion",
    "title": "Image-to-Video Motion",
    "tagline": "Animate stills while preserving identity and detail.",
    "kicker": "Cinematic motion",
    "collection": "Thumbnails",
    "mediaType": "video",
    "itemCount": 3,
    "image": "/assets/images/cyberpunk_motion_1791460573506.jpg",
    "previewImage": "/assets/images/motion_portrait_preview_1791518653763.jpg",
    "useCase": "Image-to-video generation",
    "worksWith": "Picsart AI Video, AI Playground",
    "variants": [
      {
        "id": "subtle-portrait",
        "name": "Subtle portrait",
        "prompt": "Animate the uploaded creator portrait..."
      }
    ],
    "relatedPrompts": []
  }
]
```

The client loads this endpoint in `App.tsx`. If the API is unavailable, it
falls back to the bundled sample catalog so the UI remains usable.

### `GET /api/prompts/:id`

Returns one MongoDB prompt document using its stable ID, or `404`:

```json
{
  "error": "prompt pack not found"
}
```

### `GET /api/health`

Checks whether the API is running and whether MongoDB is connected.
The HTTP status is `200` when the handler responds successfully.

```json
{
  "status": "ok",
  "database": "connected"
}
```

Example request:

```http
GET http://localhost:5000/api/health
```

### `GET /api/categories`

Returns the categories used by the Prompts dropdown in `HeroSection`.

Response (`HTTP 200`):

```json
[
  "Thumbnails",
  "Video ads & clips",
  "Product visuals",
  "Social visuals",
  "All prompts"
]
```

The frontend calls this endpoint when `HeroSection` mounts. If the request
fails, the dropdown displays a small fallback list.

### `GET /api/favorites`

Returns saved prompt IDs for the current user. Authentication is not wired yet. The current server uses the fixed development
user ID `local-dev-user`, but favorites are persisted in MongoDB.

Response (`HTTP 200`):

```json
["product-shot-systems"]
```

### `PUT /api/favorites/:id`

Saves a prompt ID.

Example:

```http
PUT http://localhost:5000/api/favorites/image-to-video-motion
```

Response (`HTTP 201`):

```json
{
  "id": "image-to-video-motion",
  "saved": true
}
```

### `DELETE /api/favorites/:id`

Removes a saved prompt ID.

Response (`HTTP 200`):

```json
{
  "id": "image-to-video-motion",
  "saved": false
}
```

### `POST /api/images`

Creates an image-generation job. The endpoint responds immediately with
`202 Accepted`; it does not return the generated image in the same response.

Request:

```json
{
  "prompt": "A cinematic thumbnail of a product launch",
  "width": 1024,
  "height": 576,
  "steps": 10,
  "seed": 42
}
```

Defaults are `width: 512`, `height: 512`, `steps: 10`, and `seed: 42`.
`width` and `height` must be integers from `256` to `2048`; `steps` must be
from `1` to `100`; and `seed` must be from `0` to `2147483647`.

Successful response (`HTTP 202`, not `200`):

```json
{
  "jobId": "jjf29j223jd",
  "status": "queued",
  "statusUrl": "/api/images/jjf29j223jd"
}
```

The `status` field describes the job; the HTTP status describes the request.
They are different things. For example, the request can return HTTP `202`
while the job has `status: "queued"`.

Validation failure (`HTTP 400`):

```json
{
  "error": "prompt is required and must be at most 2000 characters"
}
```

### `GET /api/images/:id`

Polls a generation job. The `status` is one of `queued`, `processing`,
`completed`, or `failed`.

While running:

```json
{
  "jobId": "jjf29j223jd",
  "status": "processing",
  "prompt": "green ball",
  "createdAt": "2026-10-09T10:00:00.000Z"
}
```

Completed response (`HTTP 200`):

```json
{
  "jobId": "jjf29j223jd",
  "status": "completed",
  "prompt": "green ball",
  "createdAt": "2026-10-09T10:00:00.000Z",
  "url": "/generated/jjf29j223jd.png",
  "completedAt": "2026-10-09T10:00:08.000Z"
}
```

Failed response (`HTTP 200`, because the job was found):

```json
{
  "jobId": "jjf29j223jd",
  "status": "failed",
  "prompt": "green ball",
  "createdAt": "2026-10-09T10:00:00.000Z",
  "error": "generation failed"
}
```

Unknown job (`HTTP 404`):

```json
{
  "error": "generation job not found"
}
```

The `url` is relative to the API server, for example
`/generated/result.png`. Prefix it with the API origin before using it in an
`img` or `video` element when the client and API run on different ports.

## Frontend request pseudocode

This is the shape the code in `PlaygroundModal.tsx` should eventually follow:

```ts
const response = await fetch(`${API_BASE_URL}/api/images`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: promptText,
    width: 576,
    height: 1024,
    steps: 10,
    seed: 42,
  }),
});

if (!response.ok) {
  const body = await response.json();
  throw new Error(body.error);
}

const job = await response.json();
// job = { jobId, status: 'queued', statusUrl }
```

After that request, use `job.statusUrl` (or `GET /api/images/${job.jobId}`)
instead of inventing a URL. Poll until `status` is `completed` or `failed`;
then use `job.url` only for a completed job.

## What is local today

| UI behavior | Current implementation | API work to do |
| --- | --- | --- |
| Prompt catalog | `src/data/sampleCreatives.ts` imported by `src/App.tsx` | Add a catalog endpoint such as `GET /api/prompts`, then fetch and map its response to `PromptPack[]`. |
| Search and category filtering | `useMemo` in `src/App.tsx` filters the local array | Initially, client-side filtering can stay. Move it server-side later with query parameters if the catalog becomes large. |
| Prompt detail | The whole `PromptPack` object is already in memory | Navigate/store the prompt ID, then request `GET /api/prompts/:id` when opening the detail view. |
| Related prompts | `handleSelectRelatedPrompt` searches by title | Return related prompt IDs from the API and fetch by ID; do not use title matching as an identifier. |
| Saved prompts | `likedIds` is an in-memory `Set` with one hard-coded ID | Add authenticated `GET`, `POST`, and `DELETE` favorite endpoints and load the current user's saved IDs. |
| My content | `Sidebar.tsx` exposes a callback, but `App.tsx` does not render the sidebar | Decide whether this feature is needed, then add `GET /api/me/content` (or equivalent) and connect the callback. |
| Generate button | `PlaygroundModal.tsx` advances a timer with `setInterval` | Call `POST /api/images`, poll its `statusUrl`, and show the completed `url` or server error. |
| Result preview | `PromptDetailView.tsx` displays bundled images and animates a scale transform | Use the generated media URL and real playback/progress state after generation. |
| Download | Creates a text file in the browser | Keep this for prompt text, or download the generated media URL when that is the intended action. |
| Share | Copies the current browser URL | Add stable prompt routes before sharing; optionally use a server short-link endpoint. |

The `TODO(API)` comments beside these implementations are intended as coding
landmarks.

The prompt catalog, favorites, detail, related prompts, and My Content rows in
the table are not all implemented. Favorites and categories are now available
as described above. The prompt catalog is now seeded into MongoDB by `server/seed.js`. My Content
and authentication still need database design.

The seed currently includes the two prompt packs needed to demonstrate the
Mongo-backed flow. Add more records to `server/seed.js` as the catalog grows;
the client will render any records that follow the `PromptPack` shape.

## MongoDB and Docker

Start MongoDB and the API together:

```bash
docker compose up -d --build mongodb api
```

Seed the prompt model from the host:

```bash
cd server
MONGO_URL=mongodb://localhost:27017/thumbnail_generator node seed.js
```

Validate the connection:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/prompts
```

The API container uses `mongodb://mongodb:27017/thumbnail_generator`; do not
use `localhost` inside a container because that points back to the API
container itself. The Python worker should use the same Docker hostname when
containerized:

```text
MONGO_URL=mongodb://mongodb:27017/thumbnail_generator
```

The worker claims MongoDB jobs and invokes the SDXL/LoRA model. It is not
included in the default Compose stack because the model image requires the
host's GPU/runtime setup. Run it locally after MongoDB is up, or add a
GPU-specific worker service later.

## Suggested client setup

When you start wiring requests, add an environment variable such as
`VITE_API_BASE_URL=http://localhost:5000` to `.env.local` (do not commit
secrets). A small typed request helper is a good place to centralize:

- joining the API origin with relative paths;
- checking `response.ok` and parsing `{ "error": "..." }`;
- handling JSON response types;
- adding authentication headers later.

For the generation flow, the main sequence should be:

1. Convert the selected aspect ratio (`9:16`, `1:1`, or `16:9`) to dimensions.
2. `POST /api/images` with the prompt and dimensions.
3. Store `jobId` and poll `GET /api/images/:id` every few seconds.
4. Stop polling on `completed` or `failed`, and always clean up the timer.
5. Prefix a relative completed `url` with `VITE_API_BASE_URL`.

## Response-shape mapping

The existing UI expects the `PromptPack` shape in
`src/types/creative.ts`, including nested `variants` and
`relatedPrompts`. If the backend uses different names, map the API response
once in a fetch/service layer rather than changing every presentational
component. Keep image fields as URLs or imported assets with a consistent
type.

## Backend gaps to implement later

The current server only implements health checks and image-generation jobs. It
does **not** yet provide prompt catalog, prompt detail, favorites, users, or
My Content endpoints. Those routes need persistence and, for favorites/content,
an authentication decision before the client can fully replace its local state.
