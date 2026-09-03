"""Right-size textures embedded in approved static runtime GLBs.

This is an intentionally conservative post-import step for older approved
Quaternius conversions that predate the reproducible import scripts. It does
not alter transforms, mesh topology, materials, or animation; it only caps
embedded texture dimensions and emits an auditable report.

Run from the repository root:

    blender -b --python game/tools/optimize_runtime_models.py
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import bpy


REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = REPO_ROOT / "site/public/playcanvas/chapter-1/assets/models"
REPORT_PATH = REPO_ROOT / "game/assets/work/runtime-model-optimization-report.json"
MAX_TEXTURE_SIZE = 512

MODELS = (
    "Wall_Plaster_Door_Round", "Wall_Plaster_Window_Wide_Round", "Door_2_Round",
    "WindowShutters_Wide_Round_Open", "Wall_Arch", "Roof_RoundTiles_4x4",
    "Roof_RoundTiles_4x8", "Prop_Wagon", "Balcony_Simple_Straight",
    "Stairs_Exterior_Straight", "Stall_Cart_Empty", "Stall_Empty", "Barrel",
    "Vase_2", "Pot_1", "Sword_Bronze", "Banner_1", "Lantern_Wall",
    "Crate_Wooden", "Bench", "Prop_Crate", "Prop_WoodenFence_Single",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def optimize(name: str) -> dict:
    source = MODEL_DIR / f"{name}.glb"
    if not source.exists():
        raise RuntimeError(f"Missing runtime model: {source}")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene_objects = list(bpy.context.scene.objects)
    if not any(obj.type == "MESH" for obj in scene_objects):
        raise RuntimeError(f"{name}: no mesh after import")
    before = [(image.name, tuple(image.size)) for image in bpy.data.images]
    resized = []
    for image in bpy.data.images:
        width, height = image.size
        longest = max(width, height)
        if longest > MAX_TEXTURE_SIZE:
            ratio = MAX_TEXTURE_SIZE / longest
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
            resized.append(image.name)
    for obj in scene_objects:
        obj.select_set(True)
    temporary = source.with_suffix(".optimized.glb")
    bpy.ops.export_scene.gltf(
        filepath=str(temporary), export_format="GLB", use_selection=True,
        export_animations=False, export_yup=True, export_image_format="WEBP",
        export_image_quality=78,
    )
    data = temporary.read_bytes()
    json_length = int.from_bytes(data[12:16], "little")
    document = json.loads(data[20 : 20 + json_length].decode().rstrip("\0 "))
    if any(image.get("uri") for image in document.get("images", [])):
        temporary.unlink(missing_ok=True)
        raise RuntimeError(f"{name}: optimized GLB has external image references")
    old_bytes = source.stat().st_size
    os.replace(temporary, source)
    return {
        "name": name,
        "output": str(source.relative_to(REPO_ROOT)),
        "oldBytes": old_bytes,
        "bytes": source.stat().st_size,
        "sha256": sha256(source),
        "embeddedImages": len(document.get("images", [])),
        "maxTextureSize": MAX_TEXTURE_SIZE,
        "resizedImages": resized,
        "sourceTextureSizes": before,
    }


def main() -> None:
    results = [optimize(name) for name in MODELS]
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps({"schemaVersion": 1, "assets": results}, indent=2) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
