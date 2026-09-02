# DWARKA future chapters handoff

**Status:** approved planning contract for work after Chapter 1

**Approved:** 2026-09-02

**Scope:** Bhadravati through the Manipur epilogue; snow is documented only as an excluded future expansion

This file tells a future agent how to extend the game after Chapter 1. It does not authorize changes to the current Chapter 1 build.

## Source-of-truth boundary

- Use `docs/chapter-1-game-handoff.md` for the current Chapter 0 and Chapter 1 implementation.
- Use this file for playable chapters after Chapter 1.
- Use `docs/game-planning-handoff.md` for the complete story sequence and cultural background.
- Use `docs/research/mahabharata-future-weapons-progression.md` for citations and weapon terminology.
- Do not import future mechanics, environments, or assets into Chapter 1 merely because they appear here.

Chapter 1 remains the combat foundation. It establishes third-person movement, shoulder aiming, bow projectiles, short-blade combat, dodge timing, damage, enemy reactions, checkpoints, anonymous progress, server-owned outcomes, and visible browser testing. Later chapters must extend those systems instead of replacing them.

## Approved player experience

The player crosses regions that differ in silhouette, traversal, sound, lighting, and combat conditions. A biome cannot qualify as distinct through color grading alone.

The journey keeps Vrishaketu's bow as the identity weapon. Later chapters add a spear, three restricted elemental arrow techniques, and eventually a mortal iron gada. Unlocks come through teaching, gifts, or earned trust. The player never loots a revered figure's named weapon.

## Chapter and biome map

| Part | Place and visual identity | Player-visible environment behavior | Progression |
| --- | --- | --- | --- |
| Chapter 0 narration | Ash-covered Kurukshetra, broken chariots, muted bronze sky | Illustrated narration only | No gameplay or unlock |
| Chapter 1 | Indigo night streets, burning market stalls, pale stone, smoke, colorful cloth | Compact urban combat and rescue objectives | Bow, short blade, dodge, core combat |
| Bhadravati | Fertile river kingdom, green fields, warm sandstone walls, torchlit royal stables | Rooftop routes, stable infiltration, animal spaces, guarded courtyards | Charged bow and spear after Suvega is spared |
| Shalva | Rocky highland road, dry forest, red cliffs, ravines, mountain switchbacks | Chariot pursuit, elevation, narrow paths, axle and wheel targets | Agneyastra taught by Arjuna |
| Cursed lakes | Cold blue wetlands, fog, reeds, reflective water, twisted trees | Tracking, nets, shallow-water footing, reduced visibility, non-lethal boss | Varunastra taught by Arjuna |
| Champapuri | Scorched dark stone, copper cauldrons, braziers, smoke, heat distortion | Timed survival, civilian protection, moving safe ground, arrow storm | Vayavyastra taught by Arjuna; optional blade mesh upgrade |
| Vriksha | Dense emerald flowering forest with magenta, gold, and poisonous plants | Illusions, captive flowers, misleading paths, weapon-lowering choice | No new weapon family |
| Bhishana finale | The Vriksha grove changes through dusk, supernatural night, and pale dawn | Living shields, shadow clones, poison, time-of-night phase changes | Existing skills combine; charged bow remains the final shot |
| Manipur epilogue | Rain-washed foothills, waterfalls, rivers, distant blue mountains | Peaceful traversal and the next-story reveal | No combat unlock |
| Later expansion | A story-justified northern mountain route with snowfields, ice caves, and high passes | Slippery footing, wind, exposure, limited visibility | Outside the current campaign |

Snow does not belong in the approved Vrishaketu campaign yet. A later story must take the horse or party to a real high-mountain route before a snow biome becomes playable. Do not turn Manipur into a snowfield without a researched route and a separate user decision.

## Biome contracts

Every playable area must define all eight fields before art production begins:

1. A landmark visible during ordinary play.
2. A ground and rock family.
3. A vegetation family.
4. Weather, atmosphere, and lighting.
5. Ambient sound and footstep profile.
6. A traversal difference.
7. A combat, aiming, or visibility modifier.
8. Reused assets and chapter-specific assets.

