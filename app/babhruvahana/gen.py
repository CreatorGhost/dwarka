#!/usr/bin/env python3
"""Draw the ten Story C chapter illustrations into site/public/story-c/.

ponytail: one file, no framework. Existing .webp files are skipped, so delete a
panel to redraw only that one. No text is ever baked into the art - all copy
lives in page.tsx, because image models garble lettering.

The API returns ~3.5 MB PNGs; ten of those on one page is 34 MB, so each panel is
converted to webp (q88, visually identical on line art, ~6x smaller) and the PNG
is dropped. Needs `cwebp` on PATH (brew install webp).
"""
import base64, json, os, subprocess, urllib.request
from concurrent.futures import ThreadPoolExecutor

KEY = os.environ["OPENAI_API_KEY"]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "story-c")
SIZE = "1536x1024"  # one aspect for every panel, so the page needs no per-card layout

# --- style ------------------------------------------------------------------
# Original direction. Deliberately describes ink behaviour rather than naming
# any artist, studio or published title to imitate.
STYLE = (
    "BLACK INK WEBTOON PANEL. Pure monochrome: black ink on white paper, no colour of any kind. "
    "Confident uniform brush outlines of even weight, flat cel shading, hard-edged solid black shadow "
    "shapes, halftone screentone dots for mid greys, cross-hatching only for depth, bold speed lines "
    "and radiating impact lines. Generous clean white space. High contrast, graphic and readable at a "
    "glance. STRICTLY NOT a pencil sketch, NOT charcoal, NOT soft graphite, NOT watercolour, NOT an oil "
    "painting, NOT photorealistic, NOT 3D render, NOT colour. "
    "Setting is ancient India of the Mahabharata, NOT medieval Europe: dhoti and angavastram cloth, bare "
    "shoulders, gold armbands and torcs, long dark hair in topknots and braids, ornate wooden chariots "
    "with spoked wheels, recurve bows, stepped stone temple architecture, oil lamps. No European plate "
    "armour, no visored helmets, no chainmail, no firearms. "
    "Naga beings are serpent-people: human from the waist up, long scaled serpent coil below, hooded "
    "necks, scale ridges along the brow. "
    "Leave uncluttered space along the top edge of the frame. "
    "No text, no lettering, no numbers, no speech bubbles, no captions, no watermark, no signature."
)

BABHRU = ("BABHRUVAHANA: a prince of about nineteen, lean and upright, short dark hair bound with a plain "
          "cord, one gold armband, a simply patterned dhoti, a recurve bow, an open honest face")
QUEEN = ("CHITRANGADA: a warrior queen in her forties, hair in one tight braid, plain undyed cloth, a hard "
         "grieving face, no ornament")
ULUPI = ("ULUPI: a naga woman, human from the waist up, a long thick serpent coil instead of legs, small "
         "scale ridges along her brow, ancient calm eyes, a single round gem on a cord at her throat")
FALLEN = ("THE FALLEN STRANGER: a tall master archer in a plain white dhoti, hair in a high topknot, lying "
          "still and fully covered by a cloth with his great bow laid beside him, no wound and no blood "
          "anywhere, treated with dignity")
ELDER = ("THE NAGA ELDER: a colossal ancient serpent-being, broad hooded head, scarred overlapping scales, "
         "cold slitted eyes, coils thicker than a man, heavy stone jewellery")
MONGOOSE = ("THE MONGOOSE COMPANY: small fierce mongoose-headed soldiers the height of a child, striped "
            "fur, short spears and knotted cords, quick alert postures")

