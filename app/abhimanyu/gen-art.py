#!/usr/bin/env python3
"""Draw the nine Story D scene illustrations straight into site/public/story-d/.

ponytail: one file, no framework, no manifest. Existing .png files are skipped,
so delete one panel and re-run to redraw only that panel. Text is never baked
into the art -- the page overlays it as HTML, because image models garble
lettering. Scene copy itself lives in page.tsx; this file owns only the art.

    OPENAI_API_KEY=... python3 site/app/abhimanyu/gen-art.py
"""
import base64, json, os, urllib.request
from concurrent.futures import ThreadPoolExecutor

KEY = os.environ["OPENAI_API_KEY"]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                  "..", "..", "public", "story-d")

# --- style ------------------------------------------------------------------
# Deliberately describes technique only. No artist, studio or title is named.
STYLE = (
    "Black-ink webtoon illustration. Monochrome only: black ink on off-white paper, no colour at all. "
    "Confident tapered brush outlines of varying weight, large flat black shapes, fine cross-hatching and "
    "halftone screentone dots for the mid-greys, generous clean white space. Bold radiating speed lines and "
    "impact bursts carry the motion. High contrast, graphic and poster-like. "
    "STRICTLY NOT a pencil sketch, NOT charcoal, NOT soft graphite shading, NOT a grey wash, "
    "NOT painted, NOT photorealistic, NOT colourised. "
    "Setting is ancient India of the Mahabharata war, NOT medieval Europe: warriors wear dhoti and "
    "angavastram cloth, bare shoulders, gold armbands and neck torcs, long dark hair tied in topknots; "
    "spoked wooden war chariots drawn by horses, recurve bows, tall cloth banners on poles, conch horns. "
    "No European plate armour, no visored helmets, no chainmail, no stirrups. "
    "Keep the composition open and uncluttered along the top edge of the frame. "
    "Draw only the scene itself: no panel borders, no caption boxes, no blank rectangles or empty "
    "banner shapes anywhere in the image. "
    "No text, no lettering, no speech bubbles, no captions, no numerals, no watermark, no signature."
)

ABHI = ("ABHIMANYU: a sixteen-year-old warrior, lean and athletic, shoulder-length black hair tied back "
        "from his face, plain cream dhoti with a dark sash, a single gold armband, a recurve bow, "
        "no crown, an open and determined young face")
SUBH = ("SUBHADRA: a young woman with a long braid, a simple draped sari, visibly pregnant, "
        "gentle tired face")
ARJ = ("ARJUNA: a master archer in his fifties, hair in a high topknot, plain white dhoti, a great bow, "
       "a calm unreadable face")
LAKSH = ("LAKSHMANA: a princely warrior of sixteen, ornate gold armbands and a jewelled belt, "
         "an elaborately carved chariot, a proud confident face")
JAYA = ("JAYADRATHA: a broad heavy-shouldered king in his thirties, thick gold ornaments, a short beard, "
        "a hard closed expression")

W, T, S = "1536x1024", "1024x1536", "1024x1024"   # wide / tall / square

