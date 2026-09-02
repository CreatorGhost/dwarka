# DWARKA game planning handoff

Use this document for the complete story sequence and cultural background. Current Chapter 1 implementation decisions live in `docs/chapter-1-game-handoff.md`. Approved post-Chapter-1 gameplay, weapon, biome, asset, and future-agent decisions live in `docs/future-chapters-game-handoff.md`.

> **Planning update, 2026-09-02:** Story A, Vrishaketu, and PlayCanvas Free are confirmed. The desktop target, zero-dollar budget, server boundary, asset policy, and protected Chapter 1 build are recorded in `docs/chapter-1-game-handoff.md`. The later weapon progression and chapter-by-chapter environment map are approved in `docs/future-chapters-game-handoff.md`. Do not use future decisions to expand the current Chapter 1 implementation.

## Project status

DWARKA is a browser game project set after the Kurukshetra war. The public deployment is still the story-review website. Local Chapter 1 runtime work is in progress and has not yet passed the handoff's acceptance tests.

- Public review site: <https://dwarka-story-review.adityapratap2307.chatgpt.site>
- Confirmed story: Story A, Vrishaketu
- Story status: locked for implementation
- Game status: Chapter 1 implementation in progress; not yet accepted as complete
- Hackathon target: a clear browser MVP that can be completed in 48 to 72 hours

The planning agent must not rewrite the story while producing the technical plan. Any story change needs a separate user decision.

## Source-of-truth order

When two files disagree, use this order:

1. `docs/chapter-1-game-handoff.md` for the current implementation scope and locked Chapter 0 and Chapter 1 decisions.
2. `docs/future-chapters-game-handoff.md` for approved work after Chapter 1.
3. `app/vrishaketu/page.tsx` for the complete scene sequence, player objectives, enemies, and story consequences.
4. The Traycer Vrishaketu specification for research notes, adaptation rules, cultural constraints, and source references.
5. This handoff for the complete later story and background.
6. `app/page.tsx` and the three alternative routes for story comparison.

The old files under `/Users/adityapratapsingh/dev/dwarka/docs/` are archival prototypes. Do not plan from them.

## The current pitch

You play Vrishaketu, Karna's surviving son. Arjuna, the man who killed Karna, becomes the boy's mentor after the war. Raiders murder Vrishaketu's ten-year-old foster-brother Chitra and leave a message saying they came for Vrishaketu. Their trail follows the road taken by Yudhishthira's Ashvamedha horse, so Vrishaketu joins the escort and hunts them across Bharat.

The story asks one question. Will Vrishaketu inherit Karna's grievance, or decide what dharma means for himself?

## Player and cast

| Character | Function in the game | Fixed rule |
| --- | --- | --- |
| Vrishaketu | Player character, age 17, bow and short blade | Mortal. He may win, lose, and die without placing a deity in a fail state. |
| Karna | Vrishaketu's dead father and the emotional inheritance | Never a boss or valid target. The Lambodari illusion breaks when the player lowers the bow. |
| Arjuna | Mentor and source of the central conflict | Never a boss with a health bar. He helps only when the story requires it. |
| Chitra | Foster-brother whose death starts the hunt | His paper sun-crest is the trail marker and emotional object. |
| Bhishana | Main villain, son of Bakasura | He wants to turn Vrishaketu's grief against the Pandavas. |
| Lambodari | Shape-shifter and Bhishana's infiltrator | Copies trusted faces. Her final disguise is Karna. |
| Meghavarna | Rakshasa scout and companion | Reveals illusions during the final fight. Never player-controlled in the MVP. |
| Bhima | Ally and comic force in Bhadravati | His famous canonical victories remain his. |

## Complete story sequence

| Part | What the player does | Enemies or obstacle | Story result |
| --- | --- | --- | --- |
| Prologue, The Wheel | Play Karna's final three minutes and survive as long as possible | Soldiers, arrow volleys, an elite chariot, then the sunken wheel | The controls stop when Karna sets down his bow. The fatal arrow is not shown. |
| Chapter 1, The Boy with the Paper Sun | Return to the charioteers' quarter and protect fleeing families | Three groups of rakshasa raiders | Vrishaketu finds Chitra dying. The horse road and the raiders' trail point the same way. |
| Mission 1, Steal the Horse | Cross Bhadravati's stables, cut the gate chain, and escape with the white horse | Stable guards, rooftop archers, hound handlers, then Suvega | Vrishaketu spares Suvega. The defeated kingdom joins the escort. |
| Mission 2, Chase through Shalva | Pursue the stolen horse, disable chariots, and capture Anushalva alive | Mounted scouts, shield infantry, chariot lieutenants, then Anushalva | Vrishaketu shoots the wheels instead of the rider and chooses mercy. |
| Mission 3, The Horse Becomes the Enemy | Track the cursed tiger-horse, weaken it with nets, and guide it to the second lake | Mist spirits, cursed animals, then the tiger-horse | The player learns restraint. A killing finisher fails the mission. |
| Mission 4, A Victory That Feels Wrong | Protect civilians and survive Sudhanva for three minutes | Royal guards, cauldron keepers, Sudhanva's arrow storm | Arjuna kills Sudhanva. Vrishaketu questions what the escort calls victory. |
| Mission 5, The Face of His Father | Free people trapped in flowers and expose Lambodari's real body | Flower mimics, rakshasa scouts, false allies, then Lambodari | The player lowers the bow when she becomes Karna. Bhishana reveals that Chitra was bait. |
| Final, Bhishana | Reject the bargain, protect captives, and defeat Bhishana before sunrise | Captive shields at dusk, shadow clones at night, poison at dawn | Arjuna lowers his bow. Vrishaketu wins his own fight and rejects inherited vengeance. |
| Epilogue, The Road Continues | Walk the horse toward Manipur | No combat | Babhruvahana stops the horse and creates the sequel hook. |

