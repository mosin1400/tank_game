"""Build six game-ready, Mixamo-rigged male character GLBs in Blender 4.2.

Run:
  blender --background --python tools/characters/build-rigged-character-cast.py

The command uses the one user-approved Mixamo-rigged FBX as the skeleton and
transfers its vertex weights to the five matching MakeHuman JS source meshes.
No network access and no Blender add-on are required.
"""

import argparse
from pathlib import Path
import sys
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
RAW = ROOT / "tools" / "raw-character"
RIGGED_SOURCE = RAW / "mixamo" / "player-commander-rigged.fbx"
MAKEHUMAN_SOURCE = RAW / "makehuman-js"
OUTPUT = ROOT / "assets" / "models" / "characters" / "core"

CAST = {
    "player-commander": {
        "label": "فرمانده",
        "uniform": (0.18, 0.25, 0.12, 1.0), "accent": (0.45, 0.39, 0.16, 1.0),
        "cap": "field-cap", "kit": "command-map",
    },
    "ramin": {
        "label": "رامین",
        "uniform": (0.15, 0.29, 0.19, 1.0), "accent": (0.67, 0.50, 0.15, 1.0),
        "cap": "headset", "kit": "radio-pack",
    },
    "saman": {
        "label": "سامان",
        "uniform": (0.24, 0.22, 0.16, 1.0), "accent": (0.38, 0.31, 0.12, 1.0),
        "cap": "crew-cap", "kit": "tool-roll",
    },
    "nikan": {
        "label": "نیکان",
        "uniform": (0.16, 0.24, 0.26, 1.0), "accent": (0.36, 0.45, 0.44, 1.0),
        "cap": "scout-hood", "kit": "binocular-case",
    },
    "shahin-tali": {
        "label": "شاهین تالی",
        "uniform": (0.32, 0.24, 0.11, 1.0), "accent": (0.55, 0.24, 0.10, 1.0),
        "cap": "visor-cap", "kit": "field-notebook",
    },
    "general-varen": {
        "label": "ژنرال وارن",
        "uniform": (0.11, 0.12, 0.13, 1.0), "accent": (0.38, 0.12, 0.09, 1.0),
        "cap": "officer-cap", "kit": "leather-case",
    },
}


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.materials, bpy.data.meshes, bpy.data.armatures):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def import_fbx(path):
    bpy.ops.import_scene.fbx(filepath=str(path), use_anim=True)
    armature = next((obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"), None)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if armature is None or not meshes:
        raise RuntimeError(f"Mixamo file needs an armature and skinned mesh: {path}")
    mesh = max(meshes, key=lambda obj: len(obj.data.vertices))
    for extra in meshes:
        if extra != mesh:
            bpy.data.objects.remove(extra, do_unlink=True)
    return armature, mesh


def import_obj(path):
    bpy.ops.wm.obj_import(filepath=str(path))
    meshes = [obj for obj in bpy.context.selected_objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"OBJ source has no mesh: {path}")
    return meshes[0]


def material(name, rgba, metallic=0.0, roughness=0.7):
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    result.diffuse_color = rgba
    result.use_nodes = True
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return result


def bone_world(armature, bone_name):
    bone = armature.pose.bones.get(mixamo_bone(armature, bone_name))
    if bone is None:
        return armature.matrix_world.translation.copy()
    return armature.matrix_world @ bone.head


def body_world_bounds(body):
    """Return the visible body's world-space bounds after the rig transform."""
    bpy.context.view_layer.update()
    points = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
    low = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return low, high


def mixamo_bone(armature, bone_name):
    """Resolve short semantic names against Mixamo's exported bone prefix."""
    prefixed = f"mixamorig:{bone_name}"
    return prefixed if armature.pose.bones.get(prefixed) else bone_name


def skin_prop(obj, armature, body, bone_name):
    """Convert a world-placed prop into body-local geometry weighted to one bone."""
    body_from_prop = body.matrix_world.inverted() @ obj.matrix_world
    obj.data.transform(body_from_prop)
    obj.parent = body.parent
    obj.parent_type = "OBJECT"
    obj.matrix_parent_inverse = body.matrix_parent_inverse.copy()
    obj.matrix_basis = body.matrix_basis.copy()
    group = obj.vertex_groups.new(name=mixamo_bone(armature, bone_name))
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new("mixamo_armature", "ARMATURE")
    modifier.object = armature
    return obj


def add_box(name, location, scale, mat, armature, body, bone_name):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("soft_edges", "BEVEL")
    bevel.width = 0.02
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(mat)
    return skin_prop(obj, armature, body, bone_name)


def add_sphere(name, location, scale, mat, armature, body, bone_name):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return skin_prop(obj, armature, body, bone_name)


def add_torus(name, location, scale, mat, armature, body, bone_name):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=24, minor_segments=6, major_radius=1.0, minor_radius=0.12,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return skin_prop(obj, armature, body, bone_name)


def fitted_garment(body, armature, name, bone_names, mat, thickness=0.12):
    """Extract a body-conforming, skinned garment from weighted body faces."""
    wanted = {mixamo_bone(armature, bone_name) for bone_name in bone_names}
    selected = set()
    for vertex in body.data.vertices:
        if any(
            body.vertex_groups[assignment.group].name in wanted and assignment.weight >= 0.08
            for assignment in vertex.groups
        ):
            selected.add(vertex.index)

    polygons = [poly for poly in body.data.polygons if all(index in selected for index in poly.vertices)]
    used = sorted({index for poly in polygons for index in poly.vertices})
    if len(used) < 100:
        raise RuntimeError(f"Not enough fitted garment vertices for {name}: {len(used)}")
    remap = {old: new for new, old in enumerate(used)}
    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(
        [body.data.vertices[index].co.copy() for index in used],
        [],
        [[remap[index] for index in poly.vertices] for poly in polygons],
    )
    mesh.update()
    garment = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(garment)
    garment.parent = body.parent
    garment.parent_type = "OBJECT"
    garment.matrix_parent_inverse = body.matrix_parent_inverse.copy()
    garment.matrix_basis = body.matrix_basis.copy()
    garment.data.materials.append(mat)

    for source_group in body.vertex_groups:
        garment.vertex_groups.new(name=source_group.name)
    for new_index, old_index in enumerate(used):
        for assignment in body.data.vertices[old_index].groups:
            group_name = body.vertex_groups[assignment.group].name
            garment.vertex_groups[group_name].add([new_index], assignment.weight, "REPLACE")

    solidify = garment.modifiers.new("cloth_thickness", "SOLIDIFY")
    solidify.thickness = thickness
    solidify.offset = 1.0
    bpy.context.view_layer.objects.active = garment
    garment.select_set(True)
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    garment.select_set(False)
    armature_modifier = garment.modifiers.new("mixamo_armature", "ARMATURE")
    armature_modifier.object = armature
    return garment


def create_outfit(armature, body, profile):
    """Build fitted, skinned clothes plus small role-specific accessories."""
    undershirt = material("outfit_undershirt", (0.56, 0.53, 0.43, 1.0), roughness=0.9)
    uniform = material("outfit_uniform", profile["uniform"], roughness=0.82)
    accent = material("outfit_accent", profile["accent"], metallic=0.15, roughness=0.58)
    dark = material("outfit_boots", (0.035, 0.04, 0.03, 1.0), roughness=0.9)
    body_low, body_high = body_world_bounds(body)
    body_center = (body_low + body_high) * 0.5
    body_height = body_high.z - body_low.z
    waist = Vector((body_center.x, body_center.y, body_low.z + body_height * 0.50))
    head = Vector((body_center.x, body_center.y, body_high.z - 0.025))
    kit = Vector((body_center.x + 0.30, body_center.y + 0.02, body_low.z + body_height * 0.58))
    fitted_garment(
        body, armature, "outfit_undershirt",
        ("Spine", "Spine1", "Spine2", "Neck", "LeftShoulder", "RightShoulder", "LeftArm", "RightArm"),
        undershirt, 0.08,
    )
    fitted_garment(
        body, armature, "outfit_tunic",
        ("Hips", "Spine", "Spine1", "Spine2", "LeftShoulder", "RightShoulder", "LeftArm", "RightArm"),
        uniform, 0.16,
    )
    fitted_garment(body, armature, "outfit_trouser_left", ("LeftUpLeg", "LeftLeg"), uniform, 0.11)
    fitted_garment(body, armature, "outfit_trouser_right", ("RightUpLeg", "RightLeg"), uniform, 0.11)
    fitted_garment(body, armature, "outfit_boot_left", ("LeftLeg", "LeftFoot", "LeftToeBase"), dark, 0.14)
    fitted_garment(body, armature, "outfit_boot_right", ("RightLeg", "RightFoot", "RightToeBase"), dark, 0.14)
    add_torus("outfit_belt", waist, (0.27, 0.15, 0.10), accent, armature, body, "Hips")
    add_sphere(f"outfit_{profile['cap']}", head, (0.16, 0.15, 0.055), uniform, armature, body, "Head")
    add_box(f"outfit_{profile['kit']}", kit, (0.09, 0.06, 0.13), accent, armature, body, "Spine2")


def copy_weights_by_index(source, target):
    if len(source.data.vertices) != len(target.data.vertices):
        return False
    target.vertex_groups.clear()
    for group in source.vertex_groups:
        target.vertex_groups.new(name=group.name)
    for vertex in source.data.vertices:
        for assignment in vertex.groups:
            source_name = source.vertex_groups[assignment.group].name
            target.vertex_groups[source_name].add([vertex.index], assignment.weight, "REPLACE")
    return True


def skinned_variant(source, variant_obj, role):
    """Reuse the proven Mixamo bind data and replace only same-topology coordinates."""
    if len(source.data.vertices) != len(variant_obj.data.vertices):
        raise RuntimeError(f"Topology mismatch for {role}")
    target = source.copy()
    target.data = source.data.copy()
    bpy.context.collection.objects.link(target)
    target.name = f"{role}_body"
    for index, vertex in enumerate(variant_obj.data.vertices):
        target.data.vertices[index].co = vertex.co
    return target


def build(role, profile):
    reset_scene()
    armature, source_mesh = import_fbx(RIGGED_SOURCE)
    armature.name = "mixamo_rig"
    if role == "player-commander":
        character_mesh = source_mesh
        from wardrobe_fitter import fit_wardrobe
        fit_wardrobe(character_mesh, armature, role)
    else:
        # The non-commander variants retain their existing corrected OBJ path.
        armature.scale *= 10.0
        if armature.animation_data:
            armature.animation_data_clear()
        for pose_bone in armature.pose.bones:
            pose_bone.matrix_basis.identity()
        variant_obj = import_obj(MAKEHUMAN_SOURCE / f"{role}.obj")
        character_mesh = skinned_variant(source_mesh, variant_obj, role)
        bpy.data.objects.remove(variant_obj, do_unlink=True)
        bpy.data.objects.remove(source_mesh, do_unlink=True)
        create_outfit(armature, character_mesh, profile)
    armature["character_id"] = role
    armature["display_name"] = profile["label"]
    armature["outfit_id"] = profile["cap"]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / f"{role}.glb"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(target), export_format="GLB", use_selection=True,
        export_animations=False, export_skins=True, export_morph=True,
        export_materials="EXPORT", export_yup=True, export_extras=True,
    )
    print(f"Built {role}: {target}")


def requested_roles():
    script_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--role", choices=CAST)
    args = parser.parse_args(script_args)
    return (args.role,) if args.role else CAST


def main():
    if not RIGGED_SOURCE.is_file():
        raise FileNotFoundError(f"Expected Mixamo rig: {RIGGED_SOURCE}")
    for role in requested_roles():
        profile = CAST[role]
        source = MAKEHUMAN_SOURCE / f"{role}.obj"
        if role != "player-commander" and not source.is_file():
            raise FileNotFoundError(f"Expected MakeHuman source: {source}")
        build(role, profile)


if __name__ == "__main__":
    main()