# (filename, size, prompt)
PANELS = [
 ("01-womb", T,
  f"A quiet lamplit palace chamber at night. {SUBH} lies half asleep on a low couch, one hand on her belly. "
  f"Beside her {ARJ} sits leaning forward, drawing a spiral in spilled grain on the floor with one finger to "
  "explain something. She has already closed her eyes. The spiral is complete on the way inward but its "
  "outward path trails away into nothing. Warm intimate framing, deep flat blacks, a single lamp as the only "
  "light source."),

 ("02-the-ask", W,
  f"Morning inside a war camp of tall cloth tents. A tired eldest king in plain royal cloth stands with his "
  f"hands open in appeal before {ABHI}, who is already reaching for his bow. Two enormous older warriors and "
  "a group of grim commanders stand behind them. Far away on the horizon, dust from a battle drawn off to one "
  "flank. Tense council composition, strong horizontals, heavy screentone sky."),

 ("03-the-ride", W,
  f"A war chariot at full gallop across an open battlefield seen from a low tracking angle. {ABHI} braces in "
  "the chariot box with his bow, a charioteer whipping four horses, and behind him a wedge of allied chariots "
  "racing to keep up. Huge dust plume, ground blurring past, extreme radiating speed lines. Ahead in the "
  "distance an enormous army has been drawn up into a vast spiral formation of men and chariots that fills "
  "the horizon like a coiled wheel."),

 ("04-first-gates", T,
  f"{ABHI} at full draw in the middle of a collapsing wall of anonymous soldiers and chariots, loosing arrows "
  "faster than the eye can follow, shields and spears bursting apart around him. Faceless helmeted ranks give "
  "way in a curved line, showing the mouth of a curving corridor of troops opening ahead. Explosive kinetic "
  "energy, arrow trails crossing the whole frame, impact bursts."),

 ("05-lakshmana", T,
  f"A chariot duel between two young warriors of exactly the same age. {LAKSH} on the left looses an arrow; "
  f"{ABHI} on the right leans out of his chariot box and answers, their two arrows crossing in the centre of "
  "the frame. Splintered chariot rails, banners torn, horses rearing. Mirror-image composition, both faces "
  "young, the moment balanced and equal. Enormous impact burst at the crossing point."),

 ("06-the-gate-shuts", W,
  f"Looking backward down a long corridor of enemy soldiers that is closing like a door. {JAYA} stands braced "
  "and alone in the narrowing gap with his arms spread and a bow across his body, holding the line. Far behind "
  "him, on the other side and unable to get through, the small distant silhouettes of two huge warriors and "
  "their chariots straining forward. In the immediate foreground, out of focus, the back of a young warrior's "
  "head as he realises. Crushing perspective, black walls of men on both sides."),

 ("07-surrounded", S,
  f"Overhead bird's-eye shot looking straight down. {ABHI} stands alone at the centre of a wide trampled "
  "circle of ground, bow raised, ringed at a distance by six great chariots all turned inward toward him, "
  "their banner poles casting long spoke-like shadows that meet at his feet so the whole image reads as a "
  "wheel with the boy at the hub. Vast empty ground, tiny central figure, overwhelming geometric symmetry."),

 ("08-the-wheel", T,
  f"{ABHI}, his bow snapped and gone, standing in the wreck of his own overturned chariot and lifting its "
  "heavy spoked wooden wheel over his head with both arms as a shield and a weapon. Arrows are embedded in "
  "the wheel's rim. His stance is wide and unbroken, his face lifted and utterly calm. Low hero angle "
  "against a white sky, dust and splinters suspended in the air, radiating lines from the wheel. "
  "No wound and no blood is shown."),

 ("09-dusk", W,
  "Dusk on an emptied battlefield. A single overturned chariot wheel lies half buried in churned ground, "
  "one broken banner leaning beside it. No people anywhere in the frame. A vast low sun sits on the horizon "
  "and long shadows stretch toward the viewer. Silent, still, mostly white space with fine ink detail and a "
  "single heavy black mass of the wheel."),
]


def draw(p):
    name, size, prompt = p
    path = os.path.join(OUT, name + ".png")
    if os.path.exists(path):
        return name + " cached"
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=json.dumps({"model": "gpt-image-1", "prompt": STYLE + " " + prompt,
                         "size": size, "quality": "medium", "n": 1}).encode(),
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=900) as r:
            d = json.load(r)
        open(path, "wb").write(base64.b64decode(d["data"][0]["b64_json"]))
        return name + " OK"
    except Exception as e:
        return name + " FAIL " + str(e)[:200]


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    with ThreadPoolExecutor(max_workers=5) as ex:
        for line in ex.map(draw, PANELS):
            print(line, flush=True)