| Area | Landmark | Ground and skyline | Atmosphere and sound | Mechanical identity |
| --- | --- | --- | --- | --- |
| Bhadravati | Stable towers and the white-horse gate | Irrigated earth, sandstone, river plain | Insects, horses, distant bells, torch crackle | Quiet route or open brawl; rooftop archers |
| Shalva | Broken cliff road and chariot switchback | Red rock, dry scrub, layered ridges | Hard wind, wheels, hoofbeats, falling gravel | Fast pursuit and ranged component targeting |
| Cursed lakes | Two lakes with different reflections | Mud, reeds, shallow water, bare roots | Fog, water birds, muffled distance, animal calls | Tracking and non-lethal control; wet footing |
| Champapuri | Cauldron court and copper fire towers | Scorched stone, enclosed court, hard vertical walls | Heat shimmer, oil hiss, braziers, crowd panic | Survive, protect civilians, move between safe zones |
| Vriksha | Captive flower meadow and one impossible tree | Soft forest floor, dense roots, layered canopy | Pollen, whispers, insects falling silent at dusk | Read shadows, free captives, refuse false targets |
| Bhishana | The same impossible tree split by the dawn line | Corrupted roots and closing arena edges | Dusk voices, night silence, dawn birds returning | Three boss phases that transform an existing biome |
| Manipur | River crossing beneath blue foothills | Wet stone, grass, riverbanks, distant mountains | Rain runoff, horse tack, water, open wind | No combat; decompress and reveal Babhruvahana |

Bhadravati and Vriksha may both be green, but they cannot share an identity. Bhadravati is cultivated, geometric, and inhabited. Vriksha is overgrown, deceptive, and biologically impossible. Chapter 1 fire is an emergency scattered through a night street. Champapuri fire is ritual heat under harsh light. Do not use lava in either place.

## Approved weapon progression

### Identity and loadout

- The bow remains Vrishaketu's identity weapon.
- The short `asi` or `khadga` remains the close-range backup established in Chapter 1.
- The player carries the bow plus one selected melee family. The melee slot can later hold the blade, spear, or gada.
- Do not expose all future families at once merely because the assets exist.

| Family | Combat role | Approved introduction | Development cost |
| --- | --- | --- | --- |
| Bow | Range, precision, elemental arrow techniques | Chapter 1, then deepened throughout | Existing foundation |
| Short blade | Fast emergency melee | Chapter 1 | Existing foundation |
| Spear | Reach, shield pressure, chariot control | Gift after sparing Suvega in Bhadravati | Medium; new held and thrust animation set |
| Gada | Slow guard break, armour damage, ground-slam answer | Bhima teaches it after Bhadravati; the playable family activates only in a later chapter delivery that does not also introduce spear and an astra | High; separate two-handed animation and hit-volume set |

The Chapter 1 brute carries a generic mortal iron gada. It is not a `musala`, Kaumodaki, or Bhima's personal mace. This naming change does not add a new attack or animation to Chapter 1.

### Unlock rules

| Story point | Unlock | Delivery |
| --- | --- | --- |
| Bhadravati | Charged shot | Practice and use during the horse escape |
| After sparing Suvega | Spear family | Gift from Suvega or a field commission from Yauvanashva |
| Shalva | Agneyastra | Restricted arrow technique taught by Arjuna |
| Cursed lakes | Varunastra | Restricted arrow technique taught by Arjuna |
| Champapuri | Vayavyastra | Restricted arrow technique taught by Arjuna |
| Bhima training after Bhadravati | Mortal iron gada lesson | Bhima teaches gada-yuddha and gives a practice weapon; gameplay activation waits until the spear has settled |

Astras are bow modes, not loot and not separate weapon models. They remain story-gated techniques. Do not put Brahmastra, Pashupatastra, Narayanastra, or Vasavi Shakti on a player skill screen.

### Ownership bans

Vrishaketu cannot own or loot these named or divine objects:

- Gandiva
- Vijaya
- Sudarshana Chakra
- Kaumodaki
- Sharnga
- Pinaka
- Nandaka
- Vasavi Shakti
- Parashurama's axe
- Balarama's plough
- Karna's original armour and earrings
- Bhima's personal mace

Do not create player weapon families for chakra, trishula, parashu, pasha, musala, or hala. Nets remain a mundane mission tool at the cursed lakes.

The HUD uses `bow`, `blade`, `spear`, and `mace`. Sanskrit terms such as `dhanush`, `asi`, `shakti`, and `gada` belong in captions, narration, and lore.

### Input evolution

