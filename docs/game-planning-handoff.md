# DWARKA game planning handoff

Start here when planning the game. This document records the current story direction, the playable sequence, the material that already exists, and the choices that remain open.

## Project status

DWARKA is a proposed browser game set after the Kurukshetra war. The current build is a public story-review website. It is not yet a playable game.

- Public review site: <https://dwarka-story-review.adityapratap2307.chatgpt.site>
- Recommended story: Story A, Vrishaketu
- Story status: recommended, not formally locked by the user
- Game status: no gameplay runtime has been implemented
- Hackathon target: a clear browser MVP that can be completed in 48 to 72 hours

The planning agent must not rewrite the story while producing the technical plan. Any story change needs a separate user decision.

## Source-of-truth order

When two files disagree, use this order:

1. `app/vrishaketu/page.tsx` for the latest scene sequence, player objectives, enemies, and story consequences.
2. The Traycer Vrishaketu specification for research notes, adaptation rules, cultural constraints, and source references.
3. This handoff for scope, file locations, and the planning brief.
4. `app/page.tsx` and the three alternative routes for story comparison.

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

## Combat and progression already implied by the story

The plan should preserve these mechanics unless the user approves a story change:

- Bow combat at range and a short blade at close range.
- Charged shot introduced in Bhadravati and reused for the final shot.
- Agneyastra for fire interactions and chariot wheels.
- Varunastra for extinguishing fire, changing footing, and purging poison.
- Vayavastra for movement and dispersing illusion clones.
- Mercy as an action, not only a dialogue choice.
- Non-lethal boss logic for the tiger-horse.
- A timed survival objective for Sudhanva.
- A lower-the-weapon input that resolves the Karna illusion.
- Bhishana's final fight changes across dusk, night, and dawn.

## Recommended hackathon MVP

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

## Open decisions for the user

The planning agent should expose the effect of each choice instead of silently deciding it.

1. Is Vrishaketu formally locked, or must the plan remain usable for Emberborn?
2. Is the Karna prologue playable, or should it use illustrated stills?
3. Does Krishna remain voice-only, or disappear from the demo entirely?
4. Is the demo text English, Hindi, or Hinglish?
5. Is the game top-down, side-scrolling, or another camera format?
6. Is keyboard and mouse enough for the hackathon, or is controller support required?

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

## Planning assignment for the next agent

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
