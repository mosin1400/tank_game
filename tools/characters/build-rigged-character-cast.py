"""Build six game-ready, Mixamo-rigged male character GLBs in Blender 4.2.

Run:
  blender --background --python tools/characters/build-rigged-character-cast.py

The command uses the one user-approved Mixamo-rigged FBX as the skeleton and
transfers its vertex weights to the five matching MakeHuman JS source meshes.
No network access and no Blender add-on are required.
"""

from pathlib import Path
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
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
    mesh = next((obj for obj in bpy.context.scene.objects if obj.type == "MESH"), None)
    if armature is None or mesh is None:
        raise RuntimeError(f"Mixamo file needs an armature and skinned mesh: {path}")
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


def mixamo_bone(armature, bone_name):
    """Resolve short semantic names against Mixamo's exported bone prefix."""
    prefixed = f"mixamorig:{bone_name}"
    return prefixed if armature.pose.bones.get(prefixed) else bone_name


def add_box(name, location, scale, mat, armature, bone_name):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bone_name = mixamo_bone(armature, bone_name)
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_parent_inverse = armature.matrix_world.inverted()
    return obj


def add_sphere(name, location, scale, mat, armature, bone_name):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bone_name = mixamo_bone(armature, bone_name)
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_parent_inverse = armature.matrix_world.inverted()
    return obj


def create_outfit(armature, profile):
    """Add a low-poly, emblem-free uniform as bone-attached game accessories."""
    uniform = material("outfit_uniform", profile["uniform"], roughness=0.82)
    accent = material("outfit_accent", profile["accent"], metallic=0.15, roughness=0.58)
    dark = material("outfit_boots", (0.035, 0.04, 0.03, 1.0), roughness=0.9)
    spine = bone_world(armature, "Spine2")
    head = bone_world(armature, "Head")
    left_leg = bone_world(armature, "LeftUpLeg")
    right_leg = bone_world(armature, "RightUpLeg")
    add_box("outfit_tunic", spine, (0.26, 0.16, 0.38), uniform, armature, "Spine2")
    add_box("outfit_belt", spine + Vector((0, 0, -0.10)), (0.29, 0.18, 0.035), accent, armature, "Spine2")
    add_box("outfit_trouser_left", left_leg, (0.12, 0.13, 0.34), uniform, armature, "LeftUpLeg")
    add_box("outfit_trouser_right", right_leg, (0.12, 0.13, 0.34), uniform, armature, "RightUpLeg")
    add_box("outfit_boot_left", left_leg + Vector((0, 0.03, -0.36)), (0.14, 0.22, 0.09), dark, armature, "LeftLeg")
    add_box("outfit_boot_right", right_leg + Vector((0, 0.03, -0.36)), (0.14, 0.22, 0.09), dark, armature, "RightLeg")
    add_sphere(f"outfit_{profile['cap']}", head + Vector((0, 0, 0.10)), (0.20, 0.20, 0.07), uniform, armature, "Head")
    add_box(f"outfit_{profile['kit']}", spine + Vector((0.30, 0.02, -0.08)), (0.09, 0.06, 0.13), accent, armature, "Spine2")


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


def transfer_weights(source, target, armature):
    """Prefer identical MakeHuman topology; retain DATA_TRANSFER fallback for safety."""
    if not copy_weights_by_index(source, target):
        transfer = target.modifiers.new("mixamo_weight_transfer", "DATA_TRANSFER")
        transfer.object = source
        transfer.use_vert_data = True
        transfer.data_types_verts = {"VGROUP_WEIGHTS"}
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.modifier_apply(modifier=transfer.name)
    armature_modifier = target.modifiers.new("mixamo_armature", "ARMATURE")
    armature_modifier.object = armature
    target.parent = armature


def build(role, profile):
    reset_scene()
    armature, source_mesh = import_fbx(RIGGED_SOURCE)
    armature.name = "mixamo_rig"
    if role == "player-commander":
        character_mesh = source_mesh
    else:
        character_mesh = import_obj(MAKEHUMAN_SOURCE / f"{role}.obj")
        character_mesh.name = f"{role}_body"
        transfer_weights(source_mesh, character_mesh, armature)
        bpy.data.objects.remove(source_mesh, do_unlink=True)
    create_outfit(armature, profile)
    armature["character_id"] = role
    armature["display_name"] = profile["label"]
    armature["outfit_id"] = profile["cap"]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / f"{role}.glb"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(target), export_format="GLB", use_selection=True,
        export_animations=True, export_skins=True, export_morph=True,
        export_materials="EXPORT", export_yup=True,
    )
    print(f"Built {role}: {target}")


def main():
    if not RIGGED_SOURCE.is_file():
        raise FileNotFoundError(f"Expected Mixamo rig: {RIGGED_SOURCE}")
    for role, profile in CAST.items():
        source = MAKEHUMAN_SOURCE / f"{role}.obj"
        if role != "player-commander" and not source.is_file():
            raise FileNotFoundError(f"Expected MakeHuman source: {source}")
        build(role, profile)


if __name__ == "__main__":
    main()
