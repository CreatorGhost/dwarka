# DWARKA Chapter 1 autonomous build specification

This is the only implementation specification the autonomous build agent needs. It combines the confirmed story, homepage narration, returning-player flow, Chapter 1 gameplay, session model, PlayCanvas and server design, assets, browser workflow, UI testing, acceptance criteria, and the final copy-paste prompt.

Older planning and research files remain historical context. If another file conflicts with this one, use this file.

## Build decision

Build a two-part browser experience:

1. Chapter 0 is a non-playable illustrated story called "The Wheel."
2. Chapter 1 is a playable third-person game called "The Boy with the Paper Sun."

The website first presents Chapter 0, a short illustrated story about Karna's final day. When that narration ends, the player starts Chapter 1 as Vrishaketu. Returning players can continue from the next unlocked gameplay phase instead of repeating finished phases.

Do not make Chapter 0 playable. Do not build Chapter 2, later missions, or the final Bhishana fight. Chapter 0 explains the story material that the game does not implement as player-controlled action.

## Locked decisions

| Area | Decision |
| --- | --- |
| Story | Story A, Vrishaketu: The Last Arrow of the Sun |
| Chapter 0 | The Wheel, a non-playable five-panel illustrated story on the homepage |
| Playable scope | Chapter 1 only, The Boy with the Paper Sun |
| Chapter 0 assets | Existing Story A panels 01 through 05 with localized narration rendered by the site |
| Engine | PlayCanvas Free using a public Editor project |
| Starting project | Official PlayCanvas Third Person Controller, project `705595` |
| Rendering | Real-time 3D in the browser |
| Camera | Right-shoulder third person |
| Target | PC laptop at 1080p, keyboard and mouse |
| Performance | 60 fps target, 45 fps minimum on the agreed laptop |
| Hosting | Static PlayCanvas export inside the existing site, served by the user's server |
| Game authority | Existing JavaScript server owns combat, objectives, checkpoints, and phase completion over WebSocket |
| Player identity | Anonymous browser profile, no account or login |
| Progress | Versioned server-signed progress token stored in the browser |
| Persistence | No database for this demo |
| Multiplayer | None |
| Budget | $0 required spend |
| Assets | Approved free Standard packs, CC0 supporting assets, and existing story panels |
| Voice generation | User-configured server-side AI voice provider; use existing access only, never expose its key or open a purchase flow |
| Initial languages | English (`en`), Hindi (`hi`), Tamil (`ta`), Kannada (`kn`), and Telugu (`te`) for UI, narration text, captions, subtitles, and fixed spoken dialogue |
| Mobile | Excluded |
| Controller | Excluded |

Do not reopen these decisions during implementation.

## Current project state

- The repository contains a working story-review website, not a game runtime.
- The confirmed Vrishaketu story has 32 storyboard panels under `site/public/story-a/`.
- Chapter 1 uses panels `06-kunti-reveals` through `10-oath`.
- Chapter 0 uses panels `01-battlefield` through `05-ash`.
- `game/assets/raw/polyhaven/moonless_golf_2k.hdr` already exists and matches the official Poly Haven checksum.
- Chapter 1 implementation is now in progress. The presence of `/game/chapter-1`, PlayCanvas export files, or combat code does not count as completion until every acceptance criterion and visible UI scenario in this document passes.
- Preserve all four story-review routes and their art.

## Product goal

Deliver a 6 to 10 minute first-play experience that proves the project can combine story, third-person movement, bow and blade combat, readable enemy warnings, a protection objective, server-owned results, persistent phase progress, and a complete chapter ending.

A first-time player should understand who Vrishaketu is after Chapter 0 and before Chapter 1 begins. A returning player should see a Continue action on the homepage and resume without replaying completed gameplay phases.

## Complete player journey

### First visit

1. The player opens the existing homepage.
2. A first-run language chooser offers English, Hindi, Tamil, Kannada, and Telugu. It can be changed later in Settings.
3. The page identifies Vrishaketu as the confirmed game direction and keeps `Chapters` separate from `Settings`.
4. A clear `Begin Chapter 0` action opens the illustrated story.
5. The player reads or listens to the five Karna panels in order. Each screen has localized narration text, Back, Next, Skip, mute, and caption controls.
6. The final panel leads to `Begin Chapter 1`.
7. The page opens `/game/chapter-1`, shows Settings and the control blueprint, and asks the player to click to enter pointer lock.
8. The game begins at the arrival lane.
9. Each completed gameplay phase saves a signed progress token and the next phase loads at full health.
10. Death restarts the current phase at full health. It does not erase previously completed phases.
11. The final story sequence reaches a Chapter 1 complete screen with Replay Chapter 1 and Return Home.

### Returning visit

1. The homepage reads the locally stored progress summary.
2. The primary action becomes `Continue Chapter 1` and names the resume point in the selected language.
3. The player may replay the illustrated prologue, but the site never forces it again.
4. The game sends the stored progress token to the server.
5. The server verifies the signature and version.
6. The game starts at the first unfinished phase. If the player left during a phase, it starts at that phase's checkpoint.

### Completed chapter

The homepage shows `Chapter 1 complete`. The primary game action becomes `Replay Chapter 1`. Do not send the player into Chapter 2. A small `More chapters will follow` message is allowed, but it must not look interactive.

### Reset flow

Settings contains Language, Audio, Accessibility, Controls, and `Reset Chapter 1 progress`. Reset requires confirmation and removes the stored progress token, current phase summary, narration completion flag, and anonymous player ID. Language, audio, and accessibility preferences remain.

