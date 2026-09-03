# DWARKA Chapter 1

`site/public/playcanvas/chapter-1/` is the checked-in PlayCanvas engine export used by the site. The readable source is in `game/client-scripts/`; the authoritative 20 Hz WebSocket simulation is in `game/server/`.

The WebSocket server fails closed unless `game/server/.env.local` supplies a stable `DWARKA_PROGRESS_SECRET` of at least 24 characters. Keep that local file private and reuse it across restarts so already-issued progress tokens remain valid.

## Local play

1. In `game/server`, run `npm install` and `npm start`.
2. In `site`, run `npm install` and `npm run dev`.
3. Open the site URL, usually `http://localhost:3000`.

The game server defaults to `ws://localhost:3210` only in local development. Set `DWARKA_WS_URL` on the hosted site to the Render service's `wss://…` URL. The static game export accepts the same URL through its `?ws=` parameter and refuses insecure non-local endpoints.

## Production deployment

The authoritative server is container-ready for a Render Free Web Service. Build its Linux/AMD64 image from the repository root with `game/server/Dockerfile`, then configure Render with:

- Region: Singapore
- Instance type: Free
- Health check path: `/healthz`
- `DWARKA_ALLOWED_ORIGINS`: the exact HTTPS Sites origin
- `DWARKA_PROGRESS_SECRET`: one stable random value of at least 24 characters, retained across every deployment

Do not configure any Sarvam or other voice-provider credentials in production. All shipped voice and effects audio is already cached under `site/public/audio/`. Render terminates TLS, exposes the same service as HTTPS/WSS, and supplies `PORT` automatically.

## Verification

- `npm test` in `game/server` runs token, movement, collision, phase, and simulation tests.
- `npm run build` and `npm test` in `site` verify the production site and route contract.
- Real-browser evidence is stored under `site/tests/browser-artifacts/`.

## Fixed voice cache

Run `npm run voice:generate` in `game/server` to build the fixed Chapter 0 and Chapter 1 voice cache. The generator uses Sarvam's REST TTS and STT endpoints when it can load `VOICE_PROVIDER_API_KEY` or an authorized credential CSV. Set `SARVAM_CREDENTIAL_CSV` to override the local credential path and `SARVAM_CREDENTIAL_INDEX` to choose the first row attempted. The adapter rotates through usable rows on authentication, quota, or rate-limit failure, stops on the first successful key, and keeps that selection only in process memory. Keys never enter the manifest, ledger, static export, logs, or browser storage.

`VOICE_PROVIDER_MODEL` defaults to `bulbul:v3`; `VOICE_STT_MODEL` defaults to `saaras:v3`. Every MP3 is transcribed and checked against its expected localized script before the manifest marks it `validated`. The generator also writes an OGG copy. Valid cached entries are reused on later runs.

If no credential is available, the same command uses macOS `say` plus `ffmpeg` and marks every entry `development-fallback`. That mode is useful for layout and playback work but does not pass the release voice check. `npm run voice:check` requires a complete Sarvam-validated manifest.
