# Mahabharata-era weapons for later chapters

**Date:** 2026-09-02  
**Status:** research complete and recommendations approved on 2026-09-02. Chapter 1 remains out of scope except for naming its existing brute weapon as a mortal iron gada.  
**Question:** which Mahabharata-era weapons can become unlockable player weapons after Chapter 1, in a progression loosely inspired by *Black Myth: Wukong* relic unlocks, without letting Vrishaketu loot or own iconic named arms?

Current locked Chapter 1 kit: bow + short blade. The Chapter 1 brute's existing generic heavy weapon is now named a mortal iron `gada`. This naming decision does not add a new attack, animation, or player weapon to Chapter 1.

Three layers are kept distinct throughout:

| Layer | What it is | How to use it |
| --- | --- | --- |
| **A. Text** | What the Mahabharata (Ganguli English; Gouri Lad’s Critical-Edition verse citations) actually says | Binding for names, bans, and “this existed as a mortal arm” |
| **B. Later iconography / folk** | Puranic lists, temple art, TV, *Jaiminiya Ashvamedha*, Kashidasi, Wikipedia-level Vrishaketu lore | Flavour and later-tradition story beats only, labelled as such |
| **C. Game inference** | Combat identity, unlock order, PlayCanvas cost | Design advice, never presented as scripture |

