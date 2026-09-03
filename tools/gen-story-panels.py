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
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STORY_DIR = ROOT / "public" / "story-a"
GENERATED_DIR = STORY_DIR / "generated"
CONTACT_SHEET = ROOT / "tests" / "browser-artifacts" / "front" / "story-panels-contact-sheet.png"
API_URL = "https://api.openai.com/v1/images/generations"

STYLE = (
    "Painterly cinematic historical fantasy illustration for a browser-game cutscene. "
    "Mahabharata-era ancient India with researched dhoti, angavastram, gold ornaments, "
    "curved bows, wooden chariots, oil lamps, mud-brick and carved-stone architecture. "
    "Rich full colour, broad confident brushwork, realistic cloth and skin, deep atmospheric "
    "perspective, restrained human emotion, dramatic film lighting. Every frame must share one "
    "consistent visual language. Compose for a wide 16:9 crop with the main subject inside the "
    "central safe area. No text, lettering, captions, logos, borders, watermark, signature, "
    "comic panels, monochrome line art, modern objects, European armour, blue skin, divine halos, "
    "or visible deity faces. All visible characters are mortal humans."
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
    (
        "01-battlefield",
        "A vast Kurukshetra battlefield at bronze dusk on the seventeenth day. Broken wooden "
        "chariots, torn standards, distant war elephants and exhausted mortal armies dissolve into "
        "dust beneath a low copper sun. No central hero, no bodies in close detail, immense scale.",
    ),
    (
        "02-karna-looses",
        f"{KARNA} Seen from behind and below in his chariot one heartbeat after loosing. He holds only "
        "an empty curved bow in his extended left hand; his open right hand has released the string "
        "beside his cheek. The shot has passed fully beyond the frame. Absolutely no arrow, projectile, "
        "shaft, arrowhead, nocked missile, impact, wound, or opponent appears anywhere in the image.",
    ),
    (
        "03-wheel-sinks",
        "Close low view of an ornate wooden chariot wheel sinking into rain-dark battlefield mud. "
        "A mortal warrior's bare foot braces beside it, bronze-red cloth at the edge of frame. Wet "
        "earth grips the spokes with terrible weight. No faces, no wound, no arrow impact.",
    ),
    (
        "04-karna-lifts",
        f"{KARNA} He has set his curved bow on the mud several paces away and strains with both hands "
        "to lift the buried wheel. His back faces us, head bowed, dignity rather than spectacle. A "
        "distant opposing chariot waits through dust. No fatal arrow, no wound, no blood.",
    ),
    (
        "05-ash",
        "The battlefield after the unseen death, quiet before dawn. Pale ash crosses blackened "
        "earth, a broken wheel and abandoned bow lie far apart. In the close foreground, a small "
        "child-made sun cut from folded cream paper lies torn and ash-streaked, its creases and ragged "
        "rays unmistakable in one ember-orange glow. No people, corpse, or arrow; mournful negative space.",
    ),
    (
        "06-kunti-reveals",
        f"Inside a shadowed Hastinapura chamber at night, Kunti, an elderly mortal queen in a plain "
        f"cream widow's sari, reveals a gold ring to {VRISHAKETU} He stands rigid in profile while "
        "another older archer turns away in the background. Indigo shadows, one amber oil lamp, no deity.",
    ),
    (
        "07-raid",
        "A night raid through a narrow charioteers' street in an ancient Indian city. Mortal raiders "
        "in rough dark cloth move between burning timber doorways while families flee toward the "
        "foreground. Deep indigo night, ember-orange fire, small gold highlights, no monsters or deities.",
    ),
    (
        "08-chitra-dies",
        f"{VRISHAKETU} kneels in a burned doorway holding his dying ten-year-old foster brother "
        "Chitra. A small handmade sun rosette of creased cream paper is pinned to the child's plain "
        "cloth tunic; it must look fragile and homemade, never like a royal crown. The child's hand "
        "rests against Vrishaketu's wrist. Falling embers, intimate grief, no graphic wound or blood.",
    ),
    (
        "09-horse-loosed",
        "At first gold dawn, a white Ashvamedha horse runs free from an ancient Indian sacrificial "
        "ground. Priests and mortal warriors remain small and distant beside low fire altars and tall "
        "cloth standards. Long road ahead, indigo haze yielding to ember-orange and gold.",
    ),
    (
        "10-oath",
        f"{VRISHAKETU} stands alone on a road at sunrise, viewed three-quarters from behind, tying "
        "Chitra's torn paper sun crown to his belt before lifting his curved bow onto his shoulder. "
        "Hoofprints lead toward a distant walled city. Restrained resolve, no halo or divine figure.",
    ),
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def preserve_original(name: str) -> None:
    live = STORY_DIR / f"{name}.webp"
    backup = STORY_DIR / f"{name}.old.webp"
    if not live.exists():
        raise FileNotFoundError(f"missing live panel: {live}")
    if not backup.exists():
        shutil.copy2(live, backup)


def generate_panel(item: tuple[str, str], api_key: str, force: bool) -> str:
    name, scene = item
    preserve_original(name)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    output = GENERATED_DIR / f"{name}.webp"
    if output.exists() and not force:
        return f"{name}: cached"

    request = urllib.request.Request(
        API_URL,
        data=json.dumps(
            {
                "model": "gpt-image-1",
                "prompt": f"{STYLE} Scene: {scene}",
                "size": "1536x1024",
                "quality": "medium",
                "n": 1,
            }
        ).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )

    with urllib.request.urlopen(request, timeout=900) as response:
        payload = json.load(response)

    with tempfile.TemporaryDirectory(prefix="dwarka-panel-") as temporary:
        source = Path(temporary) / f"{name}.png"
        source.write_bytes(base64.b64decode(payload["data"][0]["b64_json"]))
        run(
            [
                "cwebp",
                "-quiet",
                "-mt",
                "-crop",
                "0",
                "80",
                "1536",
                "864",
                "-size",
                "340000",
                str(source),
                "-o",
                str(output),
            ]
        )

    if output.stat().st_size > 400_000:
        output.unlink(missing_ok=True)
        raise RuntimeError(f"{name}: compressed file exceeds 400 KB")
    return f"{name}: OK ({output.stat().st_size // 1024} KB)"


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


def install_generated() -> None:
    for name, _scene in PANELS:
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
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.contact_only:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required")
        selected_panels = [item for item in PANELS if not args.panel or item[0] in args.panel]
        with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 4))) as pool:
            for result in pool.map(lambda item: generate_panel(item, api_key, args.force), selected_panels):
                print(result, flush=True)
    build_contact_sheet()
    print(f"contact sheet: {CONTACT_SHEET}", flush=True)
    if args.install:
        install_generated()
        print("installed approved panels", flush=True)


if __name__ == "__main__":
    main()
