# Chapter 1 completion report

Date: 2026-09-02

## Run targets

- Site: `http://localhost:3000/`
- Chapter 1: `http://localhost:3000/game/chapter-1`
- Authoritative WebSocket server: `ws://localhost:3210`
- Public PlayCanvas project: `https://playcanvas.com/project/1592201/overview/dwarka-chapter-1`
- PlayCanvas editor scene: `https://playcanvas.com/editor/scene/2586680`

## Final verification

- `cd site && npm test`: the production build completed and 9/9 site, rendered-HTML, character-visual, target-lock, and waypoint regression tests passed; all six routes emitted.
- `cd site && npm run lint`: zero errors; one existing non-blocking `<img>` optimization warning remains in the historical Vrishaketu story page.
- `cd game/server && npm test`: 48/48 authority, movement, collision, combat, enemy-AI, safe-spawn, health, signed-progress, reconnect, replay, and voice-security tests passed.
- `cd game/server && npm run typecheck`: passed.
- `cd game/server && npm run voice:check`: 10/10 manifest, transcript, cache, key-rotation, and secret-scan checks passed.
- `cd game/server && npm run voice:generate`: 60 locale-line entries reused, 120 cached audio files present, zero files regenerated and zero provider requests required.
- The readable client source and public export copy are byte-identical and syntax-valid.

## Visible browser acceptance

EgoLite exercised the complete first-time, returning, and completed-profile flows at 1920×1080. Visible passes included:

- first-run five-language chooser, localized Chapter 0, skip confirmation, Settings, focus trapping, and keyboard navigation;
- English, Hindi, Tamil, Kannada, and Telugu presentation checks, including localized Settings and linked/separate voice-language behavior;
- the spatial W-over-ASD keyboard/mouse blueprint and explicit contextual bow/blade teaching before pointer lock and from Pause > Controls;
- camera-relative W/A/S/D movement with correct signs, normalized diagonals, sprint, dodge, mouse look, close shoulder bow aim, reticle-first automatic target acquisition, target distance feedback, single-arrow bow fire, blade attack after releasing RMB, pause, safe resume, and tutorial completion;
- an edge-clamped objective waypoint with live distance, including off-screen objective guidance without confusing it with the red combat target bracket;
- walk, sprint, and dodge collision against walls, street bounds, carts, stalls, pottery, steps, doorway edges, supports, and corners without tunnelling or pass-through;
- arrival, courtyard, market, doorway, Chitra ending, panels 09–10, chapter completion, Return Home, and replay;
- 100-health phase entry, death/family-failure checkpoint restoration, no regeneration, invalid-token recovery, reconnect pause/resume, server restart recovery, and two-tab monotonic progress;
- cached localized voice playback, exact English Chitra subtitle `They asked for you by name.`, captions, and absence of provider secrets in browser-visible or exported material;
- a clean final console soak with no uncaught application, WebGL, missing-asset, or hydration error.
- every active character reporting a visible approved face in the live scene, Chitra using a female base and rig-following hair, feet remaining above the street, and all gameplay characters remaining upright with one face-safe skeleton;
- the approved bronze sword remaining in the right-hand grip through idle, melee, dodge, and enemy attacks. The heavy enemy deliberately keeps a sword rather than shipping the visually weak gada, following the owner's stated fallback.

Independent computer-use verification repeated the blueprint, upright character/face/feet inspection, sword grip through idle/melee/dodge, camera rotation, waypoint edge clamping, repeated forward dodge collision at the market wall, performance sampling, and console inspection without an application-origin error. Its remote browser surface could not retain pointer lock between hold-dependent actions, so the sustained RMB/WASD feel check is recorded as an automation limitation rather than a second independent pass; EgoLite's continuous journey supplied the primary evidence.

## Performance and evidence

- Final EgoLite samples at exactly 1920×1080 showed 120 fps at arrival and 63–64 fps during close shoulder aim with a target lock, both above the 45 fps acceptance floor. The independent computer-use run sampled roughly 88 fps in combat.
- The final character repair adds six PlayCanvas-safe GLBs totalling about 1.4 MB and deliberately adds no extra animation controllers. EgoLite's background task-space timing was throttled during the last asset-load audit, so that throttled sample is not presented as a device-performance measurement.
- 145 browser artifacts are stored in `site/tests/browser-artifacts/`.
- Final exact-viewport evidence is under `site/tests/browser-artifacts/final-egolite-qa/`: `control-blueprint-te-1920x1080.png`, `arrival-ancient-street-te-1920x1080.png`, `target-lock-bow-te-1920x1080.png`, and `chapter-complete-te-1920x1080.png`. Additional evidence covers the full journey, faces and skeletons, collisions, health restoration, reconnect, invalid tokens, Settings, and the public PlayCanvas project.

## Scope and pacing decision

- The automatic aim assist is contextual to RMB bow aim. It adds no weapon-switch system, extra weapon, skill tree, target-lock key, or Chapter 2 content.
- The revised compact first-play target is approximately two to three minutes for the whole playable Chapter 1 flow, including fixed dialogue and transitions. Under the locked enemy health/damage/recovery values and 20-second family-danger rule, the three clean combat encounters themselves measure about 5.25s, 7.45s, and 9.75s for an accurate player. Stretching any single encounter to two to three minutes would require repeated failure or would violate the approved combat scope, so the implementation does not manufacture delay with inflated health or extra waves.

## PlayCanvas and assets

PlayCanvas project `1592201` is public, owned by the user's account, on branch `main`, and visibly records that it was forked from official project `705595`. The current JS, CSS, localization, HTML, and config match the Editor assets by MD5 and byte size. All five optimized composite characters plus `Dwarka_Combat.glb` also match their uploaded Editor source records. An authenticated read-back confirmed the current target-lock, waypoint, composite-character, and combat-animation code; the Editor showed zero warnings, errors, audits, or active jobs. The checked-in export contains 42 runtime GLBs. No paid plan, private asset, whole source archive, or disallowed future weapon/environment was added.

All imported external runtime assets and the 60 synthetic voice entries are covered by `game/asset-ledger.md` and the voice manifest. The only release-only provenance note is unchanged: the existing project-local Story A panel artwork needs original creator/source confirmation before a public production release. It does not affect the tested local game or the public editor record.
