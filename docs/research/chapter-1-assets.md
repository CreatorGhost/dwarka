# Superseded Chapter 1 asset research

Verified in EgoLite against official source pages on 2026-09-02. The approved manifest and browser workflow have been copied into `docs/chapter-1-game-handoff.md`. Use that single file for implementation. This file remains as research history.

Future environment and weapon assets are intentionally absent from this manifest. Their approved acquisition rules live in `docs/future-chapters-game-handoff.md`. Do not download nature, spear, gada-player, astra, chariot, cauldron, flower-forest, mountain, or snow assets as part of Chapter 1.

## Readiness decision

The project is ready to start the PlayCanvas greybox and server work. The required character, animation, environment, prop, VFX, audio, lighting, and story-card routes are free and reachable through browser control.

Two checks remain before a public release:

1. Import the free animation pack and verify its exact clip list. If it does not cover bow aim and release, use Mixamo through the user's Adobe session.
2. Record the origin and reuse rights for the five existing Story A panels. They are already part of the public review site, but the repository does not contain their creation or licence record.

Neither check blocks the greybox. The second check blocks public distribution of the panels inside the game export.

## Chapter 1 download manifest

Only download the free Standard files. Do not buy Source, Pro, an all-in-one bundle, or a subscription.

| Priority | Asset | Exact source and free file | Chapter 1 use | Licence | Status |
| --- | --- | --- | --- | --- | --- |
| P0 | PlayCanvas third-person base | [Official Third Person Controller](https://developer.playcanvas.com/tutorials/third-person-controller/), project `705595` | Movement, camera, physics, and the starting Editor project | Official forkable project | Browser route verified; login may require user handoff |
| P0 | Humanoid bases | [Universal Base Characters](https://quaternius.itch.io/universal-base-characters), `Universal Base Characters[Standard].zip`, 122 MB | Vrishaketu, Chitra, civilians, and the shared raider body | CC0 | Free EgoLite flow verified |
| P0 | Clothing and silhouette variants | [Modular Character Outfits - Fantasy](https://quaternius.itch.io/modular-character-outfits-fantasy), `Modular Character Outfits - Fantasy[Standard].zip`, 280 MB | Recombined cloth parts for the player, families, skirmisher, archer, and brute | CC0 | Free page and file verified |
| P0 | Shared humanoid animation | [Universal Animation Library](https://quaternius.itch.io/universal-animation-library), `Universal Animation Library[Standard].zip`, 15 MB | Idle, locomotion, roll, melee, hit, and down states | CC0 | Free page and file verified; bow clips still need import inspection |
| P0 | Street kit | [Medieval Village MegaKit](https://quaternius.itch.io/medieval-village-megakit), `Medieval Village MegaKit[Standard].zip`, 153 MB | The S-shaped street, walls, roofs, stairs, doors, and floors | CC0 | Free page and file verified |
| P0 | Weapons and street props | [Fantasy Props MegaKit](https://quaternius.itch.io/fantasy-props-megakit), `Fantasy Props MegaKit[Standard].zip`, 143 MB | Bow, blade, mortal iron gada, carts, market stalls, barrels, furniture, and small props | CC0 | Free page and file verified |
| P0 | Night lighting | [Moonless Golf](https://polyhaven.com/a/moonless_golf), 2K HDR, 6,688,317 bytes | Sky and ambient-light source, with a separate directional moon light for gameplay readability | CC0 | Already present at `game/assets/raw/polyhaven/moonless_golf_2k.hdr`; official MD5 `804fae62fb961da3faad6c13a1a72147` matches |
| P1 | Smoke and fire wisps | [Kenney Smoke Particles](https://kenney.nl/assets/smoke-particles), 70 PNG files | Smoke, dust, impact wisps, and low-cost fire particles | CC0 | Free EgoLite interstitial verified |
| P1 | Footsteps and weapons | [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio), 50 files | Footsteps, weapon movement, and basic foley | CC0 | Free page and file count verified |
| P1 | HUD sounds | [Kenney UI Audio](https://kenney.nl/assets/ui-audio), 50 files | Pause, selection, danger, rescue, and chapter-complete cues | CC0 | Free page and file count verified |
| P1 | Impacts | [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) | Arrow, blade, body, and prop impacts after auditioning | CC0 | Use only if RPG Audio does not cover the final mix |
| Generated | Five-language voices | User-configured server-side AI voice provider; cached locale-aware output only | Chapter 0 narration and fixed Chapter 1 dialogue in English, Hindi, Tamil, Kannada, and Telugu | Project-generated synthetic audio | Generate through a server-only key; record provider, model, persona, locale, line ID, date, and runtime path in the asset ledger |
| Local | Story cards | `site/public/story-a/06-kunti-reveals.webp` through `10-oath.webp` | Opening context, raid transition, Chitra ending, horse release, and oath | Project-local, external provenance not recorded | Files and story order verified; provenance is a release gate |

The five Quaternius archives total about 713 MB before extraction. Do not upload whole archives to PlayCanvas. Extract them locally, select only the meshes, textures, and clips used by Chapter 1, convert those files to GLB where needed, and keep the public Editor project under 1 GB.

Voice generation is not a browser download and does not authorize live generation during gameplay. Use the user's existing provider access through a server-side adapter, keep the key out of the site and PlayCanvas export, cache every approved line, and maintain a locale-aware voice manifest. If the provider offers several male and female personas, keep one stable persona per recurring character across all five languages rather than randomizing voices between sessions.

## Character reuse plan

Use one humanoid skeleton for every Chapter 1 combatant and civilian wherever the imports allow it.

| Role | Base and variation | Required states |
| --- | --- | --- |
| Vrishaketu | Teen male base, dark hair, saffron and teal cloth, gold paper-sun accent | Idle, walk, run, sprint, roll, aim, bow release, two melee attacks, hit, down, interact |
| Chitra | Teen base scaled only within safe rig limits, simple cloth, paper-sun plane | Idle, short dialogue gesture, injured story pose |
| Families | Three outfit and colour combinations from the same base family | Cower, idle, scripted run |
| Skirmisher | Adult base, light raider outfit, short blade | Idle, run, circle, one-hit and two-hit attacks, hit, down |
| Archer | Adult base, lighter silhouette, bow | Idle, run, aim, release, hit, down |
| Gada brute | Adult base scaled modestly, broad outfit parts, mortal iron gada | Idle, slow walk, overhead attack, hit, down |

The free outfit pack is fantasy-neutral. It is not a cultural reference. Change cloth colours, remove obvious European heraldry, avoid plate-armour silhouettes, and add the paper-sun and charioteer motifs as small custom pieces.

## Browser-only download procedure

Use EgoLite for every website interaction and reuse one task space for the full asset pass.

### Quaternius and itch.io

1. Open the exact itch.io page from the manifest.
2. Confirm the page names the pack, says CC0, and lists the expected Standard archive.
3. Select `Download Now`.
4. Select `No thanks, just take me to the downloads`.
5. Select only the Standard archive. Do not select a paid Source or Pro file.
6. After the browser finishes the download, move the archive to `game/assets/raw/quaternius/<pack-slug>/` and add the exact page, filename, licence, and date to `game/asset-ledger.md`.

The older [Modular Weapons Pack](https://quaternius.com/packs/medievalweapons.html) is not approved for this build. Its current page configures the itch.io download widget with an empty project slug, so the browser route is unreliable. Fantasy Props MegaKit replaces it and covers more of Chapter 1 with one working download.

### Kenney

1. Open the exact asset page from the manifest.
2. Confirm the page says `Creative Commons CC0`.
3. Select `Download`.
4. In the donation dialog, select `Continue without donating...`.
5. Save the ZIP under `game/assets/raw/kenney/<pack-slug>/` and update the ledger.

The paid Kenney all-in-one bundle is not needed.

### Poly Haven

Use the official Moonless Golf page and select the 2K HDR file. The selected file is already present and its checksum matches Poly Haven's official file metadata, so do not download it again unless the file is damaged.

`game/assets/raw/polyhaven/kloppenheim_02_2k.hdr` also exists. It is not assigned to Chapter 1. Do not import it until the ledger records its source and a real scene use.

### PlayCanvas and Mixamo

Open PlayCanvas project `705595` in EgoLite and fork or create a free public Editor project. If PlayCanvas asks for login, account creation, CAPTCHA, terms, or a project-visibility confirmation, hand the same task space to the user. Resume only after the user confirms completion.

Do not open Mixamo during the initial download pass. First inspect the Universal Animation Library after import. If bow aim or release is missing, open Mixamo in the same EgoLite task space, reuse the user's Adobe session, and download only the missing biped clips. Record the exact clip names and settings in the ledger. Raw Mixamo files must not be published as a reusable asset pack.

## Import and acceptance checks

An archive is not approved merely because it downloaded. Each P0 pack must pass these checks before it enters the PlayCanvas project:

- The archive name and source match the manifest.
- The licence is recorded in `game/asset-ledger.md`.
- The file opens without an extraction error.
- Imported meshes have expected scale, visible textures, and usable pivots.
- One base character retargets to locomotion, roll, melee, hit, and down without broken limbs.
- The bow pose keeps both hands on the weapon and does not twist the shoulders.
- Street pieces snap on a documented grid and have simple custom collision where the free pack lacks it.
- Only used files enter PlayCanvas. Raw archives remain outside the Editor project.
- Runtime textures are at most 2K. Prefer 1K for repeated props and NPC outfits.
- The complete visible scene stays within the 30,000 to 60,000 triangle target around the player.

## Ledger fields

Create `game/asset-ledger.md` before the first external import. Each row must contain:

| Field | Required value |
| --- | --- |
| Asset | Human-readable name and selected pack version |
| Source | Exact official asset-page URL, not a search result |
| Creator | Quaternius, Kenney, Poly Haven author, Adobe/Mixamo, or the recorded original creator |
| Licence | Exact licence shown on the source page |
| Download | Original archive or file name and download date |
| Checksum | SHA-256 for local archives and raw files |
| Conversion | Extraction, FBX or glTF to GLB, texture resize, compression, or none |
| Runtime use | Exact character, encounter, UI element, audio event, or scene |
| Credit | Required text or `not required` |

## Deferred sources

Poly Pizza, OpenGameArt, and Sketchfab are not part of the initial asset pass. They add per-item licence review and visual inconsistency without solving a P0 gap. Use one only after the five Quaternius packs, three Kenney packs, and Poly Haven lighting have been imported and a named gap still exists.

OpenAI image generation remains suitable for new flat material such as the paper-sun emblem, title art, dialogue portraits, and HUD decoration. Generated images must be saved in the repository and listed in the ledger. Do not use image generation as a substitute for meshes, rigs, animation clips, collision, or matched PBR textures.

## Start decision

Start Milestone 1 now. Fork the PlayCanvas third-person project, build the four-space street with primitives, and prove movement and camera collision before importing the full art set. In parallel with that work, download and inspect the P0 packs through EgoLite. Do not wait for final audio, Mixamo, or storyboard provenance to begin the greybox.
