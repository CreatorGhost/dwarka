# DWARKA story review site

This repository contains the public story-review website for a proposed Mahabharata-era browser game.

Public site: <https://dwarka-story-review.adityapratap2307.chatgpt.site>

The website compares four story candidates and gives each one a complete illustrated chapter. Story A, Vrishaketu, is the recommended direction.

## Start here

Game-planning agents should read [`docs/game-planning-handoff.md`](docs/game-planning-handoff.md) before inspecting the application code. It separates settled story rules, current recommendations, open decisions, existing assets, and the expected planning output.

## Project map

| Path | Purpose |
| --- | --- |
| `docs/game-planning-handoff.md` | Canonical local handoff for the next planning agent |
| `app/page.tsx` | Four-story comparison page |
| `app/vrishaketu/page.tsx` | Complete recommended story with 32 panels |
| `app/emberborn/page.tsx` | Complete Story B chapter |
| `app/babhruvahana/page.tsx` | Complete Story C chapter |
| `app/abhimanyu/page.tsx` | Complete Story D chapter |
| `public/story-a/` | Vrishaketu storyboard images |
| `public/story-b/` | Emberborn storyboard images |
| `public/story-c/` | Babhruvahana storyboard images |
| `public/story-d/` | Abhimanyu storyboard images |
| `.openai/hosting.json` | ChatGPT Sites project reference |

The deployed application is a story reader, not a game runtime. There is no player controller, combat system, enemy AI, level loader, save system, or game state machine yet.

## Local development

Requirements:

- Node.js 22.13 or newer
- npm

Commands:

```bash
npm install
npm run dev
npm run build
```

Use `npm run build` as the release check for the current site.

## Deployment

The site is hosted with ChatGPT Sites and is public. Reuse the existing project reference in `.openai/hosting.json`. Do not create another Sites project for this repository.

## Older prototypes

The HTML files in `/Users/adityapratapsingh/dev/dwarka/docs/` were used for early story comparison and manga experiments. They remain useful as historical context, but they do not contain the latest chapter explanations. Use this repository and the handoff document for current work.
