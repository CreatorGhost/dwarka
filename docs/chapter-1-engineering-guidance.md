---
title: "Chapter 1 engineering guidance: how we build fast and smooth from here"
kind: spec
---

# Engineering guidance (binding for all Chapter 1 agents)

Written 2026-09-03 after the audit and two play-tests. The gap to the good PlayCanvas builds is workflow, not engine. These rules close it.

## 1. Engine-native first

Use what PlayCanvas 2.21 already ships before writing anything: anim state graph with 1D blend trees and masked layers, `particlesystem`, `CameraFrame` (bloom, SSAO, TAA, grading, vignette), skybox + `envAtlas`, clustered lights, `batcher`, `light.cookie`. A hand-written replacement for any of these needs a written reason in the commit.

## 2. Local simulation, server validation

The browser owns movement, camera and animation at frame rate. The server validates each position update (max displacement, collision, floor table, bounds) and owns enemy AI, damage, death, family timer, phases and signed progress. No seq-ack replay reconciliation; this is single-player.

## 3. Data, not coordinates in code

Nothing visual is placed from a JavaScript literal. World data lives in `world-layout.json` (or an Editor-exported scene) and code reads it. For Tranche C, author the level in the PlayCanvas Editor, export the scene, and derive colliders from tagged entities so the visible mesh and the blocker can never disagree.

## 4. Feel checklist (measured, not felt)

| Item | Target |
| --- | --- |
| Key-to-motion latency | < 50 ms |
| Stop slide | < 10 cm |
| Foot slide ratio | 0.9–1.1 at walk and sprint |
| Camera | damped spring on yaw, pitch and distance, ~0.1 s; sphere-cast occlusion, fast in, slow out |
| Aim | mouse drives aim yaw immediately; magnetism ≤ 0.4 rad; reticle on a real raycast; upper-body layer while legs keep locomotion; FOV 63→55 in 150 ms |
| Hit | 60–90 ms hit-stop on both actors, enemy `Hit_Chest`, spark + sound on the local swing timing |
| Dodge | 20/20 taps register; i-frames exactly per `config/chapter-1.json` |
| Footsteps | anim events, not timers |

## 5. Readability and performance budget

| Item | Target |
| --- | --- |
| Frame luma (no HUD) | 0.18–0.30 sRGB, ≤ 25 % pixels below 0.05, at every checkpoint |
| Warm light pool | at least one every 8 m of route; two per encounter |
| Silhouettes | archer, skirmisher, brute tellable at 15 m without HUD |
| Resolution | native 1.0 pixel ratio at 1920×1080; adaptive scale only after sustained < 50 fps, never below 0.8 |
| FPS | 60 target, 45 floor, in every region while moving |
| Draw calls | < 400 visible; shadow distance ≤ 30 m; ≤ 8 lights affecting any pixel |

## 6. Working-tree discipline

The served bundle is never left unrenderable. Build only from coherent source, smoke-load, commit. Long refactors happen on a scratch copy and swap in one commit. Source and served bundle are always the same commit.

## 7. Tests that test behaviour

Regex-on-bundle tests do not count. Every fix ships with a test that exercises the behaviour: protocol survival on bad JSON, dropped presses, dodge window, lock-on target identity, floor table, reconnect, luma/lights per region via the QA hooks.

## 8. Numbers in every report

Commit hash, test counts, fps per region, luma per checkpoint, latency/stop/foot-slide, click-to-damage, screenshot paths. A self-score without numbers is not a report.

## 9. Fun before infrastructure

Encounter pacing, feel and readability come before new i18n, voice, tokens or tooling. Infrastructure is added only when a beat that needs it is already playable.

## 10. Assets

One coherent kit per setting at scale 1 on its grid. CC0/CC-BY/Mixamo terms only, every file ledgered. Source the batch for a tranche before designing the level around it.
