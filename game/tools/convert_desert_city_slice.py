"""Convert the guarded CGTrader desert-city slice to grounded PlayCanvas GLBs.

Run with Blender so the FBX importer and glTF exporter are available:

  blender --background --python game/tools/convert_desert_city_slice.py -- \
    game/assets/raw/cgtrader/polylised-medieval-desert-city/selected-fbx \
    site/public/playcanvas/chapter-1/assets/models/env-revamp
"""

from pathlib import Path
import sys

import bpy
import bmesh
from mathutils import Matrix


MODEL_FILES = (
    "civilian_house_18_a.FBX",
    "civilian_house_20.FBX",
    "civilian_house_30_d.FBX",
    "civilian_house_31_h.FBX",
    "civilian_house_37_h.FBX",
    "civilian_house_41_c.FBX",
    "box.FBX",
    "barrel_group.FBX",
    "street_oil_light.FBX",
    "fortification_gate.FBX",
    "tent_a.FBX",
    "tent_b.FBX",
)


def material_color(name: str) -> tuple[float, float, float, float]:
    lowered = name.lower()
    if "window" in lowered:
        return (0.025, 0.035, 0.055, 1.0)
    if "metal" in lowered:
        return (0.11, 0.085, 0.065, 1.0)
    if "wood" in lowered or "roof" in lowered:
        return (0.31, 0.16, 0.07, 1.0)
    if "wall_1" in lowered:
        return (0.38, 0.25, 0.15, 1.0)
    if "cloth" in lowered:
        return (0.48, 0.2, 0.08, 1.0)
    return (0.65, 0.46, 0.34, 1.0)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(collection):
            collection.remove(item)


def flatten_mesh_transforms(meshes: list[bpy.types.Object]) -> None:
    for mesh in meshes:
        world = mesh.matrix_world.copy()
        mesh.data.transform(world)
        mesh.parent = None
        mesh.matrix_world = Matrix.Identity(4)


def ground_meshes(meshes: list[bpy.types.Object]) -> None:
    minimum_z = min(vertex.co.z for mesh in meshes for vertex in mesh.data.vertices)
    correction = Matrix.Translation((0.0, 0.0, -minimum_z))
    for mesh in meshes:
        mesh.data.transform(correction)


def style_materials() -> None:
    for material in bpy.data.materials:
        color = material_color(material.name)
        material.diffuse_color = color
        material.metallic = 0.55 if "metal" in material.name.lower() else 0.0
        material.roughness = 0.68
        if not material.use_nodes:
            continue
        shader = material.node_tree.nodes.get("Principled BSDF")
        if shader is None:
            continue
        if shader.inputs.get("Base Color"):
            shader.inputs["Base Color"].default_value = color
        if shader.inputs.get("Metallic"):
            shader.inputs["Metallic"].default_value = material.metallic
        if shader.inputs.get("Roughness"):
            shader.inputs["Roughness"].default_value = material.roughness


def open_fortification_arch(meshes: list[bpy.types.Object]) -> None:
    """Open the source arch and cap its road-facing buttress projection."""
    for mesh in meshes:
        wood_indices = {
            index
            for index, slot in enumerate(mesh.material_slots)
            if slot.material and slot.material.name.lower().startswith("wood")
        }
        if not wood_indices:
            continue
        editable = bmesh.new()
        editable.from_mesh(mesh.data)
        removable = [face for face in editable.faces if face.material_index in wood_indices]
        bmesh.ops.delete(editable, geom=removable, context="FACES")
        # The untouched pack gate has deep tower feet that project 0.75 m into
        # the authored door approach. Flatten only that road-facing depth; the
        # arch, jambs, parapet and side silhouette remain source geometry.
        for vertex in editable.verts:
            if vertex.co.x > 2.62:
                vertex.co.x = 2.62
        editable.to_mesh(mesh.data)
        editable.free()
        mesh.data.update()


def simplify_dense_props(source: Path, meshes: list[bpy.types.Object]) -> None:
    """Keep small repeated props below the arrival segment's mobile GPU budget."""
    ratios = {"barrel_group": 0.28}
    ratio = ratios.get(source.stem.lower())
    if ratio is None:
        return
    for mesh in meshes:
        bpy.context.view_layer.objects.active = mesh
        modifier = mesh.modifiers.new(name="WebGL prop decimation", type="DECIMATE")
        modifier.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def convert(source: Path, destination: Path) -> None:
    reset_scene()
    bpy.ops.import_scene.fbx(filepath=str(source))
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"No mesh objects in {source}")
    flatten_mesh_transforms(meshes)
    ground_meshes(meshes)
    if source.stem.lower() == "fortification_gate":
        open_fortification_arch(meshes)
    simplify_dense_props(source, meshes)
    style_materials()
    bpy.ops.object.select_all(action="DESELECT")
    for mesh in meshes:
        mesh.select_set(True)
    temporary = destination.with_suffix(".tmp.glb")
    bpy.ops.export_scene.gltf(
        filepath=str(temporary),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        use_selection=True,
        export_cameras=False,
        export_lights=False,
    )
    temporary.replace(destination)
    print(f"converted {source.name} -> {destination.name}")


arguments = sys.argv[sys.argv.index("--") + 1 :]
if len(arguments) != 2:
    raise SystemExit("Expected source FBX directory and output GLB directory")

source_directory = Path(arguments[0]).resolve()
output_directory = Path(arguments[1]).resolve()
output_directory.mkdir(parents=True, exist_ok=True)
for filename in MODEL_FILES:
    convert(source_directory / filename, output_directory / f"{Path(filename).stem.lower()}.glb")