# slug, prompt
PANELS = [
 ("01-the-duel",
  f"Aftermath of a duel in a palace forecourt at midday. {BABHRU} stands frozen with his bow already "
  f"lowered at his side, staring forward in dawning horror. In front of him {FALLEN} lies covered on the "
  f"stone. Beyond, a stopped war chariot with a tall banner bearing a monkey emblem, and a white "
  "sacrificial horse standing loose. Court onlookers recoil at the edges. Absolute stillness, long hard "
  "shadows, no violence in frame."),
 ("02-the-fast",
  f"Interior courtyard of a small hill palace. {QUEEN} sits cross-legged and motionless on bare stone "
  f"before a dead bare pomegranate tree, refusing food set beside her. {BABHRU} kneels a few paces away "
  f"with his head bowed. {ULUPI} rises out of a stone water channel behind them, one hand lifted, the gem "
  "at her throat catching light in a small white starburst. Lamps guttering, tense hush."),
 ("03-the-road",
  f"Wide travelling shot. {BABHRU} leads a column down a steep switchback trail out of forested hills "
  f"toward a black river gorge far below. {MONGOOSE} scramble along the rocks on both sides of him. "
  "Heavy mist in the valley, huge scale, tiny determined figures, strong diagonal composition, motion in "
  "every step."),
 ("04-the-river-gate",
  f"Night combat at a river mouth where a carved stone arch sinks half-submerged into black water. Four "
  f"naga sentries with tridents burst up out of the river in spraying arcs at {BABHRU}, who twists aside "
  f"mid-draw and looses an arrow at point blank range. {MONGOOSE} leap onto a sentry's coils with cords. "
  "Explosive water, sharp impact lines, high energy."),
 ("05-the-first-coil",
  f"The first level of the underworld: a vast cavern of luminous coiled stone stairways spiralling down "
  f"into darkness, lit by hanging lamps. {BABHRU} and {MONGOOSE} stand on a narrow ledge while a solemn "
  "naga envoy on the far side turns his back on them and closes an enormous scaled door. Dozens of naga "
  "guards line the walls above, watching. Overwhelming architecture, oppressive downward perspective."),
 ("06-the-council-hall",
  f"Boss duel inside an immense pillared underworld council hall, ringed by tiers of watching naga elders. "
  f"A huge armoured naga champion, eldest son of the elder, swings a great mace and rears his coils high "
  f"over {BABHRU}, who slides beneath the strike, bow bent, arrow aimed upward. Shattered pillar fragments "
  "in the air, radiating impact burst, extreme low camera angle."),
 ("07-the-vault",
  f"A domed vault deep underground. {BABHRU} lifts a small round gem from a stone serpent-coil pedestal, "
  "its light throwing a hard white starburst across his face and up the carved walls. The chamber's "
  "guardian serpent lies collapsed and unconscious in the background coils. Awe and relief, quiet after "
  "battle, fine detailed linework."),
 ("08-the-theft",
  f"Disaster. {BABHRU} spins toward a shaft of daylight far above as three naga figures flee upward along "
  "a rising stair, one of them carrying a covered bundle wrapped in cloth away from him. His outstretched "
  "hand closes on nothing. Steep vertical composition, harsh streaking light, panic lines, the gem "
  "forgotten in his other fist."),
 ("09-the-elder",
  f"Final battle in the palace courtyard at dusk, the dead pomegranate tree splintered. {ELDER} in full "
  f"serpent form has coiled around the entire courtyard wall, hood flared enormous, jaws open. {BABHRU} "
  f"stands small at the centre at a full charged draw, feet braced, utterly calm. {MONGOOSE} harry the "
  "coils below. Overwhelming scale contrast, circular composition, dense screentone sky."),
 ("10-the-tree",
  f"Dawn, after everything. {BABHRU} kneels with his forehead to the ground before a tall archer who has "
  f"just sat up and is reaching to raise the young man by the shoulders, unhurt and whole. {QUEEN} covers "
  f"her face. {ULUPI} watches from the water channel. Behind them the pomegranate tree has burst into full "
  "blossom, petals drifting across the whole frame. Warm quiet resolution, mostly white space."),
]


def draw(p):
    name, prompt = p
    png, webp = os.path.join(OUT, name + ".png"), os.path.join(OUT, name + ".webp")
    if os.path.exists(webp):
        return name + " cached"
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=json.dumps({"model": "gpt-image-1", "prompt": STYLE + " " + prompt,
                         "size": SIZE, "quality": "medium", "n": 1}).encode(),
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=900) as r:
            d = json.load(r)
        with open(png, "wb") as f:
            f.write(base64.b64decode(d["data"][0]["b64_json"]))
        subprocess.run(["cwebp", "-quiet", "-q", "88", "-m", "6", png, "-o", webp], check=True)
        os.remove(png)
        return name + " OK"
    except Exception as e:
        return name + " FAIL " + str(e)[:200]


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    with ThreadPoolExecutor(max_workers=5) as ex:
        for line in ex.map(draw, PANELS):
            print(line, flush=True)
