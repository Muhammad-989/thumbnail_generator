# Frontend

This directory contains the React/Vite browser client for Thumbnail Generator.
The complete GPU-machine setup, Docker architecture, API contracts, model
requirements, and troubleshooting guide are in the repository
[README.md](../README.md).

## Local development

Requires Node.js 22 or newer:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.local` when the API is not on
`http://localhost:5000`.

## Checks

```bash
npm run lint
npm run build
```

The frontend has two model paths:

- SDXL for YouTube thumbnail/image jobs through `/api/images`.
- Wan 2.1 for 4-second text-to-video jobs through `/api/videos`.

See [API.md](./API.md) for the frontend flow and endpoint contracts.
