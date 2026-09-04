# DWARKA: The Lost City

**▶ Play it now: <https://dwarka-lost-city.vercel.app>** — no install, no login, desktop browser.

**Repo:** <https://github.com/CreatorGhost/dwarka>

A Mahabharata-era third-person browser action game. You play **Vrishaketu**, the surviving son of Karna, defending the charioteers' quarter through one night raid. Chapter 1 is playable end to end; it opens with a narrated eight-panel prologue covering Karna's last day and the raid, in five languages with voice. Adapted from the **Jaiminiya Ashvamedha Parva**.

> **It plays without a backend.** The game runs start to finish offline — only cross-session progress saving degrades. You do not need to run the server, set any environment variable, or sign in to play.

---

## Repo layout — read this before you clone

**This repository has two branches with different content.** If you clone it and find `site/` missing, this is why.

| Branch | Contains | Why |
| --- | --- | --- |
| `main` | `game/` — server, client scripts, asset ledger — plus `docs/` and this README | The game source of truth |
| `chapter-1-tranche-a` | The site **at the branch root**: `app/`, `public/`, `tests/`, `tools/` | Built as its own repo inside `site/`, so its files sit at the root of its branch, not under `site/` |

They were developed as two separate working copies (`dwarka/` and `dwarka/site/`) that share one remote. To get both:

```bash
git clone https://github.com/CreatorGhost/dwarka.git
cd dwarka                                   # you are on main: game/ and docs/

git clone -b chapter-1-tranche-a https://github.com/CreatorGhost/dwarka.git site
cd site                                     # the site, at this branch's root
```

After that you have the same layout the project was built in: `dwarka/game/…` and `dwarka/site/…`.

```
dwarka/
├── game/                       # branch: main
│   ├── server/                 # authoritative Node WebSocket server (20 Hz)
│   ├── client-scripts/         # PlayCanvas gameplay source, bundled by Vite
│   └── asset-ledger.md         # every third-party asset, licence and hash
├── docs/                       # design context (see "For AI agents" below)
└── site/                       # branch: chapter-1-tranche-a
    ├── app/                    # React front end: title, narrated opening, game shell
    ├── public/playcanvas/      # the built, served game bundle
    ├── public/story-a/         # story panel art
    └── tools/                  # art generation, static build
```

---

## Run it locally

Node **22.19+** (`.nvmrc`-free; `node --version` must be ≥ 22.13).

### Fastest path — the game, no server

```bash
cd site
npm install
npm run dev
```

Open <http://localhost:3000>. You get the title screen, the narrated opening and playable Chapter 1. The game connects to `ws://localhost:3210` in development; when nothing is listening it falls back to offline play automatically.

### With the authoritative server

The server **will not start without a signing secret** (see below).

```bash
cd game/server
npm install
printf 'DWARKA_PROGRESS_SECRET=%s\n' "$(openssl rand -base64 32)" > .env.local
npm start          # listens on :3210
```

Then in a second terminal run the site as above. Health check: <http://localhost:3210/healthz> returns `{"ok":true,"service":"dwarka-chapter-1"}`.

---

## Environment variables

Playing the game needs **none**. Running the server needs **one**.

| Variable | Where | Required | Notes |
| --- | --- | --- | --- |
| `DWARKA_PROGRESS_SECRET` | `game/server/.env.local` | **Yes, to start the server** | HMAC key for signed progress tokens. **Minimum 24 characters.** The server exits on startup without it. The file is gitignored and is correctly absent from this repo — you must create it. |
| `DWARKA_ALLOWED_ORIGINS` | server env | Production only | Comma-separated HTTPS origins allowed to open a WebSocket. In production the server refuses to start with an empty list and returns **403** on upgrade from any other origin. |
| `DWARKA_WS_URL` | `site/.env.local` | No | Defaults to `ws://localhost:3210` in development. Outside localhost only `wss://` is accepted, so an HTTPS page can never be handed a blockable socket. |
| `DWARKA_SITE_URL` | site build | No | Absolute origin baked into OG/Twitter metadata for a static build. |
| `OPENAI_API_KEY` | shell | No | Only to regenerate story art (`site/tools/gen-story-panels.py`). Never needed to play. |
| Sarvam credential | shell | No | Only to regenerate narration voice. Never needed to play. |