Preserve Chapter 1's contextual bow and melee input: holding right mouse enters bow aim, while releasing it leaves left mouse available for the equipped melee family. After the spear or gada is genuinely unlocked, `Q` cycles the single melee slot among earned families and the HUD shows the current melee icon and localized name. Do not add `Q`, a weapon wheel, or number-key loadout switching to Chapter 1. Update the control blueprint only when a new action becomes playable.

## Reuse contract for future implementation

A later agent must first prove that the Chapter 1 systems work through the visible UI. Then it may extend them through configuration and small modules.

Reuse without replacement:

- third-person controller and camera collision
- aim mode and projectile prediction
- dodge timing and invulnerability
- player and enemy damage events
- animation state machine
- server-owned combat results
- encounter boundaries and spawn composition
- checkpoint and resume flow
- progress-token verification
- captions, pause, mute, accessibility feedback, and UI testing

Extend only when the next chapter needs it:

- `charged` bow state in Bhadravati
- `meleeSlot` for blade and spear
- `astraMode` for the three approved arrow techniques
- `mercy` and `lowerWeapon` actions in their story chapters
- non-lethal capture and boss completion rules
- gada states after the spear chapter is stable

Do not rewrite the player controller for each chapter. Do not create one monolithic state machine containing unfinished mechanics for the entire campaign.

## Campaign progress and session rules

- Preserve a completed Chapter 1 record when the campaign schema expands.
- Migrate the anonymous Chapter 1 profile instead of replacing or silently clearing it.
- Store the highest unlocked chapter, each chapter's first unfinished phase, earned weapons, learned arrow techniques, and settings.
- Preserve the player's text locale, voice locale, audio mix, captions, camera-shake choice, and tutorial preference during schema migration.
- Continue resumes at the first unfinished confirmed phase.
- Replay does not erase the furthest confirmed campaign progress.
- A future chapter unlocks only after the previous required chapter completes.
- Keep accounts, database storage, and cross-device sync outside scope until the user approves them.
- The current Chapter 1 homepage must still stop after Chapter 1. A later implementation may add `Continue the Journey` only when Chapter 2 actually exists and passes UI tests.
- Inherit the Chapter 1 checkpoint rule: a confirmed phase and a death restart load at full health unless a later chapter explicitly documents and tests a different recovery system.

## Localization and voice inheritance

Every later chapter inherits English, Hindi, Tamil, Kannada, and Telugu for UI, objectives, captions, subtitles, fixed dialogue, and story narration. Do not add a chapter with English-only strings. New lines must receive stable IDs, human-reviewed translations, cached synthetic audio, and entries in the locale-aware voice manifest and `game/asset-ledger.md` before that chapter passes acceptance.

Reuse each recurring character's established synthetic persona across chapters and languages. New characters may use additional male or female personas, but never clone or imitate an identifiable real performer. Keep voice generation server-side, keep the API key out of all browser artifacts, and keep provider/model selection configurable. The game plays cached files; it does not call the generation provider during normal gameplay.

## Asset and browser-control plan

The budget remains $0. Reuse the Chapter 1 humanoid skeleton, animation base, props, particles, audio, and PlayCanvas project where practical. Distinct biomes still need distinct silhouettes, landmarks, ground materials, ambience, and chapter bundles.

| Need | Starting point | Rule |
| --- | --- | --- |
| Fields, trees, reeds, roots, rocks | Quaternius Stylized Nature MegaKit or another verified CC0 pack | Verify exact free file and license in EgoLite before download |
| Stables and courts | Existing Medieval Village and Fantasy Props selections | Recombine and remove European heraldry; add local cloth, roof, gate, and chariot motifs |
| Water and fog | Simple PlayCanvas planes, depth fog, particles, and reflection treatment | Prefer small custom materials over a second environment pack |
| Fire and heat | Existing Kenney smoke sprites, emissive materials, heat-distortion shader if performance allows | No lava assets for Champapuri |
| Flower forest | Recolored and reshaped plant meshes plus chapter-specific flower and captive silhouettes | The impossible tree and captive flowers must be unique landmarks |
| Mountains and cliffs | Instanced rock set plus terrain mesh | Shalva requires a new skyline and elevation, not a flat road with red tint |
| Snow expansion | No asset approved yet | Research only when its story chapter is approved |
| Ambient audio | Chapter-specific wind, water, insects, horse, fire, crowd, and forest profiles | Verify license and ledger every file |

