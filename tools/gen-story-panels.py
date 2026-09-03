#!/usr/bin/env python3
"""Generate the ten DWARKA cinematic panels and a labeled contact sheet.

By default, generated images stay under public/story-a/generated/ so the live
cinematic keeps using the approved art. Pass --install only after approval to
replace the live files; the script preserves each original as *.old.webp.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STORY_DIR = ROOT / "public" / "story-a"
GENERATED_DIR = STORY_DIR / "generated"
CONTACT_SHEET = ROOT / "tests" / "browser-artifacts" / "front" / "story-panels-contact-sheet.png"
API_URL = "https://api.openai.com/v1/images/generations"
# gpt-image-2 is a large step up on contrast and focal detail; 1.5 is the fallback
# if a call errors. Sizes are tried widest-first and the winner is reused.
MODELS = ("gpt-image-2", "gpt-image-1.5")
SIZES = ("1792x1024", "1536x1024")

# One preamble for every panel: consistency across the set matters as much as
# any single frame. Written against gpt-image-2, which holds contrast and focal
# detail far better than gpt-image-1 did.
STYLE = (
    "Cinematic key-lit illustration for a AAA game cutscene, Mahabharata-era ancient India. "
    "ONE dominant motivated key light per frame — low sun, firelight, or an oil lamp — with a "
    "second cool rim light separating the subject from the background. Strong readable silhouette. "
    "Deep true blacks and real colour saturation in a tight ember-orange, deep-indigo and antique-gold "
    "palette; never a flat brown or grey haze, never washed out, never muddy midtones. High dynamic "
    "range with crisp sharp detail on faces, hands and cloth folds, falling off into soft atmospheric "
    "depth. Visible air: drifting smoke, dust motes and sparks catching the light. Painterly realism "
    "with confident brushwork and fine rendered detail, closer to a modern concept-art keyframe than "
    "to loose oil sketching. "
    "Researched period dress: dhoti, angavastram, gold ornaments, curved composite bows, wooden "
    "chariots, clay oil lamps, mud-brick and carved-stone architecture. "
    "Composed for a wide 16:9 crop with the subject in the central safe area. "
    "No text, lettering, captions, logos, borders, watermark, signature, comic panels, speech "
    "bubbles, monochrome line art, modern objects, European armour, blue skin, divine halos, or "
    "visible deity faces. All visible characters are mortal humans."
)

KARNA = (
    "Karna is a broad-shouldered mortal warrior in his forties, dressed in a bronze-red dhoti and "
    "dark saffron angavastram with restrained gold ear ornaments. His face stays turned away or "
    "lost in shadow in every frame."
)
VRISHAKETU = (
    "Vrishaketu is a lean seventeen-year-old mortal archer with short dark hair, a simple cream "
    "dhoti, rust-red sash, one gold ring on his bow hand, and a curved wooden bow."
)

PANELS: list[tuple[str, str]] = [
    # Framing beat: the player opens an ancient account, and the story comes alive.
    (
        "00-manuscript",
        "An ancient palm-leaf manuscript open on a low carved wooden stand in a dark stone alcove. "
        "A single clay oil lamp at the left edge is the only light, raking warm across the leaves so "
        "the incised script catches the flame and the deep background falls to true black. The script "
        "is dense, old and Devanagari-like but deliberately unreadable, never forming real words. "
        "Aged fibre texture, frayed edges, a cord threaded through the leaves, a dark brass stylus "
        "resting beside them. Dust motes hang in the lamplight. No people, no hands, no faces. "
        "Reverent, still, the moment before a story is read.",
    ),
    (
        "01-battlefield",
        "A vast Kurukshetra battlefield on the evening of the seventeenth day. A huge low blood-orange "
        "sun sits on the horizon as the single key light, throwing long hard shadows toward the viewer "
        "and rim-lighting every silhouette. Broken wooden chariots, torn crimson standards, distant war "
        "elephants and exhausted mortal armies read as crisp black silhouettes against the burning sky, "
        "receding through layers of luminous dust. Foreground wreckage is sharply detailed; the far "
        "field falls away into haze. Immense scale, no central hero, no bodies in close detail.",
    ),
    (
        "02-karna-looses",
        f"{KARNA} Three-quarter view from behind and slightly below, high in his chariot at the exact "
        "moment of release. His extended left arm holds an empty curved bow; the bowstring is caught "
        "mid-vibration in a soft blur beside the grip. His right hand has just opened beside his jaw, "
        "fingers still splayed. His head is turned downrange, away from us, gaze following the shot into "
        "the dust — face unreadable, lost to shadow and profile. Dust and torn standards streak past. "
        "Absolutely no arrow, projectile, shaft, arrowhead, nocked missile, impact, wound, target, or "
        "opponent appears anywhere in the image; the frame holds only the release itself.",
    ),
    (
        "03-wheel-sinks",
        "Extreme low close view of an ornate wooden chariot wheel sunk deep into rain-black battlefield "
        "mud. Hard low sunlight rakes across the wet mud so every rut and water-filled hollow glitters, "
        "and the carved spokes throw long shadows. A mortal warrior's bare foot and calf brace beside "
        "it, caked in mud, bronze-red cloth at the edge of frame. The wet earth visibly grips the "
        "spokes. Sharp macro detail on grain, mud and water; deep black background. No faces, no wound.",
    ),
    (
        "04-karna-lifts",
        f"{KARNA} Low angle from ground level, close to the mud. He has set his curved bow down several "
        "paces away. Both arms are driven under the rim of the sunken chariot wheel, forearms and hands "
        "gripping the wet spokes, one shoulder jammed hard into the wheel, one knee braced in the churned "
        "mud. Back and neck strain visibly, head bowed and turned away so his face stays in shadow. Mud "
        "clings to his arms and dhoti; wet earth runs off the rim. Effort and dignity, never spectacle. "
        "A distant opposing chariot waits through dust. No fatal arrow, no wound, no blood.",
    ),
    (
        "05-ash",
        "The battlefield hours after the unseen death, in the cold blue hour before dawn. The frame is "
        "almost monochrome deep indigo and black ash, lit by one small dying ember on the ground that "
        "is the only warm source. In sharp close foreground that ember glow catches a small child-made "
        "sun cut from folded cream paper, torn and ash-streaked, every crease and ragged ray crisply "
        "rendered. A broken wheel and an abandoned bow are far-off silhouettes. Drifting ash in the air. "
        "No people, corpse, or arrow; vast mournful negative space.",
    ),
    (
        "06-kunti-reveals",
        f"A shadowed Hastinapura stone chamber at night. A single amber oil lamp on a low table is the "
        f"only key light, lighting faces from below and leaving the carved walls in near-black indigo. "
        f"Kunti, an elderly mortal queen in a plain cream widow's sari, holds out a small gold ring; "
        f"the lamp catches the metal as the brightest point in the frame. {VRISHAKETU} stands rigid in "
        "profile, jaw tight, half his face in shadow, sharply rendered. Another older archer turns away "
        "into darkness behind. Smoke curls through the lamplight. Intimate, tense, no deity.",
    ),
    (
        "07-raid",
        "A night raid down a narrow charioteers' street in an ancient Indian city. A burning timber "
        "doorway mid-frame is the fierce ember-orange key light, throwing raiders in rough dark cloth "
        "into hard black silhouette and rim-lighting the fleeing families in the foreground with "
        "orange edges. Deep indigo night above, cool moonlight on the wet street stones as a secondary "
        "source. Sparks and thick smoke pour through the light. Faces of the fleeing read clearly and "
        "sharply; the depth of the lane falls into smoke. No monsters, no deities.",
    ),
    (
        "08-chitra-dies",
        f"{VRISHAKETU} kneels in a burned doorway cradling his dying ten-year-old foster brother Chitra. "
        "Dying firelight from off-frame left is the warm key on both faces; everything beyond the "
        "doorway is deep black. A small handmade sun rosette of creased cream paper is pinned to the "
        "child's plain cloth tunic, catching the light — fragile and homemade, never a royal crown. "
        "The child's small hand rests against Vrishaketu's wrist, both hands sharply rendered. Embers "
        "fall slowly through the dark air. Restrained intimate grief, no graphic wound, no blood.",
    ),
    (
        "09-horse-loosed",
        "First gold dawn. A white Ashvamedha horse runs free from an ancient Indian sacrificial ground, "
        "backlit by the rising sun so its mane and the dust off its hooves blaze with rim light while "
        "its body reads as a strong pale silhouette. Priests and mortal warriors stay small and "
        "distant beside low fire altars and tall cloth standards. Long empty road ahead, cold indigo "
        "shadow in the foreground giving way to ember-orange and gold at the horizon. Crisp detail on "
        "the horse, deep atmospheric falloff behind.",
    ),
    (
        "10-oath",
        f"{VRISHAKETU} stands alone on an empty road at sunrise, seen three-quarters from behind, tying "
        "Chitra's torn paper sun crown to his belt, his curved bow rising onto his shoulder. The low "
        "sun is directly ahead of him, so he is a strong dark silhouette with a hot gold rim along his "
        "shoulder, arm and bow, and his long shadow runs back toward the viewer. Hoofprints lead away "
        "toward a distant walled city in luminous haze. The paper crown catches the light and is "
        "sharply detailed. Restrained resolve, no halo, no divine figure.",
    ),
    # Hand-off frame: must match the third-person camera the player gets one second later.
    (
        "11-lane-mouth",
        f"{VRISHAKETU} Seen from behind over his right shoulder in a third-person game camera framing, "
        "standing at the mouth of a narrow charioteers' lane in an ancient Indian city at night. He is "
        "low and central in the frame, back to us, face never visible, the curved bow held down in his "
        "left hand. The lane runs away from us between mud-brick and carved-stone houses hung with small "
        "oil lamps; one doorway far up the lane burns ember-orange behind thin smoke. Deep indigo night, "
        "warm lamp pools every few paces, wet street stones catching the light. No raiders, no fighting, "
        "no bodies, no fire in the foreground. The stillness one breath before it begins.",
    ),
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def preserve_original(name: str) -> None:
    # Panels added after the first pass (11-lane-mouth) have no live file to keep.
    live = STORY_DIR / f"{name}.webp"
    backup = STORY_DIR / f"{name}.old.webp"
    if live.exists() and not backup.exists():
        shutil.copy2(live, backup)


def png_size(path: Path) -> tuple[int, int]:
    header = path.read_bytes()[16:24]
    return int.from_bytes(header[:4], "big"), int.from_bytes(header[4:], "big")


def request_image(prompt: str, api_key: str, quality: str) -> tuple[bytes, str]:
    """Widest size on the best model, falling back through SIZES then MODELS."""
    last = None
    for model in MODELS:
        for size in SIZES:
            request = urllib.request.Request(
                API_URL,
                data=json.dumps({"model": model, "prompt": prompt, "size": size, "quality": quality, "n": 1}).encode(),
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )
            try:
                with urllib.request.urlopen(request, timeout=900) as response:
                    payload = json.load(response)
                return base64.b64decode(payload["data"][0]["b64_json"]), f"{model} {size}"
            except urllib.error.HTTPError as error:
                last = f"{model} {size}: HTTP {error.code} {error.read()[:160].decode(errors='replace')}"
            except Exception as error:  # noqa: BLE001 - report and try the next combination
                last = f"{model} {size}: {error}"
    raise RuntimeError(last or "no image model accepted the request")


def generate_panel(item: tuple[str, str], api_key: str, force: bool, quality: str, budget: int) -> str:
    name, scene = item
    preserve_original(name)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    output = GENERATED_DIR / f"{name}.webp"
    if output.exists() and not force:
        return f"{name}: cached"
    # Keep the gpt-image-1 generation so old and new can be compared and reverted.
    legacy = GENERATED_DIR / f"{name}.gpt1.webp"
    if output.exists() and not legacy.exists():
        shutil.copy2(output, legacy)

    raw, used = request_image(f"{STYLE} Scene: {scene}", api_key, quality)

    with tempfile.TemporaryDirectory(prefix="dwarka-panel-") as temporary:
        source = Path(temporary) / f"{name}.png"
        source.write_bytes(raw)
        width, height = png_size(source)
        # Centre-crop whatever the model returned down to exactly 16:9.
        target_height = int(width * 9 / 16)
        if target_height <= height:
            crop = ["-crop", "0", str((height - target_height) // 2), str(width), str(target_height)]
        else:
            target_width = int(height * 16 / 9)
            crop = ["-crop", str((width - target_width) // 2), "0", str(target_width), str(height)]
        run(["cwebp", "-quiet", "-mt", *crop, "-size", str(budget), str(source), "-o", str(output)])

    if output.stat().st_size > budget * 1.2:
        output.unlink(missing_ok=True)
        raise RuntimeError(f"{name}: compressed file exceeds its {budget // 1024} KB budget")
    return f"{name}: OK via {used} -> {width}x{height} ({output.stat().st_size // 1024} KB)"


def build_contact_sheet() -> None:
    CONTACT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    inputs: list[str] = []
    filters: list[str] = []
    labels: list[str] = []
    for index, (name, _scene) in enumerate(PANELS):
        panel = GENERATED_DIR / f"{name}.webp"
        if not panel.exists():
            raise FileNotFoundError(f"missing generated panel: {panel}")
        inputs.extend(["-i", str(panel)])
        filters.append(
            f"[{index}:v]scale=640:360:force_original_aspect_ratio=increase,crop=640:360,"
            f"drawbox=x=0:y=316:w=640:h=44:color=black@0.72:t=fill,"
            f"drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:"
            f"text='{index + 1:02d}  {name}':x=14:y=327:fontsize=20:fontcolor=white[v{index}]"
        )
        labels.append(f"[v{index}]")

    layout = "|".join(f"{(index % 2) * 640}_{(index // 2) * 360}" for index in range(len(PANELS)))
    filters.append(f"{''.join(labels)}xstack=inputs={len(PANELS)}:layout={layout}:fill=black[out]")
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            *inputs,
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[out]",
            "-frames:v",
            "1",
            str(CONTACT_SHEET),
        ]
    )


def install_generated(names: list[str] | None = None) -> None:
    for name, _scene in PANELS:
        if names and name not in names:
            continue
        preserve_original(name)
        shutil.copy2(GENERATED_DIR / f"{name}.webp", STORY_DIR / f"{name}.webp")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="regenerate cached candidate panels")
    parser.add_argument("--contact-only", action="store_true", help="rebuild the sheet from cached candidates")
    parser.add_argument("--install", action="store_true", help="replace live panels after owner approval")
    parser.add_argument(
        "--panel",
        action="append",
        choices=[name for name, _scene in PANELS],
        help="generate only this panel (repeatable); the contact sheet still uses all cached candidates",
    )
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--quality", default="medium", choices=["low", "medium", "high"])
    parser.add_argument("--size", type=int, default=340_000, help="cwebp byte budget per panel")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.contact_only:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required")
        selected_panels = [item for item in PANELS if not args.panel or item[0] in args.panel]
        with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 4))) as pool:
            for result in pool.map(
                lambda item: generate_panel(item, api_key, args.force, args.quality, args.size),
                selected_panels,
            ):
                print(result, flush=True)
    build_contact_sheet()
    print(f"contact sheet: {CONTACT_SHEET}", flush=True)
    if args.install:
        install_generated(args.panel)
        print(f"installed: {', '.join(args.panel) if args.panel else 'all panels'}", flush=True)


if __name__ == "__main__":
    main()
