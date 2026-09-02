# DWARKA story review site

This repository contains the public story-review website for a proposed Mahabharata-era browser game.

Public site: <https://dwarka-story-review.adityapratap2307.chatgpt.site>

The website compares four story candidates and gives each one a complete illustrated chapter. Story A, Vrishaketu, is confirmed for implementation.

## Start here

Current Chapter 1 implementation agents should read only [`docs/chapter-1-game-handoff.md`](docs/chapter-1-game-handoff.md). It contains Chapter 0, playable Chapter 1, session progress, PlayCanvas and server design, approved assets, EgoLite workflow, UI tests, acceptance criteria, and the copy-paste autonomous prompt.

Agents working after Chapter 1 is complete must also read [`docs/future-chapters-game-handoff.md`](docs/future-chapters-game-handoff.md). It contains the approved biome map, weapon progression, system-reuse contract, campaign progress rules, future asset workflow, environment acceptance tests, and the next autonomous prompt. Future decisions must not expand the current Chapter 1 build.

## Project map

| Path | Purpose |
| --- | --- |
| `docs/chapter-1-game-handoff.md` | Complete autonomous specification for non-playable Chapter 0 and playable Chapter 1 |
| `docs/future-chapters-game-handoff.md` | Approved implementation handoff for Bhadravati and later chapters |
| `docs/game-planning-handoff.md` | Complete story sequence and cultural background |
| `docs/research/mahabharata-future-weapons-progression.md` | Cited weapon research and approved ownership rules |
| `app/page.tsx` | Four-story comparison page |
| `app/vrishaketu/page.tsx` | Complete confirmed story with 32 panels |
| `app/emberborn/page.tsx` | Complete Story B chapter |
| `app/babhruvahana/page.tsx` | Complete Story C chapter |
| `app/abhimanyu/page.tsx` | Complete Story D chapter |
| `public/story-a/` | Vrishaketu storyboard images |
| `public/story-b/` | Emberborn storyboard images |
| `public/story-c/` | Babhruvahana storyboard images |
| `public/story-d/` | Abhimanyu storyboard images |
| `.openai/hosting.json` | ChatGPT Sites project reference |

The deployed application is still the story reader. Local Chapter 1 runtime work may be present, but it remains incomplete until the Chapter 1 handoff's browser, session, combat, accessibility, and performance checks pass.

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
