#!/usr/bin/env python3
"""Draw the nine Story B (Emberborn) scene illustrations.
ponytail: one file, no framework. Existing .png files are skipped, so delete a
scene to redraw only that one. All lettering lives in page.tsx, never in the
art -- image models garble text. Scene copy lives in page.tsx; this file only
owns art direction."""
import base64, json, os, urllib.request
from concurrent.futures import ThreadPoolExecutor

KEY = os.environ["OPENAI_API_KEY"]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), "public", "story-b")

# --- style ------------------------------------------------------------------
# Original direction: pure black brush ink, heavy flat blacks, halftone greys.
# Deliberately no artist or franchise names anywhere in the prompt.
STYLE = (
    "Black ink webtoon illustration. Pure black ink on white paper, entirely monochrome, no colour. "
    "Confident tapering brush linework, large flat black shadow masses, halftone dot screentone for the "
    "mid greys, and wide areas of clean untouched white. Graphic, high contrast, cinematic staging. "
    "STRICTLY NOT pencil, NOT charcoal, NOT soft graphite, NOT painterly, NOT watercolour, "
    "NOT photorealistic, NOT a 3D render. "
    "The setting is ancient India in the age of the Mahabharata, NOT medieval Europe: forest-dwelling "
    "Nishada and Naga people wear undyed cotton dhotis and shoulder wraps, go barefoot, and carry cane "
    "bows, fishing spears and reed baskets; their ornaments are bone, river shell and braided grass. "
    "Kings and warriors ride open wooden chariots with spoked wheels and carry curved recurve bows. "
    "No European plate armour, no visored helmets, no chainmail, no gunpowder. "
    "Leave the upper left of the frame uncluttered. "
    "Absolutely no text, no lettering, no numbers, no speech bubbles, no captions, no signature, "
    "no watermark."
)

NEEL = ("NEEL the Emberborn: a wiry Nishada youth of eighteen, dark skin, rough shoulder-length hair, "
        "a faint snake-scale birthmark spreading across his left shoulder, plain undyed cloth, a cane bow")
BOY = ("a small Nishada boy of eight, thin, wide frightened eyes, rough cropped hair, a torn cloth wrap")
KADRI = ("KADRI: a thin Nishada girl of fifteen, long braided hair, a burn scar on the back of one hand, "
         "a simple undyed shift")
DAHAN = ("DAHAN the Ember King: a broad charismatic man of thirty, shaved head, ash-grey burn scarring "
         "down one whole arm, a soot-blackened cloak of woven bark, carrying a sealed clay pot")
MAYA = ("MAYA: an aged asura architect, tall and gaunt, long white hair, a builder's measuring rod and "
        "knotted cord, sharp geometric patterns cut into the hem of his robe")

SIZE = "1536x1024"  # one shape for every scene, so the page reads as one set

# (file stem, prompt)
SCENES = [
    ("01-fifteen-days",
     f"A forest burning from horizon to horizon at night. {BOY} runs through collapsing canopy toward the "
     "viewer, hair and cloth streaming, embers everywhere. Behind him a woman carries a smaller child. "
     "Great serpents pour down into a river. Far away on the tree-line, two chariots are only tiny black "
     "silhouettes against the fire, faceless and unidentifiable. Terror and enormous scale."),

    ("02-cinders",
     f"Ten years later. {NEEL} stands on a ridge of black burnt stumps looking down at a poor camp of "
     "lean-to shelters built from charred timber, cooking smoke rising. Behind him, at the far edge of the "
     "dead forest, the clean white towers of a new city gleam on the horizon. Vast, quiet, bitter."),

    ("03-the-binding",
     f"Inside a shelter of blackened beams. {DAHAN} holds a sealed clay ember-pot high in one hand, glowing "
     f"faintly through its cracks, while his followers kneel around him. {KADRI} is held at his side by two "
     f"men, one hand reaching back. {NEEL} shoves through the crowd too late, face breaking. "
     "Firelight from below, hard black shadows, crowded frame."),

    ("04-the-road",
     f"{NEEL} crosses a wide river ford at dawn with a cane bow across his back, water to his knees, "
     f"following deep cart ruts. On the bank behind him {MAYA} points ahead with a measuring rod. "
     "A long road of merchants, pilgrims and ox carts winds away into misty hills. "
     "Wide travelling shot, thin ink, enormous sky, mostly white space."),

    ("05-the-quota",
     f"A night ambush at the edge of a village of round mud houses with thatched roofs. Three RAKSHASA "
     f"raiders drag away sacks of grain: tall gaunt grey-skinned humanoids with long jaws, two tusks "
     f"jutting up from the lower jaw, deep sunken eyes, clawed hands, necklaces of bone and river shell, "
     f"bare chests and wrapped cloth waist-cloths. They are NOT green orcs and NOT goblins. "
     f"{NEEL} looses an arrow from a low thatched rooftop into the lead raider's shoulder. Overturned "
     "carts, villagers scattering. Solid black ink, bold flat black masses, sharp white highlights, "
     "hard impact lines. No soft grey wash anywhere."),

    ("06-the-palace",
     f"Interior of a great pillared ancient Indian palace at night, carved sandstone columns. "
     f"{NEEL} presses flat behind a pillar in deep shadow while a palace guard captain sweeps a torch "
     f"along the colonnade one step from finding him: a big bearded Indian warrior in a quilted cotton "
     f"corselet and a plain wrapped cloth turban, gold armbands, a heavy iron mace. "
     f"He wears NO helmet, NO visor, NO plate armour, NO chainmail, nothing European. "
     "Long raking shadows, deep flat blacks, extreme tension, stealth composition."),

    ("07-the-setback",
     f"A stone ravine at dusk. {NEEL} is on his knees at the bottom, his cane bow snapped in half beside "
     f"him, blood at his mouth. High above on the lip of the ravine stand two small figures: {DAHAN} "
     f"holding the clay ember-pot -- completely bald, clean-shaven, no beard, no hair at all -- and beside "
     f"him {KADRI} in a simple short undyed cotton wrap, standing there of her own will, looking down at "
     "her brother without moving to help. Devastating vertical scale. Solid black ink, huge flat black "
     "shadow masses, stark white sky. No soft grey wash anywhere."),

    ("08-the-ember-king",
     f"A half-burnt grove on a hillside above a distant war camp of thousands of tents. {DAHAN} has opened "
     f"the clay pot; a single ember floats above his palm throwing enormous shadows, and the dead trees "
     f"around him are catching light. {NEEL} charges in low from the foreground with a fishing spear, "
     f"and {KADRI} stands between them with both arms out. Climactic energy, radiating heat lines, "
     "the whole frame raked by shadow."),

    ("09-walk-away",
     f"Dawn on an empty road. {NEEL} and {KADRI} walk away from the viewer with a handful of ragged "
     "survivors, carrying baskets and a sealed dark clay pot. To the left and right, far off, two great "
     "armies raise their banners toward each other. The travellers do not look at either one. "
     "Wide, calm, enormous white sky, tiny figures, the last panel of a chapter."),
]


def draw(scene):
    name, prompt = scene
    path = os.path.join(OUT, name + ".png")
    if os.path.exists(path):
        return name + " cached"
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=json.dumps({"model": "gpt-image-1", "prompt": STYLE + " " + prompt,
                         "size": SIZE, "quality": "medium", "n": 1}).encode(),
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
        for line in ex.map(draw, SCENES):
            print(line, flush=True)
