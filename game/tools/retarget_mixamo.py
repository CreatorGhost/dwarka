"""Retarget the approved Mixamo clips onto DWARKA's canonical Quaternius rig.

Run from the repository root:

    blender -b --python game/tools/retarget_mixamo.py

The manifest is the interface. Source-specific names, checksums, and download
settings stay there; callers receive one PlayCanvas-ready GLB containing clips
that all target the same 65-bone game rig.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector


REPO_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = REPO_ROOT / "game/tools/character-animation-sources.json"
REPORT_PATH = REPO_ROOT / "game/assets/work/mixamo/retarget-report.json"


BONE_MAP = {
    "mixamorig:Hips": "pelvis",
    "mixamorig:Spine": "spine_01",
    "mixamorig:Spine1": "spine_02",
    "mixamorig:Spine2": "spine_03",
    "mixamorig:Neck": "neck_01",
    "mixamorig:Head": "Head",
    "mixamorig:LeftShoulder": "clavicle_l",
    "mixamorig:LeftArm": "upperarm_l",
    "mixamorig:LeftForeArm": "lowerarm_l",
    "mixamorig:LeftHand": "hand_l",
    "mixamorig:RightShoulder": "clavicle_r",
    "mixamorig:RightArm": "upperarm_r",
    "mixamorig:RightForeArm": "lowerarm_r",
    "mixamorig:RightHand": "hand_r",
    "mixamorig:LeftUpLeg": "thigh_l",
    "mixamorig:LeftLeg": "calf_l",
    "mixamorig:LeftFoot": "foot_l",
    "mixamorig:LeftToeBase": "ball_l",
    "mixamorig:RightUpLeg": "thigh_r",
    "mixamorig:RightLeg": "calf_r",
    "mixamorig:RightFoot": "foot_r",
    "mixamorig:RightToeBase": "ball_r",
}

for side_name, side_suffix in (("Left", "l"), ("Right", "r")):
    for source_finger, target_finger in (
        ("Thumb", "thumb"),
        ("Index", "index"),
        ("Middle", "middle"),
        ("Ring", "ring"),
        ("Pinky", "pinky"),
    ):
        for index in range(1, 4):
            BONE_MAP[f"mixamorig:{side_name}Hand{source_finger}{index}"] = (
                f"{target_finger}_{index:02d}_{side_suffix}"
            )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def find_armature(predicate) -> bpy.types.Object:
    matches = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE" and predicate(obj)]
    require(len(matches) == 1, f"Expected one armature, found {[obj.name for obj in matches]}")
    return matches[0]


def clear_pose(armature: bpy.types.Object) -> None:
    for pose_bone in armature.pose.bones:
        pose_bone.matrix_basis = Matrix.Identity(4)
        pose_bone.rotation_mode = "QUATERNION"


def world_rest(armature: bpy.types.Object, bone_name: str) -> Matrix:
    return armature.matrix_world @ armature.data.bones[bone_name].matrix_local


def world_pose(armature: bpy.types.Object, bone_name: str) -> Matrix:
    return armature.matrix_world @ armature.pose.bones[bone_name].matrix


def armature_depth(bone: bpy.types.Bone) -> int:
    depth = 0
    parent = bone.parent
    while parent:
        depth += 1
        parent = parent.parent
    return depth


def safe_quaternion(matrix: Matrix) -> Quaternion:
    value = matrix.to_quaternion().normalized()
    require(all(math.isfinite(component) for component in value), "Non-finite retarget quaternion")
    return value


def retarget_clip(
    target: bpy.types.Object,
    source_path: Path,
    output_name: str,
    fps: int,
) -> tuple[bpy.types.Action, dict]:
    before_objects = set(bpy.context.scene.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(
        filepath=str(source_path),
        use_anim=True,
        automatic_bone_orientation=False,
        ignore_leaf_bones=True,
        use_prepost_rot=True,
    )
    new_objects = [obj for obj in bpy.context.scene.objects if obj not in before_objects]
    source_armatures = [obj for obj in new_objects if obj.type == "ARMATURE"]
    require(len(source_armatures) == 1, f"{source_path.name}: expected one source armature")
    source = source_armatures[0]
    source_action = source.animation_data.action if source.animation_data else None
    require(source_action is not None, f"{source_path.name}: no animation action")

    missing_source = [name for name in BONE_MAP if name not in source.data.bones]
    missing_target = [name for name in BONE_MAP.values() if name not in target.data.bones]
    require(not missing_source, f"{source_path.name}: missing Mixamo bones {missing_source}")
    require(not missing_target, f"Canonical rig is missing bones {missing_target}")

    start = int(math.floor(source_action.frame_range[0]))
    end = int(math.ceil(source_action.frame_range[1]))
    require(end > start, f"{source_path.name}: animation has no duration")
    bpy.context.scene.render.fps = fps
    bpy.context.scene.frame_start = start
    bpy.context.scene.frame_end = end

    source.animation_data.action = source_action
    target.animation_data_create()
    target.animation_data.action = None
    action = bpy.data.actions.new(output_name)
    target.animation_data.action = action

    target_rest_world = {
        target_name: world_rest(target, target_name) for target_name in BONE_MAP.values()
    }
    source_rest_world = {
        source_name: world_rest(source, source_name) for source_name in BONE_MAP
    }
    ordered_pairs = sorted(
        BONE_MAP.items(), key=lambda pair: armature_depth(target.data.bones[pair[1]])
    )

    source_hips_rest = source_rest_world["mixamorig:Hips"].translation
    target_hips_rest = target_rest_world["pelvis"].translation
    source_height = (source_rest_world["mixamorig:Head"].translation - source_hips_rest).length
    target_height = (target_rest_world["Head"].translation - target_hips_rest).length
    require(source_height > 0.1 and target_height > 0.1, "Invalid rig proportions")
    translation_scale = target_height / source_height

    clear_pose(target)
    bpy.context.view_layer.update()
    previous_quaternions: dict[str, Quaternion] = {}

    for frame in range(start, end + 1):
        bpy.context.scene.frame_set(frame)
        clear_pose(target)
        bpy.context.view_layer.update()

        for source_name, target_name in ordered_pairs:
            source_delta = safe_quaternion(world_pose(source, source_name)) @ safe_quaternion(
                source_rest_world[source_name]
            ).inverted()
            desired_world_rotation = (
                source_delta @ safe_quaternion(target_rest_world[target_name])
            ).normalized()
            desired_armature_rotation = (
                safe_quaternion(target.matrix_world).inverted() @ desired_world_rotation
            ).normalized()

            pose_bone = target.pose.bones[target_name]
            current_translation = pose_bone.matrix.translation.copy()
            if target_name == "pelvis":
                source_offset = world_pose(source, source_name).translation - source_hips_rest
                desired_world_translation = target_hips_rest + source_offset * translation_scale
                current_translation = target.matrix_world.inverted() @ desired_world_translation

            pose_bone.matrix = Matrix.Translation(current_translation) @ desired_armature_rotation.to_matrix().to_4x4()
            bpy.context.view_layer.update()
            pose_bone.rotation_mode = "QUATERNION"
            quaternion = pose_bone.rotation_quaternion.normalized()
            previous = previous_quaternions.get(target_name)
            if previous is not None and previous.dot(quaternion) < 0:
                quaternion.negate()
                pose_bone.rotation_quaternion = quaternion
            previous_quaternions[target_name] = quaternion.copy()
            pose_bone.keyframe_insert("rotation_quaternion", frame=frame, group=target_name)
            if target_name == "pelvis":
                pose_bone.keyframe_insert("location", frame=frame, group=target_name)

    target.animation_data.action = None
    track = target.animation_data.nla_tracks.new()
    track.name = output_name
    strip = track.strips.new(output_name, start, action)
    strip.name = output_name

    source_height_pose = []
    hand_separation = []
    shoulder_twist = []
    for frame in (start, (start + end) // 2, end):
        target.animation_data.action = action
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        left_hand = world_pose(target, "hand_l").translation
        right_hand = world_pose(target, "hand_r").translation
        head = world_pose(target, "Head").translation
        pelvis = world_pose(target, "pelvis").translation
        hand_separation.append((left_hand - right_hand).length)
        source_height_pose.append((head - pelvis).length)
        left_shoulder = safe_quaternion(world_pose(target, "upperarm_l"))
        right_shoulder = safe_quaternion(world_pose(target, "upperarm_r"))
        shoulder_twist.append(abs(left_shoulder.dot(right_shoulder)))
    target.animation_data.action = None

    for obj in new_objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    for imported_action in list(bpy.data.actions):
        if imported_action in before_actions or imported_action == action:
            continue
        bpy.data.actions.remove(imported_action)

    return action, {
        "sourceFrames": [start, end],
        "durationSeconds": round((end - start) / fps, 4),
        "mappedBones": len(BONE_MAP),
        "translationScale": round(translation_scale, 6),
        "handSeparationMeters": [round(value, 4) for value in hand_separation],
        "headToPelvisMeters": [round(value, 4) for value in source_height_pose],
        "shoulderDotAbs": [round(value, 4) for value in shoulder_twist],
    }


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    require(manifest.get("schemaVersion") == 1, "Unsupported animation manifest")
    target_path = REPO_ROOT / manifest["canonicalRigFile"]
    output_path = REPO_ROOT / manifest["outputFile"]
    require(target_path.is_file(), f"Missing canonical rig: {target_path}")

    for clip in manifest["clips"]:
        source_path = REPO_ROOT / clip["sourceFile"]
        require(source_path.is_file(), f"Missing source clip: {source_path}")
        require(sha256(source_path) == clip["sha256"], f"Checksum mismatch: {source_path.name}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(target_path))
    target = find_armature(lambda obj: "pelvis" in obj.data.bones and "hand_l" in obj.data.bones)
    require(len(target.data.bones) == 65, f"Canonical rig changed: expected 65 bones, got {len(target.data.bones)}")

    target.animation_data_create()
    target.animation_data.action = None
    for track in list(target.animation_data.nla_tracks):
        target.animation_data.nla_tracks.remove(track)

    report = {
        "schemaVersion": 1,
        "canonicalRig": manifest["canonicalRig"],
        "canonicalBoneCount": len(target.data.bones),
        "output": manifest["outputFile"],
        "clips": [],
    }
    generated_actions = []
    for clip in manifest["clips"]:
        action, clip_report = retarget_clip(
            target,
            REPO_ROOT / clip["sourceFile"],
            clip["name"],
            int(clip["download"]["fps"]),
        )
        generated_actions.append(action)
        report["clips"].append({"name": clip["name"], **clip_report})

    keep_actions = set(generated_actions)
    for action in list(bpy.data.actions):
        if action not in keep_actions:
            bpy.data.actions.remove(action)

    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    target.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and any(mod.object == target for mod in obj.modifiers if mod.type == "ARMATURE"):
            obj.select_set(True)
    bpy.context.view_layer.objects.active = target

    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
        export_frame_range=False,
        export_optimize_animation_size=True,
        export_yup=True,
    )
    require(output_path.is_file() and output_path.stat().st_size > 1024, "Animation export failed")
    report["outputSha256"] = sha256(output_path)
    report["outputBytes"] = output_path.stat().st_size
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n")
    print("DWARKA_RETARGET_REPORT=" + json.dumps(report, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"DWARKA_RETARGET_ERROR={error}", file=sys.stderr)
        raise