Use EgoLite for every asset website, PlayCanvas Editor operation, and visible end-to-end test. Reuse one browser task space. Never accept a paid upsell. If login, CAPTCHA, terms, or project visibility requires the user, hand back the same task space and resume after confirmation.

Before importing any new asset:

1. Name the exact gap in the current chapter.
2. Check whether an already approved pack can fill it.
3. Verify the official page, free filename, and license in EgoLite.
4. Download only the selected free file.
5. Record source, creator, license, filename, date, checksum, conversion, and runtime use in `game/asset-ledger.md`.
6. Import only used meshes, clips, textures, and sounds.

Keep the public PlayCanvas project below its storage limit. Load chapter bundles on demand and unload the previous biome after a transition card.

## Environment acceptance tests

A later chapter does not pass visual review until all of these are true:

- A screenshot without HUD can be identified by chapter from the landmark and skyline.
- The area remains readable with its main weather effect active.
- Ground collision, camera collision, and aiming work on its elevation and narrow paths.
- Footsteps and ambience change with the biome.
- The chapter mechanic uses the area, such as chariot targeting in Shalva or wet footing at the lakes.
- Color is not the only signal for hazards, routes, targets, or safe ground.
- Performance remains at least 45 fps at 1080p on the agreed laptop, with 60 fps as the target.
- Resume, death, reconnect, unlock, and completion work through the visible UI.
- EgoLite screenshots capture entry, landmark, main encounter, unlock, and completion.

## Recommended build order after Chapter 1

1. Run every Chapter 1 acceptance test and preserve a clean baseline.
2. Extract reusable controller, combat, progression, UI, and encounter configuration without changing behavior.
3. Build Bhadravati as the first extension. Add its biome contract, charged shot, Suvega encounter, mercy result, and spear unlock.
4. Regression-test Chapter 1 and Bhadravati through EgoLite.
5. Build Shalva with chariot targets and Agneyastra.
6. Add the cursed lakes, then Champapuri, then Vriksha and Bhishana in story order.
7. Treat the snow region as a separate approved expansion, not a missing asset task.

Do not build two new weapon families in one chapter. Do not introduce the gada in the same delivery as the spear and first astra. If schedule slips, defer the gada family, tomara throw, blade length upgrade, and third astra in that order. Never cut the bow identity, mercy rules, named-weapon ban, or chapter-specific landmark.

## Prompt for the next autonomous agent

```text
Continue the DWARKA game only after Chapter 1 is working and its acceptance tests pass.

Read these files completely before changing code or downloading assets:
1. /Users/adityapratapsingh/dev/dwarka/site/docs/chapter-1-game-handoff.md
2. /Users/adityapratapsingh/dev/dwarka/site/docs/future-chapters-game-handoff.md
3. /Users/adityapratapsingh/dev/dwarka/site/docs/game-planning-handoff.md

Treat Chapter 1 as a protected regression baseline. Do not expand it with later mechanics. Reuse its third-person controller, bow and blade combat, dodge, damage, enemy reactions, server authority, session progress, checkpoints, accessibility, and browser-test flow.

Preserve its five-language UI and cached-voice system. Add every new line in English, Hindi, Tamil, Kannada, and Telugu, reuse recurring character personas, keep the voice-provider key server-only, and verify Settings persistence plus the absence of English fallback through visible UI testing. When the spear unlocks, add `Q` to cycle earned melee families while right mouse continues to select bow aim; do not back-port that input to Chapter 1.

The first future implementation target is Bhadravati. Build its cultivated green river-kingdom identity, stable landmark, infiltration routes, Suvega spear-and-shield encounter, mercy result, charged bow, and spear unlock. The spear is a gift after Suvega is spared. It is not Vasavi Shakti. Do not add the playable gada or astras in the same chapter.

Use EgoLite for all PlayCanvas Editor work, approved free asset downloads, and visible UI testing. Never accept a paid upsell. Maintain game/asset-ledger.md. Hand the existing EgoLite task space to the user for login, CAPTCHA, terms, or user-only confirmation, then resume.

Keep the environment contract, weapon bans, session migration, UI scenarios, performance target, and acceptance tests in the future-chapters handoff. Run the full Chapter 1 regression suite after every shared-system change. Do not stop at code review. Finish only after the running Bhadravati chapter passes visible first-time, return, resume, death, reconnect, unlock, completion, and 1080p performance tests.
```
