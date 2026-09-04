# Pass-three environment evidence

Captured 2026-09-05 in the isolated EgoLite task space `dwarka city pass3 QA`.

## Capture identity

- Reconstructed baseline: root `4f53b170b6463a785a4f348ab6ff0e76211b8d08`, site `09b1bb0795abc6a8c044269e42e617d63d711d86`, served from an isolated detached site worktree on `http://127.0.0.1:3002/`.
- Pass-three source heads before commit: root `4f53b170b6463a785a4f348ab6ff0e76211b8d08`, site `09b1bb0795abc6a8c044269e42e617d63d711d86`, with the source hashes below.
- Exact pass-three served bundle: SHA-256 `42befac0179a835614712773ee3d46aa7f22c9511724b8487232376597fabfee`.
- Exact pass-three served layout: SHA-256 `c4a59bcbe0dc448aade0ed5aa9562c12746ecef235744d0777531857b81ee327`; byte-identical to the source layout.
- Launch URL: `http://127.0.0.1:3001/playcanvas/chapter-1/index.html?qa=1&ws=ws%3A%2F%2F127.0.0.1%3A3214&pass3=final-42befac0`.
- Browser CSS viewport: 2400×1350 at DPR 1.6. Every image is captured from the game's fixed 1920×1080 canvas at render scale 1.0; both baseline and pass three use the same browser metrics and game-camera calls.
- Intentional lighting change: ambient light and exposure are unchanged. Two existing arrival-only warm practical pools were moved closer to the two imported gates and increased locally; no global brightening was applied.

Relevant pass-three source SHA-256 values:

- `chapter-1.js`: `db6160e63fb315f8cdb9de510845f69a1a5e7a794771bb34b0039419603c42ac`
- `runtime/qa.js`: `446028c8e66f248cc3d55321cbc29ef9ee46f87cf1bab265ba0fae68090052bc`
- `scene/assets.js`: `2fc55457da3a082e54925775c2b334b4a5554f60060c6d9a1c676bdb0ae8ff78`
- `scene/build.js`: `5588372b89ede7215a7404c76965faded5a543dc45e4229fdfc557394855f5ec`
- `scene/dressing.js`: `67d1a52448ebde2878a058b65653a01d1a9e5a5722d33e4c3d71caae454b7b6b`
- `scene/materials.js`: `873200fb57cb850f2a40cdaa8e103fc6de242440a621c160476f71241c2fdc5d`
- `world-layout.json`: `c4a59bcbe0dc448aade0ed5aa9562c12746ecef235744d0777531857b81ee327`

## Matched comparisons

| Defect/view | Reconstructed before | Exact-bundle after | Result |
| --- | --- | --- | --- |
| Arrival composition | [01 before](pairs/before/01-arrival-baseline-09b1bb0.png) | [01 after](final/01-arrival-final.png) | Continuous warm antique rows, tents, edge props and an authored terminus replace the broad pink/grey void. |
| Frontage / empty-street seam | [02 before](pairs/before/02-frontage-baseline-09b1bb0.png) | [02 after](final/02-frontage-final.png) | Coherent pack props break up the road edges; the floating legacy well crossbeam and procedural market awnings are removed. |
| Player scale, ground contact and lighting | [03 before](pairs/before/03-player-baseline-09b1bb0.png) | [03 after](final/03-player-ground-contact-final.png) | Existing player stays at human scale, seated at the same floor height, with a stable contact shadow and shared moon/fire exposure. |
| Imported opening / door approach | [04 before](pairs/before/04-door-baseline-09b1bb0.png) | [04 after](final/04-doorway-alignment-final.png) | A real source-pack arch frames the authored door, and local practical light makes the jamb, panel and depth legible. This is a sampled aperture/plane match, not proof of dynamic passage. |
| Bow-aim gameplay framing | [05 before](pairs/before/05-bow-baseline-09b1bb0.png) | [05 after](final/05-bow-aim-final.png) | The existing bow/character remain readable against the warmer coherent frontage. |
| Arrival seam / turn | [06 before](pairs/before/06-turn-baseline-09b1bb0.png) | [06 after](final/06-seam-turn-final.png) | The arrival camera cone no longer terminates in isolated grey panels or an open black void. |

The exact final captures report 181–394 draw calls, 167–192 batches, three enabled architecture shadow casters, a 1920×1080 canvas, and render scale 1.0. These are capture-time point readings, not a sustained performance claim.

## Honest open scope

- Geometry tooling passes the two arrival gate apertures at 1.18 m wide × 2.35 m high with ±0.02 m sampling uncertainty and approximately 0.04 m lateral clearance per side for the 1.10 m player diameter.
- Six farther imported door openings remain explicitly failed/unverified and were not chased in this deadline pass.
- The fixed QA renderer/collider transform assertion passes all nine authored doors, but the two arrival aperture results are still sampled geometry/plane checks. No dynamic-door passage or complete rendered-route claim is made here.
- Sustained performance, streaming-pop and full-route actual-play evidence remain separate acceptance work; capture-time HUD or draw-call readings are not substitutes.