Primary text used here is Kisari Mohan Ganguli’s complete public-domain translation ([sacred-texts Mahabharata](https://sacred-texts.com/hin/maha/index.htm), 1883–1896). Verse numbers in the Gouri Lad notes follow the BORI Critical Edition (Lad, *Archaeology and the Mahabharata*, Deccan College, 1978). Dhanurveda classifications come from Vasiṣṭha’s *Dhanurveda Saṃhitā* 1.4, *Nītiprakāśikā* 2, and Agni Purāṇa’s Dhanurveda chapters (secondary condensations: [Wisdom Library *Nītiprakāśikā*](https://www.wisdomlib.org/hinduism/essay/nitiprakasika-critical-analysis/d/doc1147778.html); [Kamakoti Agni Purāṇa ch. 19](https://www.kamakoti.org/kamakoti/agni/bookview.php?chapnum=19)).

---

## 1. How Indian texts classify weapons

The epic does **not** treat “weapon” as one bag of loot. Two distinctions matter for the game.

### 1.1 Śastra vs astra

| Term | Meaning in the tradition | Game consequence |
| --- | --- | --- |
| **Śastra** | A held, physical arm: bow, sword, mace, spear | Ordinary equipment. Mortal copies are fair. |
| **Astra** | A released technique, usually an arrow or dart charged by a mantra, often withdrawn (`saṃhāra`) as well as loosed | Not a pickup. Teach it. Gate it. |
| **Pratyastra** | A counter-astra | Later, if at all. |
| **Paramāstra / mantramukta** | Highest class; once loosed, often cannot be recalled | Never player loot. Story-forbidden or unwinnable spectacle. |

*Nītiprakāśikā* 2.11–14 (Vaiśampāyana) splits Dhanurveda into four *padas*: *mukta* (released), *amukta* (held), *muktāmukta* (both), *mantramukta* (loosed by mantra and not withdrawn). Vasiṣṭha *Dhanurveda* 1.4 uses a slightly different four: *mukta*, *amukta*, *muktāmukta*, *yantramukta* (mechanically discharged — bow, catapult). Agni Purāṇa adds unarmed *bāhuyuddha* (wrestling), which the epic already uses for Bhīma.

**Inference:** Vrishaketu’s bow is *yantramukta*. A gada in the hands is *amukta* (and can be hurled). A spear that can be held or thrown is *muktāmukta*. Astras sit in a different column from all of these.

### 1.2 The bow is supreme; everything else is backup

Gouri Lad (Phase I weapons): every great knight of the epic — Bhīṣma, Droṇa, Karṇa, Arjuna — is first a bowman. The chariot-archer rules the field. Sword, mace, and spear come out when the car is wrecked, the bow is cut, or a duel of strength is declared. E. W. Hopkins (JAOS 1889) makes the same point: club-duels are set pieces; the sword is “adventitious”; no hero *enters* the day with the sword as first weapon, whereas some do so with the club.

**Inference:** keep the bow as Vrishaketu’s identity weapon. New families are sidegrades for specific encounters, not a replacement kit.

---

## 2. Weapon families: names, text, and corrections

English UI can stay plain (`bow`, `blade`, `mace`, `spear`). Sanskrit belongs in flavour text and art direction. Do not use later Rajput or temple names as if they were epic-period.

| Family | Correct terms | What the text supports | Common inaccuracy | Player safety |
| --- | --- | --- | --- | --- |
| Bow + arrow | *dhanuṣ / dhanus*, *bāṇa / iṣu / śara* | The kṣatriya’s primary arm. Quivers *tūṇa / tūṇīra*. Arrow types include *nārāca*, *kṣurapra*, *ardhacandra*, *bhalla*. | Calling every special arrow an astra | **Safe mortal family.** Named bows are not. |
| Short blade / sword | *asi* (older), *khaḍga*, also *nistriṃśa*, *karavāla*, *sāyaka* | Every warrior carries one as a waist-weapon (`baddhanistriṃśa`). Used on foot after the chariot dies. Abhimanyu’s last stand is the famous sword-and-shield passage (Drona Parva). | *Khaṇḍā* is a later north-Indian broadsword, not an epic word. *Khaḍga* also means rhinoceros; hilts of rhino/buffalo horn are in Kauṭilya, not a licence to give Vrishaketu a giant temple sword. | **Safe as a short sidearm.** Do not grow it into a greatsword class. |
| Mace | *gadā* | Iron or *śaikya* (tempered) mace, often eight-sided, gold-wrapped, sometimes belled, used in circles (*maṇḍala*) and also hurled. Bhīma’s mace in Shalya Parva 11 is “made wholly of iron… possessed of eight sides… equipped with a sling” ([Ganguli 9.11](https://sacred-texts.com/hin/m09/m09011.htm)). Bhīma, Duryodhana, Śalya, Balarāma (teacher of both Bhīma and Duryodhana). | Equating *gadā* with *musala*, or with Kṛṣṇa’s *Kaumodakī* | **Safe as a mortal iron gadā.** Never the named divine mace. |
| Club / pestle | *musala*, also *mudgara* | Distinct from *gadā*: more wooden, pestle-shaped. *Mausala Parva* is named for the iron bolt that destroys the Yādavas. | Using *musala* as a cool “club” synonym | **Enemy flavour only.** Too close to the Yādava doom and to Kṛṣṇa’s death-arrow (the leftover bolt). |
| Heavy spear | *śakti*, often *rathaśakti* | Chariot-warrior’s heavy iron-headed spear, gold shaft, bells and banners. Hurled to kill. Karṇa’s **Vāsavī Śakti** is a unique, one-use divine dart from Indra, used on Ghaṭotkaca (Drona Parva) — not a generic spear. Yudhiṣṭhira later kills Śalya with a worshipped *śakti* (Shalya Parva). | Calling every spear “Shakti” in the Karṇa sense | **Safe generic *śakti*.** The named Vāsavī Śakti is banned. |
| Light javelin | *tomara* | Lighter than *śakti*; 7–14 can be thrown in a volley. Elephant-corps speciality; also cavalry/infantry. Wounds are often non-fatal (Lad, piercing weapons). | Treating it as a unique named relic | **Safe as an ammo/throw sidegrade of spear**, not a fifth family. |
| Cavalry lance | *prāsa*, also *ṛṣṭi*, *kunta* | Light spear, wooden shaft, used in masses “like locusts” (Shalya Parva). | Inventing a “lance class” | Enemy cavalry only. |
| Axe | *paraśu*, *paraśvadha*, *kuthāra* | Present, but often wood-cutting as much as war. *Paraśurāma* owns the iconic axe. | Giving the player “Parashu” as a class | **Do not.** Mortal hatchet as a rakṣasa/woodcutter prop is fine. |
| Discus | *cakra* | Ordinary metal wheels exist (city defences, battlefield litter, Ghaṭotkaca’s 1,000-spoke cakra which arrows cut down). **Sudarśana** is unique: returns to Kṛṣṇa’s hand, given at Khāṇḍava ([Ganguli 1.227](https://sacred-texts.com/hin/m01/m01228.htm)). | Any returning discus reads as Viṣṇu | **No player cakra.** Ordinary thrown discs as rakṣasa VFX only. |
| Noose | *pāśa* | Varuna’s attribute. Lad: “very insignificant… never used in actual [epic] warfare,” though infantry stockpiles include ropes to pull riders down. | Making it a combat class because later art shows Varuṇa with a noose | **Tool, not a family.** Nets for the tiger-horse are mundane ropes, not Varuṇa’s *pāśa*. |
| Spike / trident | *śūla*, *triśūla* | *Śūla* is a hunting spike, mostly rakṣasa/Yakṣa/Śiva-gaṇa. *Triśūla* is rare in the epic and not yet “Śiva’s only weapon” (Lad). Later temple art makes the trident untouchable. | A player trident | **No.** Rakṣasa *śūla* as enemy prop is fine. |
| Plough | *hala / lāṅgala* | Balarāma’s attribute (*Halāyudha*). Alāyudha the rakṣasa also carries one. | Cute “farm weapon” unlock | **No.** Living Vaiṣṇava identity. |

**Gadā vs musala, corrected:** the Chapter 1 brute should not be described as carrying a *musala*. If the heavy overhead weapon is named, the accurate epic word is **gadā**.

**Short blade, corrected:** Chapter 1’s close weapon is a short *asi / khaḍga*, a sidearm. That matches Hopkins and Lad: the sword is what you draw when the bow is unavailable. Keep it short. A long *khaḍga* later is an upgrade inside the same family, not a new class.

**Śakti, corrected:** in English HUD, say **spear**. In Sanskrit flavour, *śakti* is correct for a heavy war-spear. Never label the player’s spear *Vāsavī*, *Indraśakti*, or “Karna’s dart.”

---

## 3. Named and iconic arms — never loot, never own

These are not “stronger versions of a family.” They are persons’ weapons, gods’ attributes, or world-ending techniques.

| Name | What the text says | Why Vrishaketu cannot have it |
| --- | --- | --- |
| **Gāṇḍīva** | Varuna, at Agni’s request, gives Arjuna the bow, two inexhaustible quivers, and the ape-bannered car at Khāṇḍava. “Chief of all weapons… equal to a hundred thousand bows.” ([Ganguli 1.227](https://sacred-texts.com/hin/m01/m01228.htm); Virata Parva 43 recites its owners: Śiva → Prajāpati → Śakra → Soma → Varuna → Arjuna.) After the war it is returned, not inherited by Karṇa’s line. | Arjuna’s identity. Looting it would be playing Arjuna. |
| **Vijaya** | Karṇa, in Karna Parva 31, claims a bow *Vijaya* made by Viśvakarman for Indra, given to Paraśurāma, then to him, “superior to Gāṇḍīva” ([Ganguli 8.31](https://sacred-texts.com/hin/m08/m08031.htm)). Udyoga Parva also gives a celestial *Vijaya* to **Rukmi**. *Vijaya* is also one of Arjuna’s ten names. | Karṇa-bhakti object, and the name is already Arjuna’s epithet. Even the textual claim is late-in-parva and contested. |
| **Sudarśana cakra** | Agni/Varuna give Kṛṣṇa a fiery discus that slays and **returns to his hand** ([Ganguli 1.227](https://sacred-texts.com/hin/m01/m01228.htm)). | Viṣṇu’s attribute. A returning discus in a Hindu-audience game *is* Sudarśana. |
| **Kaumodakī** | “The lord Varuna… gave unto Krishna a mace, of name *Kaumodaki*” in the same Khāṇḍava gift-scene ([Ganguli 1.227](https://sacred-texts.com/hin/m01/m01228.htm)). | Viṣṇu/Kṛṣṇa’s mace. A player gadā must be an unnamed iron mace. |
| **Śārṅga** | Kṛṣṇa’s celestial bow, named with Gāṇḍīva and Vijaya as the three heavenly bows (Udyoga Parva, via the Rukmi passage). | Same ban. |
| **Pināka** | Śiva’s bow. | Deity attribute. |
| **Nandaka** | Viṣṇu’s sword in later lists (Bhāsa, Purāṇas). Not a mortal kṣatriya sidearm. | Later iconography; still a deity sword. |
| **Vāsavī Śakti** | Indra’s one-use dart, traded for Karṇa’s armour and earrings; spent on Ghaṭotkaca so it cannot be used on Arjuna. | Karṇa’s tragedy. Spending or inheriting it rewrites the war. |
| **Brahmāstra / Brahmaśiras** | Mantra-loosed, world-scouring. Arjuna and Aśvatthāman both hold Brahmaśiras; the Sauptika aftermath is a curse, not a power fantasy. | Teaching the *name* as a button is a cultural grenade. |
| **Pāśupatāstra** | Śiva to Arjuna (Kairāta / Vana Parva 40): “this weapon should not be hurled without adequate cause; for if hurled at any foe of little might it may destroy the whole universe… it may be hurled by the mind, by the eye, by words, and by the bow.” ([Ganguli 3.40](https://sacred-texts.com/hin/m03/m03040.htm)). Arjuna does not fire it in the war. | Śiva’s favourite weapon. A player “Pashupata shot” would be culturally inappropriate. |
| **Nārāyaṇāstra** | Aśvatthāman’s; the counter is surrender, not DPS. | Same class of ban. |
| **Paraśurāma’s paraśu** | The axe *is* the avatar. | Do not put an avatar’s attribute in a fail-state. |
| **Balarāma’s hala** | Living Vaiṣṇava identity. | Same. |
| **Karṇa’s kavaca-kuṇḍala** | Cut away before the war. Vrishaketu already has an ear-ring *replica* as an emotional object. | Replica as memory: yes. Recovering the original armour: no. |

**Folk layer, labelled:** later retellings (Kashidasi / popular encyclopedias) say Vrishaketu was the last mortal who knew Brahmāstra, Varuṇāstra, Āgneyāstra, Vāyavyāstra, and that Kṛṣṇa forbade him to teach them. This is **not** in the Critical Edition and should not be stated as Vyāsa. It is usable only as a labelled later-tradition beat: Arjuna teaches a **restricted** set of elemental arrow-techniques, and the *names* Brahmāstra / Pāśupata stay off the skill screen.

---

## 4. Three buckets

### (a) Safe mortal / general weapons

Ordinary *dhanuṣ*, *asi/khaḍga* (short), iron *gadā*, *śakti* / *tomara*, shield (*carman*, often *śatacandra* “hundred-crescents”), nets and ropes as tools, mundane fire arrows (not Āgneyāstra).

These may be enemy drops in the *visual* sense (the brute’s mace looks like a mace) but story-unlocks should be **gifts, training, or field commissions**, not corpse-looting of named heroes.

### (b) Named / iconic arms tied to revered figures

Gāṇḍīva, Vijaya, Sudarśana, Kaumodakī, Śārṅga, Pināka, Nandaka, Vāsavī Śakti, Paraśurāma’s axe, Balarāma’s plough, Karṇa’s original armour. Also Bhīma’s personal eight-sided mace as a *character* weapon: the player may learn *gadā-yuddha* from Bhīma; he must not pick up “Bhīma’s mace.”

### (c) Astras / divine techniques

Āgneya, Vāruṇa, Vāyavya, Aindra, Nāga, and the forbidden set (Brahmā, Brahmaśiras, Pāśupata, Nārāyaṇa). These are **learned**, usually as a special arrow on the existing bow. They are not a fifth melee family.

---

## 5. Wukong, applied (inference)

*Black Myth: Wukong* does not hand the Destined One a pile of unrelated myth-weapons. It does three things:

1. **One identity weapon, several stances.** The staff stays the staff. Smash / Pillar / Thrust (and a late fused stance) are combat identities, not new loot types. Staff *variants* are crafted upgrades of that family, often from chapter-boss materials.
2. **Relics are fragments of the Sage, not the Sage’s named treasure.** Each chapter boss yields one of Wukong’s six-sense relics (Craving Eyes, Fuming Ears, …). They modify the Destined One. They are not Ruyi Jingu Bang-as-loot, and they are not “you are now the Buddha.”
3. **Spirits absorb yaoguai skills**, not the identities of living deities.

Map that onto DWARKA without copying the monkey:

| Wukong | DWARKA analogue | Do not do |
| --- | --- | --- |
| One staff, 3 stances | Bow remains identity. Blade / spear / gadā are **stance-like families** with 2–3 moves each, not twelve arsenals | A smite-style roster of Gāṇḍīva, Sudarśana, Kaumodakī |
| Relics from chapter bosses | Arjuna’s teaching; Bhīma’s gadā lesson; a spared prince’s spear; Chitra’s paper-sun as an emotional relic | Looting Karṇa’s Vijaya off a mural |
| Crafted staff upgrades | Mortal copies: better bow, longer *khaḍga*, heavier gadā, *tomara* throw on the spear | “Mythical” named unique for each mission |
| Spirits | Meghavarṇa’s illusion-sight as a **companion** toggle, already in the story | Absorbing rakṣasa souls / deity transformations |

The Destined One never *is* Wukong. Vrishaketu never *is* Karṇa or Arjuna. Relics are succession, not identity theft.

---

## 6. Recommended player kit: evaluate four families

**Verdict: keep four names on the design wall, ship three, treat gadā as the first expansion family.**

| Family | Role | Recommendation | Animation / PlayCanvas cost |
| --- | --- | --- | --- |
| **Bow** | Identity, range, astras | **Keep and deepen.** Charged shot (already planned for Bhadravati). Elemental astras as arrow modes, not new models. | Already in Chapter 1. Mixamo/UAL bow clips are the known gap. Each astra is VFX + a projectile flag, not a new rig. |
| **Short blade (*asi*)** | Close backup | **Keep as the Chapter 1 two-hit combo.** Optional later lengthening to a full *khaḍga* is a mesh swap + slightly longer arc, not a new state machine. | Cheap. Do not build a branching sword tree. |
| **Spear (*śakti*)** | Mid-range, anti-chariot, anti-shield | **Best third family.** Suvega is already written as spear-and-shield. A held spear covers the gap the bow loses at arm’s length. A *tomara* throw is a second projectile using the existing arrow pipeline. | Medium. Need idle/locomotion with spear, 2–3 thrusts, one throw, one block-with-shaft. Shield can stay on Suvega; player need not get a shield in the first pass. |
| **Gadā** | Heavy, guard-break, anti-brute, anti-rakṣasa slam | **Fourth family, not MVP.** Textually perfect, culturally safe if unnamed. Two-handed, slow, cannot sit on the back next to a strung bow without a holster dance. | High. New two-hand set, different root motion, slam VFX, extra server melee volume. Do not start this in the same chapter that introduces spear + first astra. |

**Rejected as player families:** cakra, triśūla, paraśu, pāśa, musala, hala. They are either deity-coded, doom-coded, or redundant.

**Astras:** later, story-gated **arrow techniques taught by Arjuna**, exactly as the existing planning handoff already implies (Āgneya at Shalva, Varuṇa at the lakes, Vāyavya at Champapuri). Do not drop them as loot. Do not put Brahmāstra on a hotkey. If the later-tradition “last mortal to know them” line is used, credit it as Jaiminiya/folk, and have Kṛṣṇa’s *ban on teaching* appear only as dialogue, never as a player-to-NPC training mode.

---

## 7. Combat identities (inference)

Design each family so a player can read it in one fight.

| Family | Feel | Strength | Weakness | Mercy / story use |
| --- | --- | --- | --- | --- |
| Bow | Measured, Karṇa-line identity | Range, chariot wheels, astras | Punished at arm’s length (already true vs Suvega’s shield) | Lower-the-bow is a bow-family input |
| Short blade | Fast, two hits, emergency | Tight rooms, finishing a staggered foe | No reach, no anti-armour | Spare = sheathe, not a special blade move |
| Spear | Linear, disciplined, princely | Beats shields, pokes chariots, *tomara* for a running target | Weak vs surround; throw spends the held weapon unless it is a light *tomara* kept as ammo | Capture Anuśalva: spear-butt / shaft-bind, not a killing thrust |
| Gadā | Slow, committed, Bhīma-taught | Breaks brute armour, knocks, answers ground-slams | Punishing recovery; bad vs archers | Non-lethal: strike the earth beside the tiger-horse, never its skull |

Do not let all four be out at once in the first later-chapter build. Loadout of **bow + one melee** is enough. The melee slot swaps between blade / spear / gadā.

---

## 8. Encounter map (advisory only)

Existing story beats are not rewritten here. This is a suggested overlay.

| Encounter | Enemy arms (text-faithful) | Player unlock (gift / teaching, not loot) | Notes |
| --- | --- | --- | --- |
| **Chapter 1 raiders** (already building) | Skirmisher: short *asi*. Archer: bow. Brute: mortal iron **gadā**. | None. Kit stays bow + short blade. | Brute telegraph (red ground arc, overhead) already matches gadā *vikṣepa*. |
| **Bhadravati / Suvega** | Suvega: *śakti* + *carman* (spear and shield), as the current spec. Guards: bows, *prāsa* / *tomara*. Hound-handlers: blades. | **Spear family** as a gift after sparing Suvega, or a field commission from Yauvanāśva when the kingdom joins the escort. **Charged bow** as already planned. | Do not call it Vāsavī. A princely *rathaśakti* of Bhadravati is enough flavour. |
| **Shalva / Anuśalva** | Chariot archers; *rathaśakti* on the car; shield infantry. Anuśalva: bow from the car, then melee once unhorsed. | **Āgneyāstra** as Arjuna’s first lesson (“this one is yours”). Fire arrow burns wheels — already in the handoff. | Mercy = lower bow / bind, not a new weapon. Player may use the new spear to cut traces and disable the car without a kill shot. |
| **Cursed tiger-horse** | No warrior arms. Frightened animal. | **Varuṇāstra** as the water arrow. **Nets** as a tool (mundane rope, not Varuṇa’s *pāśa*). | Killing finisher already fails the mission. Gadā is the wrong toy here. |
| **Champapuri / Sudhanva** | Sudhanva: bow, arrow-storm. Royal guards: swords. Cauldron-keepers: clubs as props, not a musala class. | **Vāyavyāstra** (wind arrow) to dash and break arrow-storms, as already planned. | Survival, not a kill. **Do not loot Sudhanva’s bow.** He is a devotee; the player watches Arjuna’s shot. |
| **Vṛkṣa / Lambodarī** | Rakṣasa scouts: *śūla*, stones, crude clubs. Flower-mimics: unarmed. Lambodarī: no sacred weapon; faces only. | No new family. Lower-the-bow is the mechanic. Meghavarṇa’s sight as companion, not a spirit-absorb. | Do not reward this mission with a triśūla. |
| **Bhīṣana finale** | Dusk: living shields (non-targets). Night: size-shift, ground-slams (gadā-like), illusion clones. Dawn: poison bloom. | If gadā has been taught by Bhīma earlier, this is where it *pays off* against slams. Combined astras on the bow remain the canonical finisher (charged shot). | Arjuna lowers his bow; the player’s last shot is still a bow shot. A gadā kill of Bhīṣana would steal the visual rhyme with Chapter 1 / Karṇa’s bow. |

**Bhīma and the gadā (best unlock beat, if the fourth family is approved):** after Bhadravati, Bhīma can teach a **mortal iron gadā** and gift a practice weapon. That is succession, Wukong-style. It is not looting Bhīma’s own eight-sided mace, and it is not Kaumodakī.

---

## 9. Enemy assignments (reusable, small set)

Stay inside Chapter 1’s “one humanoid rig, silhouette changes” rule.

| Role | Arm | Reuse |
| --- | --- | --- |
| Skirmisher | Short *asi* | Chapter 1 already |
| Archer | Bow | Chapter 1 already |
| Brute | Iron *gadā*, overhead | Chapter 1 naming approved; no behavior change |
| Guard / shield | Spear + *carman* | Suvega kit, cheaper infantry version |
| Chariot lieutenant | Bow + one *rathaśakti* throw | Anuśalva’s adds |
| Rakṣasa scout | *Śūla* or stone (not triśūla) | Vṛkṣa; different mesh on the same rig |
| Sudhanva | Unique archer pattern, not a lootable kit | Survive-only |

Do not invent a cakra-thrower enemy. A whirling disc as rakṣasa *māyā* VFX is enough and stays in bucket (c) spectacle.

---

## 10. Upgrades and sidegrades (not an arsenal)

Think in **families × 2 upgrades**, not a wiki of 20 uniques.

| Family | Base | Upgrade 1 | Upgrade 2 / sidegrade |
| --- | --- | --- | --- |
| Bow | Chapter 1 bow | Charged shot (Bhadravati) | Astra modes: Āgneya, Varuṇa, Vāyavya (story-gated) |
| Blade | Short *asi* | Slightly longer *khaḍga* (Champapuri armoury gift, not Sudhanva’s) | None. No combo tree |
| Spear | Bhadravati *śakti* | Shaft-bind / non-lethal butt (Anuśalva) | *Tomara* ammo (light throw, keeps the held spear) |
| Gadā | Bhīma’s lesson, practice iron mace | Heavier head (anti-Bhīṣana slam) | Optional hurl (*prakṣepa*) as a high-commitment special, since the epic gadā is also thrown |

Relic-like objects that are **not weapons:** Chitra’s paper sun, Karṇa’s ear-ring replica, a spared prince’s banner. These can modify HUD / mercy windows / companion sight the way Wukong relics modify the Destined One.

---

## 11. PlayCanvas / animation feasibility and scope risk

Facts from the current Chapter 1 spec: one humanoid skeleton; UAL1 Standard covers idle, locomotion, roll, melee, hit, down; bow aim/release may need Mixamo; server owns a short melee arc and a projectile; no navmesh; cap four enemies; no branching combo tree.

| Addition | Feasibility | Risk |
| --- | --- | --- |
| Name the brute weapon as gadā | Existing mesh and overhead clip remain. | Documentation and prop naming only for Chapter 1 |
| Spear family | New held mesh, 2–3 clips, one throw reused from the arrow projectile with a heavier arc | Medium. First real weapon-swap state (`meleeSlot`) |
| Astra as arrow tint + effect flag | Cheap if the bow state machine already exists | Low technically; high culturally if a forbidden name is used |
| Gadā family | Two-hand clips, different recoveries, slam volume on the server, holster vs bow | High. Do not pair with the first spear chapter |
| Cakra / returning disc | Custom projectile that homes back | High cultural risk for little gameplay gain |
| Dual-wield bow+gadā | Fights the rig | Don’t |

**Scope risks that will actually kill a later chapter**

1. Four full families in one mission (animation + HUD + server hit volumes).
2. Treating astras as extra weapons instead of bow modes.
3. Looting a named epic arm “because the boss dropped it.”
4. A shield-and-spear player kit (Suvega can have the shield; the player’s spear can beat it without copying the whole kit).
5. Mixamo / UAL clip gaps for two-hand mace and spear on the teen base.

---

## 12. Minimum viable later-chapter roadmap

Chapter 1 stays as specified. After it:

1. **Bhadravati:** charged bow + spear unlock (gift). Blade remains the fallback. No astra yet, matching “do not implement astras in Chapter 1.”
2. **Shalva:** Āgneyāstra as the first Arjuna lesson. Mercy input. No new family.
3. **Lakes:** Varuṇāstra + net tool. No new family.
4. **Champapuri:** Vāyavyāstra. Optional blade mesh upgrade from an armoury, never from Sudhanva’s body.
5. **If schedule allows a fourth family:** Bhīma teaches gadā between Bhadravati and Vṛkṣa; it pays off on Bhīṣana’s slams. The killing beat remains the charged bow.

Cut order if a later demo slips: gadā family → *tomara* throw → blade length upgrade → third astra. Never cut bow identity, mercy, or the named-weapon ban.

---

## 13. Approved decisions

The user approved this recommendation set on 2026-09-02.

1. The Chapter 1 brute weapon is a mortal iron **gadā**, not a *musala*, Kaumodakī, or Bhīma's personal mace. Chapter 1 behavior and scope do not change.
2. Player families after Chapter 1 are **bow + short blade + spear**, with **gadā as a later expansion family** rather than a four-family launch.
3. Unlocks come through gifts and teaching: Suvega or Yauvanāśva for the spear, Arjuna for elemental arrow techniques, and Bhīma for gadā training. Named or revered figures are never corpse-loot sources.
4. The approved elemental techniques are Āgneya, Varuṇa, and Vāyavya. Brahmāstra, Pāśupata, Nārāyaṇa, and Vāsavī Śakti stay off the player skill list. Any “last mortal who knew them” line must be labelled as later tradition.
5. The player cannot own Gāṇḍīva, Vijaya, Sudarśana, Kaumodakī, Śārṅga, Pināka, Nandaka, Vāsavī Śakti, Paraśurāma's paraśu, Balarāma's hala, Karṇa's original kavaca-kuṇḍala, or Bhīma's personal mace.
6. Cakra, triśūla, paraśu, pāśa, and musala are not player weapon families. Nets remain a mundane mission tool.
7. The English HUD uses `bow / blade / spear / mace`. Sanskrit terms appear in captions, narration, lore, and art direction.
8. The implementation order and biome map live in `docs/future-chapters-game-handoff.md`.

---

## Sources

**Primary / high-trust text**

- Ganguli, *The Mahabharata of Krishna-Dwaipayana Vyasa*, sacred-texts.com: [Khāṇḍava gifts, 1.227](https://sacred-texts.com/hin/m01/m01228.htm) (Gāṇḍīva, Sudarśana, Kaumodakī); [Kairāta, 3.40](https://sacred-texts.com/hin/m03/m03040.htm) (Pāśupata); [Karna Parva 31](https://sacred-texts.com/hin/m08/m08031.htm) (Vijaya claim); [Shalya Parva 11](https://sacred-texts.com/hin/m09/m09011.htm) and [57–58](https://sacred-texts.com/hin/m09/m09057.htm) (gadā duel, eight-sided iron mace).
- Vasiṣṭha *Dhanurveda Saṃhitā* 1.4 (fourfold *āyudha*).
- *Nītiprakāśikā* 2 (mukta / amukta / muktāmukta / mantramukta; śastra / astra). Summary and verse map: [Wisdom Library](https://www.wisdomlib.org/hinduism/essay/nitiprakasika-critical-analysis/d/doc1147778.html).
- Agni Purāṇa Dhanurveda, condensed: [Kamakoti ch. 19](https://www.kamakoti.org/kamakoti/agni/bookview.php?chapnum=19).

**Scholarship grounded in the epic’s own verses**

- Gouri Lad, *Archaeology and the Mahabharata* (Deccan College, 1978): [swords and shields](https://www.wisdomlib.org/hinduism/essay/archaeology-and-the-mahabharata/d/doc1527602.html); [piercing weapons / śakti, tomara, śūla, triśūla](https://www.wisdomlib.org/hinduism/essay/archaeology-and-the-mahabharata/d/doc1527601.html); [axes](https://www.wisdomlib.org/hinduism/essay/archaeology-and-the-mahabharata/d/doc1527603.html); [projectiles / cakra / pāśa](https://www.wisdomlib.org/hinduism/essay/archaeology-and-the-mahabharata/d/doc1527605.html); [gadā vs musala, pre-600 BCE](https://www.wisdomlib.org/hinduism/essay/archaeology-and-the-mahabharata/d/doc1527611.html).
- E. W. Hopkins, “The Social and Military Position of the Ruling Caste in Ancient India,” *JAOS* 13 (1889), weapons section — bow primary, club as set-piece, sword as reserve.

**Later / folk (labelled, not treated as Vyāsa)**

- Vrishaketu as last mortal astra-holder: later encyclopedic tradition, not Critical Edition. Use only with a later-tradition label.
- *Jaiminiya Aśvamedha* episodes already adopted in the Vrishaketu spec (Bhadravati, Anuśalva, tiger-horse, Sudhanva, Bhīṣana).

**Game-design analogue (inference only)**

- *Black Myth: Wukong* relic-per-chapter-boss and staff-stance model: [Gamer Guides relics](https://www.gamerguides.com/black-myth-wukong/guide/equipment/relics/all-relic-locations); [staff stances](https://blackmythwukong.fandom.com/wiki/Staff_Stances).

**Project constraints this file does not change**

- [`docs/chapter-1-game-handoff.md`](../chapter-1-game-handoff.md) — Chapter 1 kit, no astras, brute with a mortal iron gada.
- [`docs/future-chapters-game-handoff.md`](../future-chapters-game-handoff.md) — approved later weapon order, biome map, asset rules, and future-agent prompt.
- [`docs/game-planning-handoff.md`](../game-planning-handoff.md) — complete encounter sequence and cultural background.
- Traycer Vrishaketu spec — cultural bans, Suvega as spear-and-shield, mercy, Sudhanva as survive.
