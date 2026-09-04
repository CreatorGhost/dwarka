---
title: "DWARKA runbook: everything needed to finish without the orchestrator"
kind: spec
---

# Runbook

If the orchestrator (agent `7237e131-4a18-481b-a045-f327a3c5b975`) goes away, this file is the single source of truth. Deadline **2026-09-06**, college hackathon, **zero budget, free assets only**, desktop browser 1920×1080, keyboard + mouse.

## Who is alive

| Agent | Id | Role |
| --- | --- | --- |
| Unity implementer | `e45334d2-dafe-48db-85d1-5ab8ca520963` | Owns the Unity rebuild end to end, plus setup/scout/research duties |
| PlayCanvas implementer | `6512a615-35e9-41d2-abde-a8f5be7cbc6b` | Owns the frozen fallback branch `chapter-1-tranche-a` @ `abcb9a7` |
| Luna env critic | `8b98fed7-ae4c-4cdf-9da3-c9a2e2f726cc` | Scores 8 vistas /10; loop until all ≥7 |
| Luna enemy/targeting | `eceed9cf-4c94-40eb-ac91-78c2747fb5f9` | Enemy AI + targeting UX; loop until 0 blockers/majors |

Dead (Grok balance exhausted, 402): setup `c7963664`, scout `579c1ffd`, research `d1dd4f42`, movement tester `f50bf96d`, combat tester `0a69d012`, pacing tester `58409661`. **If Grok credit returns, respawn the three testers first** (grok-4.6, high effort) using the protocols in artifacts `chapter-1-playtest-movement`, `chapter-1-playtest-combat`, `chapter-1-tester-pacing-story`.

## Paths and commands

```bash
# Unity
EDITOR=/Applications/Unity/Hub/Editor/6000.3.23f1/Unity.app/Contents/MacOS/Unity
PROJECT=/Users/adityapratapsingh/dev/dwarka/unity/DwarkaChapter1
HUBCLI="/Applications/Unity Hub.app/Contents/Resources/cli/unity"      # module installs
bash /Users/adityapratapsingh/dev/dwarka/unity/build-webgl.sh          # → site/public/unity/chapter-1/

# EditMode tests
"$EDITOR" -batchmode -projectPath "$PROJECT" -runTests -testPlatform EditMode \
  -testResults /tmp/editmode.xml
# Unity 6000.3 exits the runner itself. Adding -quit can exit before the XML is written.

# Site (serves both builds)
cd /Users/adityapratapsingh/dev/dwarka/site && npm run dev
#   Unity build:      http://localhost:3000/unity/chapter-1/index.html
#   PlayCanvas build: http://localhost:3000/game/chapter-1

# PlayCanvas fallback checks
cd /Users/adityapratapsingh/dev/dwarka/game/server && npm test && npm run typecheck   # 64 tests
cd /Users/adityapratapsingh/dev/dwarka/site && npm test                                # 25 tests

# Research (Traycer has NO Antigravity harness — shell out, write markdown)
agy --model gemini-3.8-flash-high --effort high -p='question' > unity/_research/topic.md 2>&1
# WRONG: agy -p "q" --model X   → "-p took --model as its prompt"
# Models: gemini-3.8-flash-high|medium|low, gemini-3.1-pro-high|low,
#         claude-opus-4-6-thinking, claude-sonnet-4-6, gpt-oss-120b-medium
```

Only `site/` is a git repo. `game/` and `unity/` are plain files. Never merge to `main`; never add a Co-Authored-By trailer.

## The two tracks

**Unity (primary).** Ticket `chapter-1-unity-rebuild`, queue Q1–Q11. Order: U0 empty WebGL build in the site route → import free village pack → U1 night lighting → U2 player → U3 enemies → U4 beats → U5 perf and sign-off. Chapter 2 and 3 ship as illustrated cards.

**PlayCanvas (fallback).** Frozen at `abcb9a7`: server 64/64, site 25/25, all eight vistas luma 0.209–0.298, native resolution, no teleport, post and shadows on. Playable end to end. **Ship this if Unity has not reached a night-lit playable street with a moving character by end of 2026-09-04.**

## Decision rules when nobody can ask the owner

1. Anything that keeps Chapter 1 shippable beats anything that improves it.
2. Free assets only. CC0 preferred; CC-BY needs a credits entry and a ledger row in `game/asset-ledger.md`. Never a purchase, never non-commercial.
3. Cut order if slipping: burning-lane chase → alley ambush → cold open becomes cards → captain becomes a stronger brute → Tamil/Kannada/Telugu text.
4. Never cut: night readability, smooth movement and aim, three encounters, families visibly threatened inside doorways, the Chitra ending, a build that runs from the site.
5. Desktop only. No mobile, touch, controller, or responsive work, ever.
6. Cultural rules bind: no playable or fightable deity, no health bar on a revered figure, no famous canonical kill by the player, never shoot Karna's likeness, restrained dialogue.
7. If a tool fight exceeds 30 minutes (MCP, importer, shader), abandon it and use the known-good path.

## Quality bar (measured, not self-scored)

Environment 7–8/10 vs good YouTube Unity/PlayCanvas third-person builds. Frame luma 0.18–0.30 sRGB at every vista. ≥45 fps (60 target) while moving at native 1920×1080. Key-to-motion <50 ms, stop slide <10 cm, foot-slide 0.9–1.1, dodge 20/20, i-frames per `game/config/chapter-1.json`, lock-on 10/10 on the bracketed enemy, enemy hit animation on every damage. Route: player walks ≥170 m of the level, never teleported on phase advance. Chapter 1 first run ≥6 minutes, target 15–20.

## Targeting presentation (owner-mandated, no red brackets)

Reticle tightens on lock; soft rim-glow outline on the target mesh; small colour-coded glyph above the attacker's head timed to windup (blade amber, archer white, brute red); brute ground telegraph as a soft radial decal; archer as a faint dashed tracer. Full spec in artifact `chapter-1-tester-enemies-targeting`.

## Key reference artifacts

`three-chapter-structure` (story, 3 chapters, beat ladders) · `chapter-1-unity-rebuild` (ticket, reuse table, schedule) · `chapter-1-engineering-guidance` (binding engineering rules) · `chapter-1-quality-audit` (original audit + tranche tickets + DoD) · `chapter-1-tester-*` and `chapter-1-critic-environment` (findings and specs) · `chapter-1-sim-net-review` (security/netcode review).