## Approved environmental journey

These identities are now part of the future-chapter plan. They do not expand Chapter 1.

| Part | Environmental identity | Gameplay use |
| --- | --- | --- |
| Chapter 0 narration | Ash-covered Kurukshetra and broken chariots under a muted bronze sky | Illustrated story only |
| Chapter 1 | Indigo night streets, scattered market fires, smoke, pale stone, and colorful cloth | Compact urban protection combat |
| Bhadravati | Cultivated green river kingdom, sandstone walls, royal stables, and torchlit yards | Infiltration, rooftops, animals, and Suvega's duel |
| Shalva | Dry forest crossing rocky foothills, red cliffs, ravines, and switchbacks | Chariot pursuit, elevation, and wheel targeting |
| Cursed lakes | Cold blue wetland, reeds, shallow water, twisted trees, and heavy fog | Tracking, wet footing, nets, and a non-lethal boss |
| Champapuri | Scorched court, copper cauldrons, braziers, smoke, and heat distortion | Timed survival and temporary oil-fire lanes, with no lava biome |
| Vriksha | Dense emerald flowering forest with impossible plants and captive blooms | Illusions, hidden captives, false paths, and the lower-weapon choice |
| Bhishana finale | Vriksha transformed through dusk, supernatural night, and pale dawn | Reused arena with phase-specific shadows, poison, and safe lanes |
| Manipur epilogue | Rain-washed foothills, rivers, waterfalls, and distant blue mountains | Peaceful traversal and the sequel reveal |
| Later expansion | A separately justified northern high-mountain route | Snow, ice, wind, and cold-weather play remain outside the current campaign |

Snow is not part of the approved Vrishaketu route. A future story must justify a high-mountain journey before snow assets or mechanics enter production. Manipur remains misty and monsoon-green unless later research supports a different route.

## Combat and progression already implied by the story

The plan should preserve these mechanics unless the user approves a story change:

- Bow combat at range and a short blade at close range.
- Charged shot introduced in Bhadravati and reused for the final shot.
- A spear gifted after Vrishaketu spares Suvega. It is a mortal weapon, never Vasavi Shakti.
- Agneyastra taught by Arjuna for fire interactions and chariot wheels.
- Varunastra taught by Arjuna for extinguishing fire, changing footing, and purging poison.
- Vayavyastra taught by Arjuna for movement and dispersing illusion clones.
- A mortal iron gada taught by Bhima only after the spear chapter is stable. It is not Bhima's personal mace or Kaumodaki.
- Mercy as an action, not only a dialogue choice.
- Non-lethal boss logic for the tiger-horse.
- A timed survival objective for Sudhanva.
- A lower-the-weapon input that resolves the Karna illusion.
- Bhishana's final fight changes across dusk, night, and dawn.

The bow remains Vrishaketu's identity weapon. Elemental astras are story-gated bow modes, not loot. The player uses the bow plus one melee family at a time. Do not give the player Gandiva, Vijaya, Sudarshana, Kaumodaki, Sharnga, Pinaka, Nandaka, Vasavi Shakti, Parashurama's axe, Balarama's plough, Karna's original armour, or Bhima's personal mace.

## Earlier multi-chapter MVP

This earlier scope is superseded for the current build. The next implementation target is Chapter 1 only, as defined in `docs/chapter-1-game-handoff.md`. Keep the outline below as the intended later demo shape.

Build four playable beats:

1. The Wheel, a short scripted survival prologue.
2. Chase through Shalva, the main lethal combat encounter.
3. The cursed tiger-horse, the non-lethal encounter.
4. Bhishana, the final three-phase boss.

Present Bhadravati, Champapuri, and Vriksha's setup as illustrated story cards between the playable sections. This keeps the complete story while limiting the number of environments and enemy behaviours.

If the schedule slips, cut in this order:

