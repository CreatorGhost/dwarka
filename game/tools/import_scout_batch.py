"""Convert scouted Chapter 1 environment pieces to runtime GLBs.

Grounds each mesh so the load-bearing contact is at y = 0, caps embedded
textures at 512 px WebP, and writes an auditable report. Run from repo root:

    blender -b --python game/tools/import_scout_batch.py
"""

from __future__ import annotations

import hashlib
import json
import tempfile
import zipfile
from pathlib import Path

import bpy
from mathutils import Vector


REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = REPO_ROOT / "site/public/playcanvas/chapter-1/assets/models"
REPORT_PATH = REPO_ROOT / "game/assets/work/scout-batch-report.json"
MAX_TEXTURE_SIZE = 512

QUATERNIUS = (
    (
        REPO_ROOT
        / "game/assets/raw/quaternius/medieval-village-megakit/Medieval Village MegaKit[Standard].zip",
        (
            "Floor_Brick",
            "Floor_UnevenBrick",
            "Prop_ExteriorBorder_Straight1",
            "Prop_ExteriorBorder_Corner",
            "Wall_BottomCover",
            "Overhang_Plaster_Short",
            "Overhang_Plaster_Long",
            "DoorFrame_Flat_WoodDark",
            "DoorFrame_Round_WoodDark",
            "Door_4_Flat",
            "Door_8_Flat",
            "Wall_Plaster_Door_Flat",
            "Prop_Support",
            "Stairs_Exterior_Platform",
        ),
    ),
    (
        REPO_ROOT
        / "game/assets/raw/quaternius/fantasy-props-megakit/Fantasy Props MegaKit[Standard].zip",
        (
            "Bucket_Wooden_1",
            "Rope_1",
            "Vase_4",
            "Bag",
            "FarmCrate_Empty",
            "Candle_1",
            "CandleStick",
            "Banner_1_Cloth",
            "Banner_2_Cloth",
        ),
    ),
)

POLYHAVEN_GLTF = (
    REPO_ROOT / "game/assets/raw/polyhaven/brass_diya_lantern/brass_diya_lantern_1k.gltf",
    REPO_ROOT / "game/assets/raw/polyhaven/brass_vase_03/brass_vase_03_1k.gltf",
    REPO_ROOT / "game/assets/raw/polyhaven/brass_vase_02/brass_vase_02_1k.gltf",
    REPO_ROOT / "game/assets/raw/polyhaven/planter_pot_clay/planter_pot_clay_1k.gltf",
    REPO_ROOT / "game/assets/raw/polyhaven/wicker_basket_01/wicker_basket_01_1k.gltf",
    REPO_ROOT / "game/assets/raw/polyhaven/wooden_bucket_01/wooden_bucket_01_1k.gltf",
)

