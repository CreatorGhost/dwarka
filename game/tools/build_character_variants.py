"""Build reusable, single-skeleton DWARKA character variants.

The Quaternius outfit, face, and hair exports share the same 65-bone rig. The
browser previously instantiated each part with its own skeleton and copied only
the head transform at runtime. That can separate faces from bodies during
retargeted combat clips. This build step consolidates every visible part onto
one canonical armature so animation, equipment sockets, and faces cannot drift.

Run from the repository root:

    blender -b --python game/tools/build_character_variants.py
"""

from __future__ import annotations

import json
from pathlib import Path

import bpy


REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = REPO_ROOT / "site/public/playcanvas/chapter-1/assets/models"
REPORT_PATH = REPO_ROOT / "game/assets/work/character-variants-report.json"

VARIANTS = (
    {
        "name": "Vrishaketu_Composite",
        "outfit": "Male_Ranger.glb",
        "face": "Base_Male_Head.glb",
        "hair": "Hair_SimpleParted.glb",
        "remove": ("Male_Ranger_Head_Hood",),
    },
    {
        "name": "Raider_Archer_Composite",
        "outfit": "Male_Ranger.glb",
        "face": "Base_Male_Head.glb",
        "hair": None,
        "remove": (),
    },
    {
        "name": "Brute_Composite",
        "outfit": "Male_Ranger.glb",
        "face": "Base_Male_Head.glb",
        "hair": "Hair_Beard.glb",
        "remove": ("Male_Ranger_Head_Hood",),
    },
    {
        "name": "Male_Peasant_Composite",
        "outfit": "Male_Peasant.glb",
        "face": "Base_Male_Head.glb",
        "hair": "Hair_Buzzed.glb",
        "remove": (),
    },
    {
        "name": "Female_Peasant_Composite",
        "outfit": "Female_Peasant.glb",
        "face": "Base_Female_Head.glb",
        "hair": "Hair_Buns.glb",
        "remove": (),
    },
)

PLAYER_TEXTURE_SIZE = 1024
NPC_TEXTURE_SIZE = 512


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_part(filename: str, prefix: str) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(MODEL_DIR / filename))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    require(len(armatures) == 1, f"{filename}: expected one armature, found {len(armatures)}")
    armature = armatures[0]
    armature.name = f"{prefix}_Armature"
    meshes = [obj for obj in imported if obj.type == "MESH" and obj.parent == armature]
    require(meshes, f"{filename}: no skinned meshes")
    return armature, meshes


def move_meshes(meshes: list[bpy.types.Object], source: bpy.types.Object, target: bpy.types.Object) -> None:
    # Some Quaternius modular-part exports contain the correct visible geometry
    # but a bind armature translated several metres away from the outfit rig.
    # Bake that rest-root delta into the part geometry before binding it to the
    # canonical outfit armature. Comparing names alone is not sufficient.
    rest_delta = target.data.bones["root"].head_local - source.data.bones["root"].head_local
    for mesh in meshes:
        for vertex in mesh.data.vertices:
            vertex.co += rest_delta
        world = mesh.matrix_world.copy()
        mesh.parent = target
        mesh.matrix_world = world
        for modifier in mesh.modifiers:
            if modifier.type == "ARMATURE" and modifier.object == source:
                modifier.object = target


def remove_object(obj: bpy.types.Object) -> None:
    bpy.data.objects.remove(obj, do_unlink=True)


def build_variant(spec: dict) -> dict:
    reset_scene()
    target, visible_meshes = import_part(spec["outfit"], spec["name"])
    require(len(target.data.bones) == 65, f"{spec['name']}: outfit rig is not the canonical 65-bone rig")

    for object_name in spec["remove"]:
        match = next((obj for obj in visible_meshes if obj.name == object_name), None)
        if match:
            visible_meshes.remove(match)
            remove_object(match)

    face_armature, face_meshes = import_part(spec["face"], f"{spec['name']}_Face")
    require({bone.name for bone in face_armature.data.bones} == {bone.name for bone in target.data.bones}, f"{spec['name']}: face rig mismatch")
    move_meshes(face_meshes, face_armature, target)
    visible_meshes.extend(face_meshes)
    remove_object(face_armature)

    if spec["hair"]:
        hair_armature, hair_meshes = import_part(spec["hair"], f"{spec['name']}_Hair")
        require({bone.name for bone in hair_armature.data.bones} == {bone.name for bone in target.data.bones}, f"{spec['name']}: hair rig mismatch")
        move_meshes(hair_meshes, hair_armature, target)
        visible_meshes.extend(hair_meshes)
        remove_object(hair_armature)

    for obj in list(bpy.context.scene.objects):
        if obj != target and obj not in visible_meshes:
            remove_object(obj)

    texture_limit = PLAYER_TEXTURE_SIZE if spec["name"] == "Vrishaketu_Composite" else NPC_TEXTURE_SIZE
    resized_images = []
    for image in bpy.data.images:
        width, height = image.size
        longest = max(width, height)
        if longest > texture_limit:
            ratio = texture_limit / longest
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
            resized_images.append(image.name)

    target.name = "Armature"
    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    target.select_set(True)
    for mesh in visible_meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = target

    output = MODEL_DIR / f"{spec['name']}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_animations=False,
        export_skins=True,
        export_morph=False,
        export_image_format="WEBP",
        export_image_quality=82,
    )
    return {
        "name": spec["name"],
        "output": str(output.relative_to(REPO_ROOT)),
        "bytes": output.stat().st_size,
        "bones": len(target.data.bones),
        "meshes": [mesh.name for mesh in visible_meshes],
        "singleSkeleton": True,
        "maxTextureSize": texture_limit,
        "resizedImages": resized_images,
    }


def main() -> None:
    results = [build_variant(spec) for spec in VARIANTS]
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps({"schemaVersion": 1, "variants": results}, indent=2) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