1. Lambodari as a separate playable mini-boss. Keep her reveal as a story card.
2. A real-time day and night system. Use scripted lighting changes in the final arena.
3. The Suvega duel. Keep Bhadravati as an illustrated transition.

## Cultural and adaptation rules

These are requirements, not optional polish:

- Do not make a deity or avatar playable, fightable, or defeatable.
- Do not give a revered epic figure a boss health bar.
- Do not let the player perform a famous canonical kill.
- Never let the player shoot Karna's likeness.
- Treat Sudhanva as a survival encounter, not a kill objective.
- Treat the tiger-horse as frightened and cursed, not evil.
- Label the game as adapted from the Jaiminiya Ashvamedha Parva and later regional traditions.
- Use restrained dialogue. Avoid modern slang and comedy around sacred material.
- Vary the regional visual language as the horse travels. Do not make every place look like the same temple complex.

## Resolved implementation decisions

1. Vrishaketu is locked.
2. Chapter 1 is the playable build. Chapter 0 is the non-playable five-panel Karna narration that leads into it.
3. Krishna does not appear in Chapter 1.
4. The initial release uses English, Hindi, Tamil, Kannada, and Telugu for UI, Chapter 0 narration, captions, subtitles, and fixed Chapter 1 dialogue. Voice is generated server-side, cached, and cast with consistent role personas; secrets never reach the browser.
5. The game uses a real-time, over-the-shoulder, third-person 3D camera.
6. Keyboard and mouse are the only required controls. Mobile, touch, and controller support are excluded.
7. Chapter 1 remains the protected combat foundation and does not receive later mechanics or biomes.
8. The future weapon order is bow and blade, then spear, then story-gated astras, then a later Bhima-taught mortal gada.
9. The approved future environment map is recorded in `docs/future-chapters-game-handoff.md`.
10. Champapuri uses court, oil, cauldron, smoke, and heat effects rather than a lava region.
11. Snow is reserved for a separately approved high-mountain expansion.
12. Chapter 1 has no mid-combat health recovery. Every confirmed phase and death restart begins at full health.
13. The starting screen uses a spatial keyboard-and-mouse blueprint. Chapter 1 switches contextually between bow and blade; future chapters add `Q` only after another melee family unlocks.

## Existing files and assets

### Current story pages

- `app/page.tsx` contains the four-story comparison.
- `app/vrishaketu/page.tsx` contains Story A and 32 panel references.
- `app/emberborn/page.tsx` contains Story B and 9 scene cards.
- `app/babhruvahana/page.tsx` contains Story C and 10 scene cards.
- `app/abhimanyu/page.tsx` contains Story D and 9 scene cards.

### Art

- `public/story-a/` contains 32 compressed Story A storyboard panels.
- `public/story-b/` contains 9 Story B panels.
- `public/story-c/` contains 10 Story C panels.
- `public/story-d/` contains 9 Story D panels.
- `public/og.png` is the sharing image for the review site.

These images are storyboards and pitch art. Do not assume they are production-ready game sprites, backgrounds, animation sheets, hit effects, or UI assets.

### Research and durable context

- Vrishaketu specification: `/Users/adityapratapsingh/.traycer/epics/a360cb19-6f3d-4de2-bc83-1ec2b4c7091f/artifacts/story-vrishaketu/index.md`
- Story research: `/Users/adityapratapsingh/.traycer/epics/a360cb19-6f3d-4de2-bc83-1ec2b4c7091f/artifacts/story-research/index.md`
- Review-site record: `/Users/adityapratapsingh/.traycer/epics/a360cb19-6f3d-4de2-bc83-1ec2b4c7091f/artifacts/story-review-site/index.md`

## Earlier planning assignment

This assignment is complete. Keep it only as a record of how the current Chapter 1 handoff was produced. Do not run it again.

Produce a practical game plan without implementing it. The plan must include:

- Recommended browser game framework with a reason tied to the 48 to 72 hour schedule.
- Camera format and input scheme.
- The thirty-second core play loop.
- Player movement, aim, dodge, melee, ranged attack, astra selection, and mercy inputs.
- Combat state model, damage rules, invulnerability timing, checkpoints, and fail states.
- Enemy list with the smallest reusable set of behaviours.
- Detailed logic for Anushalva, the tiger-horse, and all three Bhishana phases.
- Scene-loading and story-card flow.
- Asset matrix separating reusable pitch art from assets that must be made.
- Audio list for music, ambience, attacks, damage, UI, and boss phase changes.
- Accessibility requirements for remapping, captions, colour dependence, motion, and difficulty.
- A 48 to 72 hour schedule with clear ownership and a cut line.
- Acceptance criteria for the hackathon demo.
- Risks that could stop the demo from being completed.

End the plan with a proposed file structure and independently buildable implementation tickets. Do not start coding until the user approves the plan.