## Chapter 0: The Wheel

Chapter 0 appears on the homepage and replaces the playable Karna prologue. It is a story sequence, not gameplay. The player reads or listens, advances panels, and may skip after confirmation. The player does not move a character, aim, fight, or fail.

| Order | Existing panel | Narration purpose |
| ---: | --- | --- |
| 1 | `public/story-a/01-battlefield.webp` | Establish Kurukshetra, Day 17, and Karna's last stand. |
| 2 | `public/story-a/02-karna-looses.webp` | Show his skill and the scale of the battle. Do not present playable controls. |
| 3 | `public/story-a/03-wheel-sinks.webp` | Explain that the chariot wheel sinks and fate closes around him. |
| 4 | `public/story-a/04-karna-lifts.webp` | Show Karna setting down the bow and asking for the pause owed to an unarmed warrior. |
| 5 | `public/story-a/05-ash.webp` | Cut to ash and explain that his surviving son inherits a story he did not choose. |

The narration must work with sound muted. Every panel has localized visible text. Generate and cache project-owned voice-over for all five initial languages using the configured server-side voice provider. A missing voice file must fall back to localized text without blocking the story.

Do not show the fatal arrow. Do not let the player control Karna. Do not turn the narration into a combat tutorial.

### Chapter 0 homepage behavior

- First-time primary action: `Begin Chapter 0`.
- After the narration: `Begin Chapter 1`.
- With saved progress: `Continue Chapter 1` plus the phase label.
- With chapter completion: `Replay Chapter 1`.
- Secondary actions: `Replay story`, `Read all stories`, and `Settings`.
- `Settings` is a separate homepage action, not a chapter card, and is available before Chapter 0 starts.
- Preserve the existing links to the four story-review routes.
- Do not autoplay narration audio before user interaction.
- Back, Next, and Skip must work with keyboard and mouse.
- Store `storyIntroComplete` locally after the final panel or an explicit Skip confirmation.

## Chapter 1 story

Karna's secret is revealed after the war. He was Kunti's first son, which makes him the elder brother of the Pandavas. His surviving son, seventeen-year-old Vrishaketu, enters the household of the men who killed his father.

Vrishaketu returns to the charioteers' quarter and meets Chitra, his ten-year-old foster-brother. The army is away at the royal sacrifice. Rakshasa raiders attack Karna's unguarded neighborhood. Vrishaketu protects fleeing families across three street encounters, then finds Chitra dying in a burned doorway.

Chitra's final subtitle is exactly:

> They asked for you by name.

At dawn the royal horse is released. Its road follows the raiders' trail. Vrishaketu takes the oath to follow it. Chapter 1 ends there.

The player cannot prevent Chitra's death. Combat skill determines whether the player reaches the ending, not whether the story changes.

## Chapter phases and resume rules

Progress commits only when the server confirms a phase completion. The player resumes at the first unfinished phase.

| Phase ID | Player-facing name | Content | Completion rule | Resume point |
| --- | --- | --- | --- | --- |
| `arrival` | Return to the quarter | Panel 06, controls, walk to Chitra, short dialogue | Chitra interaction completes | Start of the raid transition |
| `courtyard` | Protect the courtyard family | Panel 07, two skirmishers and one archer | Family is safe and all raiders are defeated | Cart courtyard checkpoint |
| `market` | Clear the market bend | Three skirmishers and one archer | Family is safe and all raiders are defeated | Market bend checkpoint |
| `doorway` | Reach the charioteers' doorway | Two skirmishers, one archer, and one gada brute | Family is safe and all raiders are defeated | Doorway checkpoint |
| `ending` | The paper sun | Panel 08, Chitra's line, panels 09 and 10 | Chapter-complete screen appears | Start of ending sequence |
| `complete` | Chapter 1 complete | Replay and Return Home actions | Stored as completed | Replay starts at `arrival` without erasing the completion record until confirmed |

If the player closes the page halfway through `market`, the next visit starts at the beginning of `market`. It does not start halfway through an attack animation or enemy wave.

## Level layout and visual direction

Build one compact S-shaped street with four connected spaces:

- The arrival lane teaches movement and introduces Chitra.
- The cart courtyard holds the first encounter.
- The market bend holds the second encounter among fabric awnings and burning props.
- The charioteers' doorway holds the third encounter and story ending.

The raid happens at night. Keep the scene readable and colorful with an indigo sky, warm orange fire, turquoise and magenta cloth, pale stone, dark wood, and a gold sun motif. Avoid a brown or nearly black image.

Only the moon or one directional light casts real-time shadows. Decorative fire lights do not cast shadows. Use emissive fire materials, particles, and fog. Reuse buildings and props through rotation, scale, color changes, and instancing. The next objective marker should remain visible from the active encounter.

### Visual expectation references

The target is a compact, custom low-poly browser action game with an HTML/CSS HUD over a full-window WebGL scene. Expect a readable health bar, current objective, reticle during bow aim, family-danger feedback, subtitles, and a restrained pause/settings layer. It is not an open-world Assassin's Creed production and it is not a block or voxel game like Minecraft.

Use these references for different parts of the expectation, not as promises that DWARKA will match all of them:

| Reference | What to study | Expectation boundary |
| --- | --- | --- |
| [PlayCanvas 3rd Person RPG](https://playcanvas.com/project/683151/overview/3rd-person-rpg) and its [browser build](https://playcanv.as/p/pfgl4PcB/) | Browser-native third-person scale, camera, movement, and achievable low-poly presentation | Closest technical baseline; DWARKA adds its own bow, blade, story, settings, and Indian visual identity |
| [PlayCanvas Seemore](https://playcanvas.com/project/612100/overview/seemore) and its [browser build](https://playcanv.as/p/MflWvdTW/) | Lighting, materials, and character rendering possible in PlayCanvas | Renderer-quality reference only, not the game loop, content volume, or UI promise |
| [Raji: An Ancient Epic](https://store.steampowered.com/app/730390/Raji_An_Ancient_Epic/) | Indian mythic atmosphere, color, ornament, and restrained combat HUD | Cultural and art-direction reference only; DWARKA remains a smaller over-the-shoulder browser game rather than a commercial isometric title |

After the playable build is complete, compare the running Chapter 1 side by side with the PlayCanvas RPG baseline at 1080p. The result should look authored rather than like an untouched controller template, while remaining honest about its small map, reusable low-poly assets, and six-to-ten-minute scope.

## Player controls

| Input | Action |
| --- | --- |
| W, A, S, D | Move relative to camera |
| Mouse | Rotate camera |
| Left Shift | Sprint |
| Space | Dodge roll |
| Right mouse hold | Shoulder aim with bow |
| Left mouse while aiming | Fire bow |
| Left mouse while not aiming | Blade attack |
| E | Interact or confirm rescue |
| Escape | Pause and release pointer lock |

Do not implement astras, charged shot, mercy, weapon lowering, controller input, touch input, or remapping for this chapter. Reserve later actions in configuration only if that does not add work to the current controls.

### Starting control blueprint and first-minute teaching

Before pointer lock, show a spatial keyboard-and-mouse blueprint rather than only a text list. Draw `W` above `A S D`, show separate left and right mouse buttons, and connect each control to a short action label. It must explain:

- `W A S D` approaches, retreats, and strafes; the mouse turns the camera.
- Hold right mouse to enter bow mode; left mouse then fires.
- Release right mouse to return to blade mode; left mouse then attacks.
- Chapter 1 has no separate weapon-switch key and no target lock. Bow versus blade is contextual.
- Left Shift sprints, Space dodges, `E` interacts, and Escape pauses.

Keep the same blueprint available from `Pause > Controls`. During the arrival lane, show small non-blocking prompts for move, rotate camera, sprint, dodge, aim and fire, blade attack, and interaction. Each prompt clears after the matching input is demonstrated and does not reappear on a resumed or replayed phase unless tutorials are reset in Settings.

Do not add `Q`, number keys, a weapon wheel, lock-on, or another combat state to Chapter 1. Later chapters may add one melee-family cycle input only after the spear or gada is actually unlocked.

## Camera and movement

- Right-shoulder camera about 4.5 meters behind and 1.6 meters above the player.
- Field of view between 60 and 65 degrees.
- Aim mode moves the camera closer and places the reticle slightly right of center.
- Camera collision shortens the camera arm before walls can clip into view.
- Walk speed about 4.5 meters per second.
- Sprint speed about 6.5 meters per second.
- Movement handles shallow steps, ramps, and street edges without snagging.
- Motion blur stays off.
- Camera shake remains mild and has an off setting.

## Player combat model

Player states are `locked`, `idle`, `locomotion`, `aim`, `fire`, `melee`, `dodge`, `hit`, `down`, and `interact`.

State priority is down, hit, dodge, interact, attack, then locomotion. Story locks override combat input.

| Rule | Initial value |
| --- | ---: |
| Player health | 100 |
| Bow damage | 30 |
| Bow recovery | 0.75 seconds |
| Blade first hit | 24 |
| Blade second hit | 32 |
| Combo window | 0.45 seconds |
| Dodge duration | 0.65 seconds |
| Dodge invulnerability | 0.20 to 0.50 seconds |
| Dodge recovery | 0.25 seconds |
| Hit reaction lock | 0.25 seconds |

Keep these values in `game/config/chapter-1.json`.

Bow shots use visible projectiles and trails. The client may render the projectile immediately. Only the server confirms the hit and damage.

The blade uses one two-hit combo. The server checks a short forward arc during active frames. Do not build a branching combo tree.

There is no potion, food, regeneration, health pickup, or other mid-encounter healing in Chapter 1. Every confirmed phase or checkpoint loads with 100 health. When player health reaches zero, restart the current phase checkpoint with 100 health and preserve all earlier confirmed phases. Briefly show `Checkpoint restored — health full` after a death restart. Do not add lives, inventory, loot, XP, or equipment.

## Enemy set

Use one humanoid rig with material, equipment, scale, and silhouette changes.

| Enemy | Behavior | Health | Damage | Warning |
| --- | --- | ---: | ---: | --- |
| Raider skirmisher | Approaches, circles, then uses one or two blade strikes | 60 | 15 | Weapon lift and short gold flash |
| Raider archer | Keeps distance, moves to a fixed firing point, then shoots | 45 | 12 | Bright line and 0.8 second draw |
| Raider gada brute | Slow approach and heavy overhead strike with a mortal iron gada | 110 | 22 | Red ground arc and 1.1 second wind-up |

Use fixed spawn points, a combat boundary, direct pursuit, a small separation force, and obstacle ray checks. Do not build a navmesh. Cap active enemies at four. Dead enemies may fade after three seconds. Do not add ragdolls.

## Protect-the-families objective

Each encounter represents one family as one objective state, even if two or three NPC models appear.

- Raiders inside the family's danger zone start a 20-second danger timer.
- The family becomes safe when every raider in that encounter is defeated.
- If the timer reaches zero, restart the current phase.
- Civilians cower at a fixed point, then follow a scripted exit after rescue.
- Show an icon, outline, text, and timer. Do not use color alone.
- The server owns timer state, success, failure, and checkpoint advancement.

## Session and progress management

The game needs durable anonymous progress without accounts or a database.

### Stored browser data

Use a versioned localStorage record under a project-specific key such as `dwarka.chapter1.profile.v1`.

```json
{
  "schemaVersion": 1,
  "anonymousPlayerId": "uuid",
  "storyIntroComplete": true,
  "progressToken": "server-signed-token",
  "progressSummary": {
    "furthestCompletedPhase": "courtyard",
    "nextPhase": "market",
    "chapterComplete": false,
    "updatedAt": "2026-09-02T12:00:00.000Z"
  },
  "settings": {
    "locale": "en",
    "voiceLocale": "en",
    "master": 1,
    "music": 0.7,
    "effects": 0.8,
    "dialogue": 1,
    "captions": true,
    "cameraShake": true,
    "tutorials": true
  }
}
```

The summary exists for homepage labels. It is not authoritative. The server verifies the signed token before resuming.

### Signed progress token

The server signs a compact token after every committed phase. The payload contains:

```json
{
  "v": 1,
  "playerId": "uuid",
  "furthestCompletedPhase": "courtyard",
  "nextPhase": "market",
  "chapterComplete": false,
  "issuedAt": 1788330600000
}
```

Use an HMAC secret stored only on the server. The browser stores the signed token but cannot create a valid later-phase token.

No personal data belongs in the token. Do not store names, emails, IP addresses, or analytics identifiers.

### Iframe integration

The React site owns the homepage and localStorage. The PlayCanvas export runs inside `/game/chapter-1`.

- Parent to iframe: `dwarka:resume` with anonymous player ID, token, settings, and requested action.
- Iframe to parent: `dwarka:ready`, `dwarka:progress`, `dwarka:settings`, `dwarka:chapter-complete`, and `dwarka:error`.
- Validate `postMessage` origins on both sides.
- The iframe sends the token to the WebSocket server for verification.
- The server returns the accepted phase and a fresh active-session ID.
- The parent stores a new token only after a server-confirmed progress event.

### Failure behavior

- Missing token: start at `arrival`.
- Invalid signature: explain that saved progress could not be verified, keep settings, and start at `arrival`.
- Unknown schema version: attempt a small migration. If migration fails, keep settings and reset progress with a clear message.
- Cleared browser storage: progress resets. This is acceptable for the demo.
- WebSocket disconnect during combat: pause the simulation, show `Reconnecting`, and retry.
- Server restart: the signed token still restores the committed phase because progress does not depend on server memory.
- Two tabs: the newest server-confirmed token wins. Broadcast progress updates with `storage` events or `BroadcastChannel`.

## Browser and server boundary

The browser renders at the display frame rate, reads input, predicts local movement, plays animation, particles, audio, story cards, and HUD feedback, and interpolates server snapshots.

The server runs a Chapter 1 simulation at 20 ticks per second. It owns:

- accepted movement and position bounds
- active session and phase
- enemy state and attack timers
- projectile and melee hit checks
- health, damage, invulnerability, and death
- family danger timers
- encounter completion
- checkpoints and phase advancement
- signed progress tokens
- chapter completion and restart

The client never claims a hit, damage value, defeated enemy, rescued family, completed phase, or completed chapter.

Use plain WebSocket messages. Do not add Colyseus, Nakama, WebRTC, WebTransport, a database, or full server-side physics.

Example resume message:

```json
{
  "type": "session.resume",
  "playerId": "uuid",
  "progressToken": "signed-token-or-null",
  "clientVersion": 1
}
```

Example accepted session:

```json
{
  "type": "session.accepted",
  "sessionId": "active-session-id",
  "phase": "market",
  "checkpoint": "market-bend",
  "serverTick": 0
}
```

Example input:

```json
{
  "type": "input",
  "seq": 184,
  "clientTick": 921,
  "move": [0.4, 1.0],
  "aimYaw": 1.42,
  "aimPitch": -0.08,
  "held": ["sprint", "aim"],
  "pressed": ["fire"]
}
```

Example progress event:

```json
{
  "type": "progress.committed",
  "completedPhase": "courtyard",
  "nextPhase": "market",
  "progressToken": "new-signed-token"
}
```

## Website routes and integration

| Route | Responsibility |
| --- | --- |
| `/` | Existing story-review homepage plus illustrated prologue, Start, Continue, Replay Story, Settings, and story links |
| `/vrishaketu` | Complete confirmed 32-panel story reference |
| `/emberborn` | Preserve Story B |
| `/babhruvahana` | Preserve Story C |
| `/abhimanyu` | Preserve Story D as the reference option |
| `/game/chapter-1` | Full-window game shell, controls, loading, iframe bridge, reconnect UI, and Chapter 1 export |

Do not move or rewrite the alternative story pages. Add the game entry flow without breaking them.

## PlayCanvas project rules

- Use a free public Editor project.
- Start from the official [Third Person Controller](https://developer.playcanvas.com/tutorials/third-person-controller/), project `705595`.
- Never select a paid plan.
- Keep the Editor project below 1 GB.
- Use the stable PlayCanvas engine and Editor export.
- Do not use `@playcanvas/react`.
- Record project ID, public URL, branch, and export date in `game/playcanvas-project.md`.
- Keep custom scripts under `game/client-scripts/` so the repository remains inspectable.
- Export a static build after every playable milestone.
- Copy the approved export to `site/public/playcanvas/chapter-1/`.
- Use EgoLite for Editor interaction and visual verification.
- If login, CAPTCHA, terms, or project-visibility confirmation appears, hand the same EgoLite task space to the user and resume after confirmation.

## Approved asset manifest

Use only free Standard files. Do not buy Source, Pro, an all-in-one bundle, or a subscription.

| Priority | Asset | Exact source and free file | Use | Licence |
| --- | --- | --- | --- | --- |
| P0 | Humanoid bases | [Universal Base Characters](https://quaternius.itch.io/universal-base-characters), `Universal Base Characters[Standard].zip`, 122 MB | Vrishaketu, Chitra, families, and raider body | CC0 |
| P0 | Outfit variations | [Modular Character Outfits - Fantasy](https://quaternius.itch.io/modular-character-outfits-fantasy), `Modular Character Outfits - Fantasy[Standard].zip`, 280 MB | Player, civilians, skirmisher, archer, brute | CC0 |
| P0 | Humanoid animation | [Universal Animation Library](https://quaternius.itch.io/universal-animation-library), `Universal Animation Library[Standard].zip`, 15 MB | Locomotion, roll, melee, hit, down | CC0 |
| P0 | Street kit | [Medieval Village MegaKit](https://quaternius.itch.io/medieval-village-megakit), `Medieval Village MegaKit[Standard].zip`, 153 MB | Walls, roofs, floors, stairs, and doors | CC0 |
| P0 | Weapons and props | [Fantasy Props MegaKit](https://quaternius.itch.io/fantasy-props-megakit), `Fantasy Props MegaKit[Standard].zip`, 143 MB | Bow, blade, mortal iron gada, carts, stalls, barrels, and furniture | CC0 |
| P0 | Night HDRI | [Moonless Golf](https://polyhaven.com/a/moonless_golf), 2K HDR | Night sky and ambient light | CC0 |
| P1 | Smoke | [Kenney Smoke Particles](https://kenney.nl/assets/smoke-particles) | Smoke, fire wisps, dust, and hit wisps | CC0 |
| P1 | Footsteps and weapons | [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio) | Footsteps, weapon movement, and foley | CC0 |
| P1 | HUD audio | [Kenney UI Audio](https://kenney.nl/assets/ui-audio) | Pause, danger, rescue, and completion | CC0 |
| P1 | Impacts | [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) | Arrow, blade, body, and prop impacts if needed | CC0 |
| Generated | Five-language voices | User-configured server-side voice provider and locale-aware voice manifest | Chapter 0 narration and fixed Chapter 1 dialogue in English, Hindi, Tamil, Kannada, and Telugu | Project-generated; synthetic status, provider, model, persona, locale, date, and line ID must be ledgered |
| Local | Prologue panels | `site/public/story-a/01-battlefield.webp` through `05-ash.webp` | Homepage story narration | Project-local, provenance must be recorded before public game release |
| Local | Chapter 1 panels | `site/public/story-a/06-kunti-reveals.webp` through `10-oath.webp` | Chapter opening, raid, ending, horse, and oath | Project-local, provenance must be recorded before public game release |

The five Quaternius archives total about 713 MB before extraction. Do not upload whole archives to PlayCanvas. Import only the files used by Chapter 1.

### Asset download rules

Use EgoLite for all asset-site interaction.

For Quaternius:

1. Open the exact itch.io page above.
2. Confirm the pack name, CC0 licence, and Standard filename.
3. Select `Download Now`.
4. Select `No thanks, just take me to the downloads`.
5. Download only the Standard archive.
6. Store it under `game/assets/raw/quaternius/<pack>/`.
7. Add it to `game/asset-ledger.md` before import.

For Kenney:

1. Open the exact page above.
2. Confirm `Creative Commons CC0`.
3. Select `Download`.
4. Select `Continue without donating...`.
5. Store and ledger the ZIP before import.

Do not use the older Quaternius Modular Weapons Pack. Its current browser download integration has an empty itch.io project slug. Fantasy Props MegaKit replaces it.

Do not use Mixamo until the free Universal Animation Library has been imported and inspected. If bow aim or release is missing, open Mixamo in EgoLite, reuse the user's Adobe session, and download only the missing biped clips. The user handles login or CAPTCHA. Record exact clip names and settings.

Defer OpenGameArt, Sketchfab, and Poly Pizza. Use one only if a named gap remains after the approved packs are imported and its exact licence is recorded.

### Codex image and video generation

Codex may use image generation for missing 2D material that the approved packs do not provide:

- Chapter 0 title card
- Chapter 1 title and loading art
- paper-sun emblem
- HUD icons and panel decoration
- dialogue portraits
- objective and danger icons
- color and costume reference sheets

Save every generated image in the repository and record its tool, prompt summary, creation date, file path, and runtime use in `game/asset-ledger.md`. Generated images must match the existing Story A tone and the indigo, orange, turquoise, magenta, pale-stone, and gold palette.

Generated video is optional. Use it only after the complete playable Chapter 1 passes the required UI tests. A short title background or presentation clip is acceptable. Do not use generated video as gameplay, as a replacement for Chapter 0's five-panel story, or as a reason to delay the playable build.

Image and video generation cannot replace 3D meshes, skeletons, skinning, animation clips, collision, enemy logic, or PlayCanvas scene work.

### Asset import checks

- Record source, creator, licence, filename, date, checksum, conversion, runtime use, and credit in `game/asset-ledger.md`.
- Extract archives without errors.
- Confirm scale, pivots, textures, and skeletons.
- Retarget one base character to locomotion, roll, melee, hit, and down before styling every character.
- Verify the bow pose keeps both hands on the weapon without shoulder twisting.
- Add simple custom collision where free environment files lack it.
- Use textures at 2K maximum. Prefer 1K for repeated props and NPCs.
- Convert used runtime assets to optimized GLB.
- Use Meshopt for geometry and WebP or KTX2 for textures where supported.
- Keep about 30,000 to 60,000 visible triangles around the player.

## Sound and captions

Chapter 1 needs:

- one restrained night ambience loop
- fire and distant crowd ambience
- player and enemy footsteps
- bow draw, release, arrow flight, and impact
- blade swings and body impacts
- enemy warning cues
- player hit and down cues
- family danger warning
- rescue completion cue
- Chitra transition cue
- chapter-complete cue

Caption spoken lines and meaningful off-screen sounds such as bells, approaching raiders, and distant shouting. Duck music during Chitra's final line. If a music asset cannot be licensed and audited in time, ship ambience and cues without music.

### Language, settings, and generated voice

The initial language set is English, Hindi, Tamil, Kannada, and Telugu. The selected locale applies to homepage UI, Chapter 0 narration text, control labels, objectives, HUD labels, Settings, captions, subtitles, fixed Chapter 1 dialogue, completion screens, and resume labels. Do not ship a language option whose required strings still fall back visibly to English.

Settings is reachable from the homepage before narration and from the pause menu. Use these groups:

- Language: text language and voice language, linked by default but separately selectable.
- Audio: Master, Music, Effects, and Voice sliders plus Mute All.
- Accessibility: captions, speaker names, camera shake, and tutorial prompts.
- Controls: reopen the keyboard-and-mouse blueprint.
- Progress: confirmed Reset Chapter 1 Progress action.

Use the user's configured server-side AI voice provider through a small adapter. Keep the API key in a server environment variable such as `VOICE_PROVIDER_API_KEY`; never put it in React, PlayCanvas, localStorage, a static export, logs, screenshots, or the repository. Keep the provider model ID configurable so the latest stable multilingual model can be selected without changing game code.

Generate fixed story and dialogue lines once, cache the resulting audio, and map them in a locale-aware voice manifest. Do not generate audio live on every playback. Assign stable personas by role: one narrator, a young adult male Vrishaketu, an adult female Kunti, an adult female Chitra, and at least two distinct male raider or soldier voices. Reuse the same persona for the same character in every language. Do not imitate a celebrity, living performer, or identifiable real person. Record provider, model, synthetic-voice status, locale, persona ID, source line ID, generation date, and runtime path in `game/asset-ledger.md`.

If generation fails for one locale, visible localized text and captions remain usable, the failure is reported clearly, and no browser credential is exposed. This fallback is for resilience; the Chapter 1 acceptance run still requires the complete five-language voice manifest for Chapter 0 and fixed Chapter 1 dialogue.

## Accessibility and usability

- Show the spatial keyboard-and-mouse control blueprint before pointer lock and make it reopenable from Pause.
- Escape pauses and releases pointer lock.
- Provide Master, Music, Effects, and Voice sliders plus Mute All.
- Provide captions and speaker names.
- Do not rely on red versus green alone.
- Pair color with icons, shapes, and text.
- Provide a camera-shake toggle.
- Keep essential text readable at 1080p without browser zoom.
- Keep narration usable without audio.
- Give Back, Next, Skip, Start, Continue, Replay, Pause, and Reset visible focus states.
- Use one normal difficulty. Add an assist option only after every acceptance criterion passes.

## Repository target

```text
dwarka/
  game/
    README.md
    asset-ledger.md
    playcanvas-project.md
    assets/
      raw/
      runtime/
    config/
      chapter-1.json
    client-scripts/
      input.js
      player-controller.js
      phase-manager.js
      progress-bridge.js
      combat-view.js
      enemy-view.js
      objective-view.js
      websocket-client.js
    server/
      package.json
      src/
        index.ts
        protocol.ts
        progress-token.ts
        session.ts
        chapter-1/
          simulation.ts
          phases.ts
          player.ts
          enemies.ts
          objectives.ts
          checkpoints.ts
      tests/
        chapter-1.test.ts
        progress-token.test.ts
  site/
    app/
      page.tsx
      game/
        chapter-1/
          page.tsx
          page.module.css
          ChapterGameClient.tsx
          progress.ts
    public/
      playcanvas/
        chapter-1/
      story-a/
    tests/
      rendered-html.test.mjs
      chapter-1-ui.test.mjs
```

The external public PlayCanvas project remains the scene-authoring source. The repository stores scripts, configuration, server code, progress-token logic, asset records, website integration, tests, and exported builds.

## Autonomous build order

### Milestone 1: Chapter 0 entry flow and progress contract

- Add the Chapter 0 illustrated story to the homepage without breaking the story routes.
- Add first-time, Continue, Replay Story, completed, and reset states.
- Implement the versioned local profile.
- Implement signed progress-token creation and verification with tests.
- Implement the parent and iframe message contract with origin checks.
- Add a placeholder `/game/chapter-1` shell that proves first-time and returning flows before 3D work.
- Test the full flow in the browser.

### Milestone 2: playable Chapter 1 greybox

- Create or connect the public PlayCanvas project from project `705595`.
- Build the four-space street with basic geometry.
- Add movement, camera collision, aim, bow, blade, dodge, interaction, pause, and pointer lock.
- Add phase loading and checkpoints.
- Export and embed the greybox.
- Test movement and phase resume through the real site UI.

### Milestone 3: server-authoritative encounters

- Implement the 20 Hz simulation and WebSocket protocol.
- Add all three encounter compositions.
- Add family danger timers.
- Prove server-owned damage, defeat, rescue, checkpoint, phase advancement, signed token update, death restart, and reconnect.
- Test a return visit after every phase.

### Milestone 4: story-complete Chapter 1

- Add panels 06 through 10 in the specified order.
- Add Chitra's exact final subtitle.
- Add chapter completion and replay behavior.
- Import the approved character, animation, environment, prop, VFX, and audio selections.
- Finish lighting, fog, particles, captions, feedback, and UI.

### Milestone 5: UI and release verification

- Run unit, protocol, server simulation, and production build tests.
- Use EgoLite to test the complete first-time journey through the visible UI.
- Use EgoLite to test returning after each phase.
- Test reset, corrupted token, missing storage, two tabs, death, reconnect, pause, captions, mute, and chapter replay.
- Capture screenshots for Chapter 0, Chapter 1 arrival, each encounter, Chitra ending, complete screen, and Continue state.
- Test the agreed laptop at 1080p and record fps.
- Fix console errors, broken links, inaccessible controls, and visual clipping.

Do not call a milestone complete from code inspection alone.

## Required UI test scenarios

The autonomous agent must operate the running application through EgoLite or an equivalent real browser-control workflow. DOM assertions may support these checks but cannot replace visible interaction.

| Scenario | Required result |
| --- | --- |
| New browser profile | A five-language chooser appears; homepage shows Begin Chapter 0; the story advances through five localized panels; and Begin Chapter 1 opens Settings plus the control blueprint. |
| Control teaching | The pre-pointer-lock blueprint visually maps keyboard and mouse, explicitly teaches contextual bow and blade use, and reopens from Pause > Controls. Arrival prompts clear after the matching inputs. |
| Language coverage | English, Hindi, Tamil, Kannada, and Telugu each localize homepage, Chapter 0 text and voice, controls, objectives, captions, fixed dialogue, Settings, and completion UI without visible English fallback. |
| Audio settings | Master, Music, Effects, and Voice sliders, Mute All, captions, and voice-language selection persist after refresh and affect playback correctly. |
| Voice security | Browser network, page source, storage, console, and static export contain no voice-provider API key; cached audio and the voice manifest cover all required localized lines. |
| Skip narration | Confirmation appears, Chapter 1 opens, and Replay Story remains available later. |
| Complete `arrival` | Server commits progress and a refreshed page continues at `courtyard`. |
| Exit during `market` | Returning visit starts at the market checkpoint, not the arrival lane or mid-attack. |
| Player death | Current phase restarts at 100 health, the restore message appears, and earlier progress remains. |
| Phase advancement | Every newly confirmed phase starts at 100 health; there is no potion, pickup, or mid-encounter regeneration. |
| Invalid token | Clear message appears, settings remain, and gameplay safely starts at `arrival`. |
| Server disconnect | Combat pauses, Reconnecting appears, and play resumes or offers a clear retry. |
| Two tabs | Newest confirmed progress appears in both tabs without moving backward. |
| Chapter complete | Homepage shows Chapter 1 complete and Replay Chapter 1. No Chapter 2 begins. |
| Reset progress | Confirmation is required and the next visit behaves like a first visit. |
| Keyboard-only narration | Back, Next, Skip, Start, captions, and mute can be reached and used. |
| 1080p playthrough | Essential UI remains readable and the game holds at least 45 fps. |

## Acceptance criteria

Chapter 1 is complete only when every item below passes:

- The homepage includes Chapter 0 as the five-panel non-playable Karna story.
- Chapter 0 has no player-controlled movement or combat.
- A first-time player can finish or skip Chapter 0 and start playable Chapter 1.
- The homepage offers English, Hindi, Tamil, Kannada, and Telugu before Chapter 0 and keeps Chapters separate from Settings.
- All required UI, narration text, captions, subtitles, and fixed dialogue are complete in all five languages.
- Cached synthetic voice exists for Chapter 0 and fixed Chapter 1 dialogue in all five languages with stable role personas and a complete ledger/manifest.
- No voice-provider secret reaches the browser, repository, logs, screenshots, or static game export.
- A returning player sees Continue and resumes at the correct phase.
- Progress survives refresh, browser restart, and server restart on the same browser profile.
- The server rejects modified or invalid progress tokens.
- Reset progress works only after confirmation.
- The four existing story routes still work.
- `/game/chapter-1` shows the spatial keyboard-and-mouse blueprint before pointer lock; it explains contextual bow/blade use and can be reopened from Pause.
- The game is third-person 3D and follows the colorful night direction.
- Camera collision prevents routine wall clipping.
- Movement, sprint, dodge, aim, bow, blade combo, and interaction work.
- All three encounters use the fixed enemy compositions.
- Family danger timers are readable and server-owned.
- Damage, defeat, rescue, checkpoints, phase completion, and chapter completion come from the server.
- Every confirmed phase and death restart begins at 100 health; Chapter 1 has no healing inventory, pickup, or regeneration.
- Disconnect pauses combat and provides a reconnect path.
- Panels 06 through 10 appear in the required order.
- Chitra's subtitle reads exactly `They asked for you by name.`
- Chitra's death cannot be changed by player skill.
- The complete screen offers Replay Chapter 1 and Return Home.
- No route automatically begins Chapter 2.
- The complete playthrough has no uncaught console error.
- `npm run build` passes in `site/`.
- Automated tests pass.
- The required UI scenarios pass through browser interaction.
- The agreed laptop holds at least 45 fps at 1080p, with 60 fps as the target.
- Every external asset has a verified ledger entry.
- No payment, subscription, account system, database, mobile feature, controller support, multiplayer system, or later chapter is required.

## Cut order

If time slips, cut in this order:

1. Extra civilian model variations.
2. Unique building meshes beyond the four-space street.
3. The gada brute's second attack if one was added.
4. Optional music. Keep ambience and critical cues.
5. In-engine Chitra dialogue animation. Keep the panel, subtitle, and audio beat.
6. Extra incidental combat barks beyond the fixed localized dialogue set.

Never cut Chapter 0, the five-language text and fixed-line voice coverage, the starting control blueprint, Settings, Start and Continue states, signed progress, third-person movement, bow and blade combat, three encounters, family objective, Chitra ending, server-owned results, browser UI testing, or the Chapter 1 complete flow.

## Cultural rules

- Never make a deity or avatar playable, fightable, or defeatable.
- Never give Arjuna, Karna, Kunti, or another revered epic figure a boss health bar.
- Do not make Karna playable. Chapter 0 is illustrated narration only.
- Do not show Karna's fatal arrow.
- Do not let the player perform a famous canonical kill.
- Use restrained English without modern slang.
- Show this opening attribution before the illustrated prologue: `Adapted from the Jaiminiya Ashvamedha Parva and later regional traditions.`
- Do not present generic European knight, church, or heraldic imagery as ancient India.
- Use the free fantasy assets as raw material. Recolor and recombine them with cloth, sun, chariot, and regional motifs.

## Explicit exclusions

Do not implement playable action in Chapter 0, Chapter 2, astras, mercy, weapon lowering, tiger-horse, Lambodari, Bhishana, controller support, touch input, mobile optimization, accounts, cross-device save sync, analytics, leaderboards, multiplayer, database work, pixel streaming, paid assets, AI-generated 3D replacements, or a new engine.

## Copy-paste prompt for the autonomous agent

```text
Work autonomously on the DWARKA game in /Users/adityapratapsingh/dev/dwarka.

Read /Users/adityapratapsingh/dev/dwarka/site/docs/chapter-1-game-handoff.md completely before changing code, using PlayCanvas, or downloading assets. Treat that file as the only implementation source of truth. Older plans and research are historical. Do not reopen confirmed decisions.

Build the two-part experience defined in the specification. Chapter 0, "The Wheel," is the non-playable five-panel Karna story on the homepage. Chapter 1, "The Boy with the Paper Sun," is the playable overnight build target. After Chapter 0, a first-time player starts Chapter 1 as Vrishaketu. A returning player must see Continue and resume at the first unfinished gameplay phase. Use the versioned anonymous browser profile, server-signed progress token, iframe message contract, phase table, failure behavior, and reset rules in the specification. Do not add accounts or a database.

Use PlayCanvas Free with a public Editor project based on official project 705595. Use the existing JavaScript server for the 20 Hz authoritative simulation. The server owns combat, objectives, checkpoints, phase advancement, signed progress, and chapter completion. Preserve the existing story-review routes.

Use EgoLite browser control for PlayCanvas, approved asset downloads, and end-to-end UI testing. Download only the approved free Standard files. Never accept a paid upsell. Maintain game/asset-ledger.md. If PlayCanvas or Mixamo requires login, CAPTCHA, terms, or a user-only confirmation, hand the existing EgoLite task space to me and resume after I confirm.

You may use Codex image generation for missing 2D UI, title, emblem, portrait, loading, and reference art listed in the specification. Save and ledger every generated file. Generated video is optional and may begin only after playable Chapter 1 passes the required UI scenarios. Do not let image or video generation delay the working game.

Follow the milestone order in the specification. Work through safe routine decisions without pausing. Do not stop after writing code or reviewing diffs. Run the site, interact with the real UI, verify first-time and returning flows, test resume after every phase, test invalid progress, death, reconnect, reset, two tabs, accessibility controls, chapter completion, and the full 1080p playthrough. Capture the required screenshots and fix failures before claiming completion.

Do not make Chapter 0 playable. Do not build Chapter 2, later missions, accounts, mobile controls, controller support, multiplayer, a database, paid assets, or another framework. Do not change the fixed story outcome.

The Chapter 1 brute's existing heavy weapon is a generic mortal iron gada. This is a naming and prop-direction decision only. Do not add playable gada combat, a second brute attack, Bhima training, spear combat, astras, or any other future-chapter mechanic.

Treat the five-language Settings and onboarding requirements as Chapter 1 presentation acceptance criteria, not new combat scope. Offer English, Hindi, Tamil, Kannada, and Telugu; keep Chapters and Settings separate on the homepage; show the spatial keyboard-and-mouse blueprint before pointer lock and from Pause; and teach that holding right mouse selects bow aim while releasing it returns left mouse to blade attack. Generate and cache Chapter 0 narration plus fixed Chapter 1 dialogue through the configured server-side voice provider using stable male and female role personas. Keep its API key server-only, keep model selection configurable, write a locale-aware voice manifest, and ledger every generated file. Add no live per-play voice generation.

Chapter 1 has no mid-combat healing. Every confirmed phase and death restart begins at 100 health, and death restarts only the current phase. Verify these rules visibly in EgoLite.

Finish only when every acceptance criterion and UI scenario in the specification passes. Leave the repository with the static PlayCanvas export, website integration, server code, progress-token tests, browser-tested game flow, asset ledger, project record, passing production build, and a concise report containing the local URL, PlayCanvas project URL, commands run, test results, screenshots, performance result, and any remaining release-only asset provenance note.
```
