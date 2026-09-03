"""Import approved Quaternius environment pieces as self-contained runtime GLBs.

The source archives include glTF geometry plus texture files. Importing their
FBX files directly leaves author-machine texture paths in the output, which is
not safe for a static browser export. This tool resolves only each model's
declared resources, embeds them as WebP in one GLB, and writes a reproducible
report for the asset ledger.

Run from the repository root:

    blender -b --python game/tools/import_quaternius_environment.py
"""

from __future__ import annotations

import hashlib
import json
import tempfile
import zipfile
from pathlib import Path

import bpy


REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = REPO_ROOT / "site/public/playcanvas/chapter-1/assets/models"
REPORT_PATH = REPO_ROOT / "game/assets/work/quaternius-environment-report.json"

SOURCES = (
    (
        REPO_ROOT / "game/assets/raw/quaternius/medieval-village-megakit/Medieval Village MegaKit[Standard].zip",
        (
            "Wall_Plaster_Straight",
            "Wall_UnevenBrick_Straight",
            "Door_2_Round",
            "WindowShutters_Wide_Round_Open",
            "Roof_RoundTiles_4x8",
            "Prop_Crate",
            "Prop_WoodenFence_Single",
        ),
    ),
    (
        REPO_ROOT / "game/assets/raw/quaternius/fantasy-props-megakit/Fantasy Props MegaKit[Standard].zip",
        ("Banner_1", "Lantern_Wall", "Crate_Wooden", "Bench"),
    ),
)

MAX_TEXTURE_SIZE = 512


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
            (model_dir / uri).write_bytes(package.read(member))
        return model_dir / f"{model_name}.gltf"


def convert(source: Path, output: Path) -> dict:
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"{source.name}: no meshes")
    resized_images = []
    for image in bpy.data.images:
        width, height = image.size
        longest = max(width, height)
        if longest > MAX_TEXTURE_SIZE:
            ratio = MAX_TEXTURE_SIZE / longest
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
            resized_images.append(image.name)
    for obj in bpy.context.scene.objects:
        obj.select_set(obj in meshes)
    bpy.context.view_layer.objects.active = meshes[0]
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
    external_images = [image.get("uri") for image in document.get("images", []) if image.get("uri")]
    if external_images:
        raise RuntimeError(f"{source.name}: output still references external textures {external_images}")
    return {
        "name": source.stem,
        "output": str(output.relative_to(REPO_ROOT)),
        "bytes": output.stat().st_size,
        "sha256": sha256(output),
        "meshes": len(document.get("meshes", [])),
        "embeddedImages": len(document.get("images", [])),
        "maxTextureSize": MAX_TEXTURE_SIZE,
        "resizedImages": resized_images,
    }


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    with tempfile.TemporaryDirectory(prefix="dwarka-quaternius-") as temporary:
        temp_root = Path(temporary)
        for archive, names in SOURCES:
            for model_name in names:
                source = extract_declared_files(archive, model_name, temp_root)
                result = convert(source, MODEL_DIR / f"{model_name}.glb")
                result["sourceArchive"] = str(archive.relative_to(REPO_ROOT))
                results.append(result)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps({"schemaVersion": 1, "assets": results}, indent=2) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
