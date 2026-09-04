---
title: "DWARKA three-chapter structure (whole story, longer chapters)"
kind: spec
---

# Three-chapter structure

Owner decision 2026-09-03: the entire Vrishaketu story is compressed into **three chapters**, each substantially longer than the old Chapter 1. Built in Unity (URP, WebGL, desktop). Cultural rules from `site/docs/game-planning-handoff.md` still bind: no playable or fightable deity, no health bar on a revered figure, no famous canonical kill by the player, never shoot Karna's likeness, restrained dialogue.

## Mapping the old nine parts onto three chapters

| Chapter | Title | Absorbs | Player arc | Target length |
| --- | --- | --- | --- | --- |
| 1 | The Boy with the Paper Sun | Prologue (Karna's wheel, as playable cold open or cards), old Chapter 1 raid | Grief and the oath: survive the raid, fail to save Chitra, swear to follow the horse | 15–20 min |
| 2 | The Road of the Horse | Bhadravati (steal the horse, Suvega), Shalva (chariot chase, Anushalva), cursed lakes (tiger-horse), Champapuri (Sudhanva survival) | Restraint: four escalating trials where mercy, not killing, wins | 25–35 min |
| 3 | The Face of His Father | Vriksha (Lambodari, the Karna illusion), Bhishana finale (dusk/night/dawn), Manipur epilogue | Choice: reject inherited vengeance, lower the bow, win his own fight | 20–30 min |

## Per-chapter beat ladders

### Chapter 1 — The Boy with the Paper Sun

1. Cold open: Karna's last stand, scripted, controls stop when he sets down the bow (or three story cards if time-cut).
2. Arrival lane: walk the quarter, festival night, meet Chitra.
3. Courtyard breach: raiders kick in a door, family inside, fight in the doorway.
4. Alley ambush: two waves while escorting the family to a shrine.
5. Market terrace: rooftop archers, skirmishers below, use height.
6. Burning lane: a raider drags a child toward a cart; chase and stop him; awnings collapse.
7. Gate: raider captain (invented lieutenant of Bhishana) plus escorts.
8. Doorway: Chitra dies, dawn, the horse is released, the oath.

### Chapter 2 — The Road of the Horse

1. Bhadravati stables: stealth-ish approach, cut the gate chain, rooftop archers, hound handlers.
2. Suvega duel: mini-boss; **sparing him** is the win condition; he joins the escort.
3. Shalva ravine chase: mounted scouts and chariots; shoot wheels, not riders; capture Anushalva alive.
4. Cursed lakes: fog, wet footing, nets; the tiger-horse must be guided to the second lake, never killed; a killing blow fails the beat.
5. Champapuri court: three-minute survival against Sudhanva's arrow storm while protecting civilians; Arjuna lands the kill, not the player.

### Chapter 3 — The Face of His Father

1. Vriksha forest: flower mimics, captives inside blooms, false paths and illusions.
2. Lambodari: she wears trusted faces, finally Karna's; the player must **lower the bow** to resolve it; Bhishana reveals Chitra was bait.
3. Bhishana, dusk: captive shields, cannot swing freely.
4. Bhishana, night: shadow clones, dispersed with a wind astra.
5. Bhishana, dawn: poison lanes, safe paths; Arjuna lowers his bow; Vrishaketu wins alone.
6. Manipur epilogue: walk the horse; Babhruvahana stops it; sequel hook.

## Systems by chapter (each chapter introduces exactly one or two)

| Chapter | New systems |
| --- | --- |
| 1 | Bow, short blade, dodge, waves, escort, rescue-from-doorway, mini-boss |
| 2 | Charged shot, spear (gift after sparing Suvega), non-lethal objectives, wheel/limb targeting, timed survival, fog/wet footing |
| 3 | Astras as story-gated bow modes (fire, water, wind), illusion/clone logic, lower-the-weapon input, three-phase boss |

## Three-day reality (deadline 2026-09-06)

Only Chapter 1 can be fully playable. Ship order:

1. **Chapter 1 playable end to end** (the eight beats above, cut per the Unity ticket's cut order).
2. **Chapter 2 and 3 as illustrated story cards** using the existing Story A / manga art, with a "Chapter 2 coming" state, so the whole arc is legible to a judge.
3. If time remains, the Suvega duel as a single playable Chapter 2 slice.

Nothing in Chapters 2 and 3 may be built before Chapter 1 clears its sign-off gate.
