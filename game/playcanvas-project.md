# PlayCanvas project record

- Engine: PlayCanvas `2.21.4` in the checked-in browser export; PlayCanvas Editor `v2.31.2`
- Starting project: official Third Person Controller public project `705595`
- Editor project ID: `1592201`
- Editor scene ID: `2586680`
- Public project URL: `https://playcanvas.com/project/1592201/overview/dwarka-chapter-1`
- Editor URL: `https://playcanvas.com/editor/scene/2586680`
- Branch: `main`
- Export date: 2026-09-02
- Checked-in export: `site/public/playcanvas/chapter-1/`

The public project is named **DWARKA Chapter 1**. The PlayCanvas dashboard reports Access `PUBLIC`, owner permissions, and `Forked From: Third Person Controller` linking to project `705595`.

## Authenticated sync verification (2026-09-02 20:55 IST)

The PlayCanvas Editor was opened in an isolated authenticated browser session and verified on scene `2586680`, branch `main`. The Editor reported `0` warnings, `0` errors, `0` audits, and `0` active import jobs after the sync. The public-project overview still reported Access `PUBLIC`, owner permissions, the official project `705595` fork link, and a post-sync size of `193.76 MB`.

The following existing Editor assets were replaced in place. Their Editor-reported MD5 and byte size exactly match the current checked-in static export:

| Editor asset | ID | MD5 | Bytes |
| --- | ---: | --- | ---: |
| `chapter-1.js` | `304677763` | `45ac09b2da62a2e65ff0cf809b0a7b54` | `110991` |
| `chapter-1.css` | `304677756` | `d85192d17e232f6adc25ec8a0df6f30f` | `12939` |
| `game-i18n.js` | `304677747` | `990188b43e311b730dc8cbbcbdf25c28` | `41766` |
| `index.html` | `304677762` | `b25c3862d1c8cd37ff740f4ac8622ddb` | `7881` |
| `chapter-1.json` | `304677744` | `3ceace9ca46dff4f88f747c698bdad39` | `741` |
| `world-layout.json` | `304737298` | `1d1236d55aeacf01b43a1113beb26d4f` | `5207` |
| `packed-sand-v1.webp` | `304752159` | `4609b5e8d6439fc65e268b8978089555` | `235430` |

An authenticated, cache-disabled read-back of Editor asset `304677763` confirmed the final `20260902ch` script is present. The uploaded source contains the PlayCanvas asset-backed `world-layout.json` loader, actual-velocity gait retiming, render-frame enemy snapshot smoothing, `aimBlend`, `groundAnimatedCharacter`, yaw-only enemy facing, target-lock scoring/hysteresis, waypoint, packed-sand registry fallback, composite-character URLs, and `Dwarka_Combat.glb` references. The repository source and static-export copies of `chapter-1.js` were byte-identical at the time of upload; their SHA-256 was `0f59c6fa0eb60927d64d5a59421e77b3508bad21fd02bdb6a277d192e433d2d8`.

The generated packed-sand texture was uploaded as preloaded Editor texture asset `304752159`. Its Editor MD5 and byte size match the checked-in WebP exactly. The production export loads the same file locally; Editor-hosted runs resolve the preloaded registry asset by name, avoiding a path-specific duplicate.

A cache-disabled Editor Launch verification loaded `chapter-1.js` over HTTP `200` and exposed `world-layout.json` as loaded PlayCanvas JSON asset `304737298` with `21` colliders and `21` placement groups. Its resource trace contained no request to `https://launch.playcanvas.com/world-layout.json` and no HTTP `400`, confirming the launcher-specific manifest problem was removed.

The Editor workspace itself showed `0` warnings, `0` errors, `0` audits, and `0` active jobs. The generic Editor Launch remains an authoring/provenance shell: it does not replace its starter-page DOM with the checked-in `index.html`, so the browser runtime's HUD binding is not used there as it is in the production static export. The PlayCanvas Launch check therefore verifies asset delivery and loader compatibility, not that the starter scene is the production Chapter 1 page.

The current optimized composite character and combat-animation sources were uploaded as new, non-colliding Editor assets. These source records match the checked-in GLBs exactly; PlayCanvas also generated its own container and child assets during import.

| Checked-in source | Editor source ID | MD5 | Bytes |
| --- | ---: | --- | ---: |
| `Vrishaketu_Composite.glb` | `304725313` | `aaddee29386daebfd0340d0e8fd7e7fd` | `2422856` |
| `Raider_Archer_Composite.glb` | `304727772` | `c8583fd523082db92f88339e4dfa268f` | `2144132` |
| `Brute_Composite.glb` | `304727774` | `0791ce015e5146841142d2cf25f461a2` | `2088940` |
| `Male_Peasant_Composite.glb` | `304727795` | `265e3817eeab30254cef43943d554e3e` | `1093116` |
| `Female_Peasant_Composite.glb` | `304727835` | `9a48ec3a18183f29d24469b2b6d4661f` | `1262928` |
| `Dwarka_Combat.glb` | `304727834` | `0932aaf4bf2691c7393e782928e54d29` | `848764` |

Final evidence is stored in:

- `site/tests/browser-artifacts/playcanvas-launch-runtime-verification-20260902ce.png` — live Launch plus authenticated runtime-token and manifest-resource verification.
- `site/tests/browser-artifacts/playcanvas-editor-final-sync-20260902ce.png` — final script asset ID/size with the Editor error/job counters visible.
- `site/tests/browser-artifacts/playcanvas-editor-world-layout-20260902ce.png` — manifest asset ID, preload state, size, and parsed JSON visible in the Editor.
- `site/tests/browser-artifacts/playcanvas-project-overview-after-sync.png` — public access and official fork provenance.
- `site/tests/browser-artifacts/playcanvas-editor-packed-sand-inspector-20260902ch.png` — uploaded 1024×1024 texture, preload state, byte size, and clean Editor counters.

The checked-in static export currently contains `42` GLBs. Existing Editor imports for the Standard environment, base heads/hair, props, and UAL animation were retained; those authoring/import records were not destructively replaced and are not claimed to be byte-identical to every optimized file in the static export. Whole asset archives, paid/private assets, future weapons, and future environments were not uploaded.

The production-facing game remains the repository's static PlayCanvas export so it can be served by the existing site and use the authoritative WebSocket server. No paid PlayCanvas plan or private asset was used.