**Keep `DWARKA_PROGRESS_SECRET` stable across restarts.** Rotating it invalidates every progress token already issued, and returning players get "Saved progress could not be verified" and restart the chapter.

---

## Tests

```bash
cd game/server && npm test && npm run typecheck     # 82 tests
cd site && npm test                                  # 45 tests
```

Both suites are expected green. The site suite builds the game bundle first, so it also catches the served export drifting from `game/client-scripts`.

---

## Architecture

- **Client** — PlayCanvas 2.21, authored as ES modules in `game/client-scripts/`, bundled by Vite into `site/public/playcanvas/chapter-1/`. The browser owns movement, camera and animation at frame rate.
- **Server** — Node WebSocket at 20 Hz in `game/server/`. Authoritative over enemy AI, damage, death, the family timer, phase progression and HMAC-signed progress. It validates every position update rather than replaying input.
- **Site** — React front end on vinext (Next.js conventions on Vite). Every page is a client component; the game is embedded in an iframe and talks to the shell over `postMessage`.
- **Localisation** — five locales (en, hi, ta, kn, te) in native script, with generated narration voice resolved at runtime from `site/public/audio/chapter-1/voice-manifest.json`.

---

## Deployment

| Piece | Where |
| --- | --- |
| **Live game** | <https://dwarka-lost-city.vercel.app> |
| Frontend host | Vercel, project `dwarka`, static build from `site/dist-static` |
| Backend | Render, free Singapore web service `dwarka-chapter-1-server` |
| Gameplay socket | `wss://dwarka-chapter-1-server.onrender.com` |
| Health | <https://dwarka-chapter-1-server.onrender.com/healthz> |
| Server image | `102811061289/dwarka-chapter-1-server:20260904-prod` (linux/amd64) |

Rebuild the frontend static bundle with `cd site && npm run build:static`, which produces `site/dist-static/`; deploy it with `npx vercel --prod` from that directory.

**Cold start.** The Render free tier spins the service down when idle, and the first request takes roughly 22 seconds. The title screen fires a health ping on mount, so the server wakes while the player is reading the opening and is warm by the time they reach the street. If it still is not up, the game plays offline rather than blocking.

---

## Assets and licensing

Every third-party asset is recorded in [`game/asset-ledger.md`](game/asset-ledger.md) with its source, licence and hash. All are CC0, CC-BY or Mixamo-licensed; nothing is non-commercial and nothing was purchased.

- **Story art** — generated with OpenAI `gpt-image-2` at 2048×1152. Synthetic.
- **Narration voice** — generated with Sarvam `bulbul:v3` across five locales. Synthetic, and disclosed as such in the voice manifest.
- **Music** — "Last 31" and "Dust" by Tri-Tachyon (CC-BY 4.0); ambience "Searching" by yd (CC0). Credited in-game.
- **Models, kits and sound effects** — Quaternius, Kenney and Poly Haven (CC0).
- **Story** — adapted from the Jaiminiya Ashvamedha Parva and later regional traditions, credited on the title screen and in the opening.

---

## For AI agents picking this up

The load-bearing context lives in [`docs/`](docs/) on `main`:

| Document | What it settles |
| --- | --- |
| `docs/chapter-1-runbook.md` | Paths, commands, who owns what, and the decision rules to use when nobody can ask the owner |
| `docs/chapter-1-engineering-guidance.md` | Binding numeric targets — frame luma, fps floor, input latency, draw calls — and the "engine-native first" rule |
| `docs/three-chapter-structure.md` | The whole story, its three chapters and their beat ladders |
| `docs/chapter-1-quality-audit.md` | The original audit and the definition of done |

**Cultural rules are binding** and are restated in the runbook: no deity is playable or fightable, no health bar on a revered figure, Karna's fatal arrow is never shown, dialogue stays restrained, raiders are rakshasa raiders and never "guards", and the Jaiminiya attribution is always credited.

---

## Known gaps

Stated honestly rather than discovered later:

- **Environment art scores about 6.5/10** against good third-person browser builds. The front end and narration are stronger than the playable street.
- **A Unity rebuild was attempted and abandoned**; that track is excluded from this repo. PlayCanvas is the shipped engine.
- **Render's free tier cold-starts (~22 s)** on first hit. Mitigated by the title-screen warm-up, never eliminated.
- **No jump.** Movement is walk, sprint and dodge; it was cut deliberately.
- Chapters 2 and 3 exist as story and art, not as playable levels.