KENNEY_FROM_ZIP = (
    (
        REPO_ROOT / "game/assets/raw/kenney/building-kit/kenney_building-kit.zip",
        (
            "roof-flat-center",
            "roof-flat-corner",
            "roof-flat-side",
            "roof-flat-square",
            "column",
            "column-wide",
            "wall-doorway-square",
        ),
    ),
    (
        REPO_ROOT / "game/assets/raw/kenney/fantasy-town-kit/kenney_fantasy-town-kit_2.0.zip",
        (
            "cart",
            "cart-high",
            "wheel",
            "fountain-round",
            "fountain-center",
            "roof-flat",
            "pillar-wood",
            "pillar-stone",
            "stall",
            "stall-green",
        ),
    ),
    (
        REPO_ROOT / "game/assets/raw/kenney/survival-kit/kenney_survival-kit.zip",
        ("tent-canvas", "bucket"),
    ),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def extract_declared_files(archive: Path, model_name: str, destination: Path) -> Path:
    with zipfile.ZipFile(archive) as package:
        candidates = [name for name in package.namelist() if name.endswith(f"/glTF/{model_name}.gltf")]
        if len(candidates) != 1:
            raise RuntimeError(f"{model_name}: expected one glTF in {archive.name}, found {candidates}")
        gltf_member = candidates[0]
        prefix = gltf_member.rsplit("/", 1)[0] + "/"
        document = json.loads(package.read(gltf_member))
        uris = [entry["uri"] for entry in document.get("buffers", []) if "uri" in entry]
        uris += [entry["uri"] for entry in document.get("images", []) if "uri" in entry]
        model_dir = destination / model_name
        model_dir.mkdir(parents=True, exist_ok=True)
        (model_dir / f"{model_name}.gltf").write_bytes(package.read(gltf_member))
        for uri in uris:
            member = prefix + uri
            if member not in package.namelist():
                raise RuntimeError(f"{model_name}: missing declared resource {uri}")
            target = model_dir / uri
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(package.read(member))
        return model_dir / f"{model_name}.gltf"


def ground_meshes() -> dict:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("no meshes")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    min_corner = Vector((float("inf"), float("inf"), float("inf")))
    max_corner = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in meshes:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_corner.x = min(min_corner.x, world.x)
            min_corner.y = min(min_corner.y, world.y)
            min_corner.z = min(min_corner.z, world.z)
            max_corner.x = max(max_corner.x, world.x)
            max_corner.y = max(max_corner.y, world.y)
            max_corner.z = max(max_corner.z, world.z)
    # Blender is Z-up; glTF export with export_yup maps Z -> Y.
    offset = Vector(
        (
            -(min_corner.x + max_corner.x) * 0.5,
            -(min_corner.y + max_corner.y) * 0.5,
            -min_corner.z,
        )
    )
    for obj in meshes:
        obj.location += offset
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    size = max_corner - min_corner
    return {
        "width": round(size.x, 4),
        "height": round(size.z, 4),
        "depth": round(size.y, 4),
        "meshCount": len(meshes),
    }


def cap_textures() -> list[str]:
    resized = []
    for image in bpy.data.images:
        width, height = image.size
        longest = max(width, height)
        if longest > MAX_TEXTURE_SIZE:
            ratio = MAX_TEXTURE_SIZE / longest
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
            resized.append(image.name)
    return resized


def export_glb(output: Path, resized: list[str], dimensions: dict, source: str) -> dict:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    for obj in bpy.context.scene.objects:
        obj.select_set(obj in meshes)
    bpy.context.view_layer.objects.active = meshes[0]
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_image_format="WEBP",
        export_image_quality=78,
        export_yup=True,
    )
    data = output.read_bytes()
    json_length = int.from_bytes(data[12:16], "little")
    document = json.loads(data[20 : 20 + json_length].decode().rstrip("\0 "))
    if any(image.get("uri") for image in document.get("images", [])):
        raise RuntimeError(f"{output.name}: output still references external textures")
    return {
        "name": output.stem,
        "source": source,
        "output": str(output.relative_to(REPO_ROOT)),
        "bytes": output.stat().st_size,
        "sha256": sha256(output),
        "meshes": len(document.get("meshes", [])),
        "embeddedImages": len(document.get("images", [])),
        "maxTextureSize": MAX_TEXTURE_SIZE,
        "resizedImages": resized,
        "dimensionsMetres": dimensions,
        "origin": "bottom-centre, y=0 contact",
        "front": "+Z (glTF)",
    }


def convert_gltf(source: Path, output: Path, source_label: str) -> dict:
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(source))
    dimensions = ground_meshes()
    resized = cap_textures()
    return export_glb(output, resized, dimensions, source_label)


def extract_kenney_glb(archive: Path, model_name: str, destination: Path) -> Path:
    member = f"Models/GLB format/{model_name}.glb"
    with zipfile.ZipFile(archive) as package:
        if member not in package.namelist():
            raise RuntimeError(f"{model_name}: missing {member} in {archive.name}")
        target = destination / f"{model_name}.glb"
        target.write_bytes(package.read(member))
        return target


def convert_kenney_matches(results: list) -> None:
    with tempfile.TemporaryDirectory(prefix="dwarka-kenney-") as temporary:
        temp_root = Path(temporary)
        for archive, names in KENNEY_FROM_ZIP:
            if not archive.exists():
                results.append({"name": archive.name, "skipped": "zip not downloaded"})
                continue
            for model_name in names:
                try:
                    source = extract_kenney_glb(archive, model_name, temp_root)
                    results.append(
                        convert_gltf(
                            source,
                            MODEL_DIR / f"Kenney_{model_name.replace('-', '_')}.glb",
                            str(archive.relative_to(REPO_ROOT)),
                        )
                    )
                except Exception as exc:
                    results.append({"name": model_name, "error": str(exc), "source": str(archive)})


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    with tempfile.TemporaryDirectory(prefix="dwarka-scout-") as temporary:
        temp_root = Path(temporary)
        for archive, names in QUATERNIUS:
            for model_name in names:
                source = extract_declared_files(archive, model_name, temp_root)
                result = convert_gltf(
                    source,
                    MODEL_DIR / f"{model_name}.glb",
                    str(archive.relative_to(REPO_ROOT)),
                )
                results.append(result)
    for gltf in POLYHAVEN_GLTF:
        if not gltf.exists():
            results.append({"name": gltf.stem, "skipped": "raw gltf not downloaded yet"})
            continue
        output = MODEL_DIR / f"{gltf.stem.replace('_1k', '')}.glb"
        try:
            results.append(convert_gltf(gltf, output, str(gltf.relative_to(REPO_ROOT))))
        except Exception as exc:
            results.append({"name": gltf.stem, "error": str(exc), "source": str(gltf)})
    convert_kenney_matches(results)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps({"schemaVersion": 1, "assets": results}, indent=2) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
