"""Build the licensed Vardan male character GLB with Blender 4.2 LTS.

Run from the repository root with Blender's background executable:

    blender.exe --background --python tools/characters/build-vardan-men.py

The raw MakeHuman/Mixamo inputs are intentionally gitignored. The generated
GLB is the only character binary that belongs in version control.
"""

import json
import math
import re
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from character_build_math import maximum_planar_travel_metres


ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools" / "raw-character" / "mixamo"
OUT = ROOT / "assets" / "models" / "characters" / "vardan-men.glb"
TARGET_HEIGHT_METRES = 1.78
MAX_TEXTURE_EDGE = 2048
SOURCE_FPS = 30
IN_PLACE_CLIPS = {"walk", "run"}
MAX_HORIZONTAL_ROOT_TRAVEL_METRES = 0.03
BONE_PATH = re.compile(r'pose\.bones\["([^"]+)"\]')
CLIPS = {
    "idle.fbx": "idle",
    "walking.fbx": "walk",
    "running.fbx": "run",
    "pointing.fbx": "point",
    "talking.fbx": "radio",
    "sitting-idle.fbx": "driver-sit",
    "standing-react-small-from-right.fbx": "brace",
}


def clear_scene():
    """Remove the startup scene and stale animation data."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    bpy.context.scene.render.fps = SOURCE_FPS
    bpy.context.scene.render.fps_base = 1.0


def require_inputs():
    """Fail early with the exact set of manually acquired FBX files."""
    required = [RAW / "t-pose-with-skin.fbx"] + [RAW / name for name in CLIPS]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
    if missing:
        formatted = "\n  - ".join(missing)
        raise FileNotFoundError(f"Missing licensed character inputs:\n  - {formatted}")


def import_fbx(path):
    """Import one FBX and return only objects created by that import."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(
        filepath=str(path),
        automatic_bone_orientation=False,
        use_anim=True,
    )
    return list(set(bpy.data.objects) - before)


def find_armature(objects, source):
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one armature in {source}, found {len(armatures)}")
    return armatures[0]


def rename_action(objects, name):
    """Retain the imported armature action under the runtime clip name."""
    armature = find_armature(objects, name)
    if not armature.animation_data or not armature.animation_data.action:
        raise RuntimeError(f"Animation FBX for {name} has no active action")
    action = armature.animation_data.action
    action.name = name
    action.use_fake_user = True
    return armature, action


def normalized_bone_name(name):
    """Normalize both `mixamorigBone` and `mixamorig:Bone` spellings."""
    suffix = name.rsplit(":", 1)[-1]
    if suffix.lower().startswith("mixamorig"):
        suffix = suffix[len("mixamorig"):]
    return re.sub(r"[^a-z0-9]", "", suffix.lower())


def resolve_bone_name(armature, requested):
    """Resolve one unique hero bone without depending on a Mixamo namespace."""
    if requested in armature.data.bones:
        return requested
    wanted = normalized_bone_name(requested)
    candidates = [
        bone.name
        for bone in armature.data.bones
        if normalized_bone_name(bone.name) == wanted
    ]
    if len(candidates) != 1:
        inventory = ", ".join(sorted(bone.name for bone in armature.data.bones))
        raise RuntimeError(
            f"Could not uniquely resolve Mixamo bone {requested!r}; "
            f"matches={candidates}; available={inventory}"
        )
    return candidates[0]


def retarget_action_paths(action, hero_armature):
    """Rewrite imported FCurve targets to the exact hero-rig bone spelling."""
    for curve in action.fcurves:
        match = BONE_PATH.search(curve.data_path)
        if not match:
            continue
        source_name = match.group(1)
        hero_name = resolve_bone_name(hero_armature, source_name)
        if source_name != hero_name:
            curve.data_path = (
                curve.data_path[:match.start(1)]
                + hero_name
                + curve.data_path[match.end(1):]
            )


def validate_action_compatibility(action, hero_armature):
    """Reject every animation FCurve that targets a bone absent from the hero."""
    if not action.fcurves:
        raise RuntimeError(f"Animation {action.name} contains no FCurves")
    hero_names = {bone.name for bone in hero_armature.data.bones}
    missing = set()
    for curve in action.fcurves:
        match = BONE_PATH.search(curve.data_path)
        if match and match.group(1) not in hero_names:
            missing.add(match.group(1))
    if missing:
        raise RuntimeError(
            f"Animation {action.name} targets missing hero bones: {sorted(missing)}"
        )


def validate_in_place(action, hero_armature):
    """Evaluate world-space Hips motion so runtime translation is not doubled."""
    scene = bpy.context.scene
    hips_name = resolve_bone_name(hero_armature, "Hips")
    previous_frame = scene.frame_current
    hero_armature.animation_data_create()
    previous_action = hero_armature.animation_data.action
    sampled_xy = []
    start = math.ceil(action.frame_range[0])
    end = math.floor(action.frame_range[1])
    try:
        hero_armature.animation_data.action = action
        for frame in range(start, end + 1):
            scene.frame_set(frame)
            dependency_graph = bpy.context.evaluated_depsgraph_get()
            evaluated_armature = hero_armature.evaluated_get(dependency_graph)
            evaluated_hips = evaluated_armature.pose.bones.get(hips_name)
            if evaluated_hips is None:
                raise RuntimeError(
                    f"Evaluated rig is missing Hips bone {hips_name!r}"
                )
            world_position = (
                evaluated_armature.matrix_world @ evaluated_hips.matrix.translation
            )
            sampled_xy.append((world_position.x, world_position.y))
        travel_metres = maximum_planar_travel_metres(
            sampled_xy,
            scene.unit_settings.scale_length,
        )
        if travel_metres > MAX_HORIZONTAL_ROOT_TRAVEL_METRES:
            raise RuntimeError(
                f"Animation {action.name} is not In Place: world-space Hips "
                f"travel is {travel_metres:.4f}m"
            )
    finally:
        hero_armature.animation_data.action = previous_action
        scene.frame_set(previous_frame)


def validate_action_timing(action, hero_armature):
    """Require baked integer-frame clips in the project's 30 FPS timeline."""
    if bpy.context.scene.render.fps != SOURCE_FPS:
        raise RuntimeError(f"Scene must use {SOURCE_FPS} FPS")
    start, end = action.frame_range
    if end - start < 1:
        raise RuntimeError(f"Animation {action.name} has no usable duration")
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            frame = point.co.x
            if not math.isclose(frame, round(frame), abs_tol=0.001):
                raise RuntimeError(
                    f"Animation {action.name} has a non-30-FPS key at frame {frame}"
                )
    if action.name in IN_PLACE_CLIPS:
        validate_in_place(action, hero_armature)


def remove_imported_objects(objects):
    """Delete duplicate clip rigs/meshes after retaining their actions."""
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)


def create_binoculars_action(armature, idle_action):
    """Derive the binocular pose from idle using the approved Mixamo bones."""
    action = idle_action.copy()
    action.name = "binoculars"
    action.use_fake_user = True
    armature.animation_data_create()
    armature.animation_data.action = action
    pose = {
        "LeftArm": (0.15, 0.2, -0.85),
        "LeftForeArm": (0.0, -1.35, -0.15),
        "RightArm": (-0.15, -0.2, 0.85),
        "RightForeArm": (0.0, 1.35, 0.15),
    }
    for requested_name, rotation in pose.items():
        bone_name = resolve_bone_name(armature, requested_name)
        bone = armature.pose.bones[bone_name]
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = rotation
        bone.keyframe_insert("rotation_euler", frame=1, group=bone_name)
        bone.keyframe_insert("rotation_euler", frame=30, group=bone_name)
    if hasattr(action, "use_frame_range"):
        action.use_frame_range = True
        action.frame_start = 1
        action.frame_end = 30
    return action


def keep_only_actions(actions):
    """Remove the detached T-pose action and any accidental ninth clip."""
    keep = set(actions.values())
    for action in list(bpy.data.actions):
        if action not in keep:
            bpy.data.actions.remove(action)


def stash_actions(armature, actions):
    """Associate every desired action with the exported hero through NLA."""
    armature.animation_data_create()
    armature.animation_data.action = None
    tracks = armature.animation_data.nla_tracks
    while len(tracks):
        tracks.remove(tracks[0])
    cursor = 1
    for name in [*CLIPS.values(), "binoculars"]:
        action = actions[name]
        track = tracks.new()
        track.name = f"__stash__{name}"
        strip = track.strips.new(name, cursor, action)
        strip.name = name
        track.mute = True
        cursor += max(2, math.ceil(action.frame_range[1] - action.frame_range[0]) + 10)
    associated = {strip.action for track in tracks for strip in track.strips}
    if associated != set(actions.values()):
        raise RuntimeError("Not all runtime actions are associated with the hero NLA")


def limit_texture_resolution():
    """Downscale imported textures without changing their aspect ratio."""
    for image in bpy.data.images:
        width, height = image.size
        longest = max(width, height)
        if not width or not height or longest <= MAX_TEXTURE_EDGE:
            continue
        scale = MAX_TEXTURE_EDGE / longest
        image.scale(max(1, round(width * scale)), max(1, round(height * scale)))


def world_mesh_bounds(objects):
    points = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        raise RuntimeError("The skinned FBX contains no mesh bounds")
    minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return minimum, maximum


def normalize_character(objects):
    """Centre the rig, ground its feet, and scale it to an adult male height.

    Mixamo's Blender import faces -Y. Blender's glTF Y-up conversion maps that
    forward direction to +Z, which is the runtime character-forward contract.
    """
    root = bpy.data.objects.new("VardanCharacterRoot", None)
    bpy.context.scene.collection.objects.link(root)
    root["runtimeForward"] = "+Z"
    root["requiresVisualForwardCheck"] = True
    root["sourceFPS"] = SOURCE_FPS
    root["locomotion"] = "in-place"
    imported = set(objects)
    for obj in objects:
        if obj.parent not in imported:
            matrix_world = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = matrix_world

    bpy.context.view_layer.update()
    minimum, maximum = world_mesh_bounds(objects)
    height = maximum.z - minimum.z
    if height <= 0:
        raise RuntimeError("Character mesh height must be positive")
    uniform_scale = TARGET_HEIGHT_METRES / height
    root.scale = (uniform_scale,) * 3
    bpy.context.view_layer.update()

    minimum, maximum = world_mesh_bounds(objects)
    root.location += Vector((
        -(minimum.x + maximum.x) * 0.5,
        -(minimum.y + maximum.y) * 0.5,
        -minimum.z,
    ))
    bpy.context.view_layer.update()
    return root


def validate_scene(hero_objects, actions):
    """Catch rig, clip, orientation-scale, and embedding mistakes pre-export."""
    expected = set(CLIPS.values()) | {"binoculars"}
    if set(actions) != expected:
        raise RuntimeError(f"Unexpected action set: {sorted(actions)}")
    if {action.name for action in bpy.data.actions} != expected:
        raise RuntimeError("Blender data contains an unintended ninth action")
    meshes = [obj for obj in hero_objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("Character export requires at least one skinned mesh")
    if not any(mod.type == "ARMATURE" for mesh in meshes for mod in mesh.modifiers):
        raise RuntimeError("Character mesh is not bound to an armature")
    minimum, maximum = world_mesh_bounds(hero_objects)
    height = maximum.z - minimum.z
    if not math.isclose(minimum.z, 0.0, abs_tol=0.002):
        raise RuntimeError(f"Character feet are not grounded: z={minimum.z:.5f}")
    if not 1.65 <= height <= 1.95:
        raise RuntimeError(f"Character height is outside contract: {height:.3f}m")


def exported_glb_json():
    data = OUT.read_bytes()
    if data[:4] != b"glTF" or len(data) < 20:
        raise RuntimeError("Blender did not produce a valid GLB")
    version, declared_length = struct.unpack_from("<II", data, 4)
    json_length, json_type = struct.unpack_from("<II", data, 12)
    if version != 2 or declared_length != len(data) or json_type != 0x4E4F534A:
        raise RuntimeError("Exported GLB header or JSON chunk is invalid")
    return json.loads(data[20:20 + json_length].decode("utf-8").strip())


def validate_exported_glb():
    """Verify Blender actually exported all and only the runtime clips."""
    document = exported_glb_json()
    expected = set(CLIPS.values()) | {"binoculars"}
    animations = document.get("animations", [])
    names = [animation.get("name") for animation in animations]
    if len(names) != len(expected) or set(names) != expected:
        raise RuntimeError(f"Exported animation set is wrong: {names}")
    for animation in animations:
        if not animation.get("channels") or not animation.get("samplers"):
            raise RuntimeError(
                f"Exported animation {animation.get('name')} has no usable data"
            )


def export_glb(root):
    """Export one self-contained GLB with all named Actions."""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_nla_strips=True,
        export_skins=True,
        export_morph=True,
        export_yup=True,
        export_image_format="WEBP",
        export_texture_dir="",
        export_extras=True,
        export_cameras=False,
        export_lights=False,
    )


def main():
    clear_scene()
    require_inputs()
    hero_objects = import_fbx(RAW / "t-pose-with-skin.fbx")
    hero_armature = find_armature(hero_objects, "t-pose-with-skin.fbx")
    t_pose_action = (
        hero_armature.animation_data.action
        if hero_armature.animation_data
        else None
    )
    hero_armature.animation_data_clear()
    if t_pose_action:
        bpy.data.actions.remove(t_pose_action)
    imported_actions = {}
    for filename, clip_name in CLIPS.items():
        clip_objects = import_fbx(RAW / filename)
        _, action = rename_action(clip_objects, clip_name)
        retarget_action_paths(action, hero_armature)
        validate_action_compatibility(action, hero_armature)
        validate_action_timing(action, hero_armature)
        imported_actions[clip_name] = action
        remove_imported_objects(clip_objects)

    hero_armature.animation_data_create()
    hero_armature.animation_data.action = imported_actions["idle"]
    imported_actions["binoculars"] = create_binoculars_action(
        hero_armature, imported_actions["idle"]
    )
    validate_action_compatibility(imported_actions["binoculars"], hero_armature)
    validate_action_timing(imported_actions["binoculars"], hero_armature)
    keep_only_actions(imported_actions)
    stash_actions(hero_armature, imported_actions)
    limit_texture_resolution()
    root = normalize_character(hero_objects)
    validate_scene(hero_objects, imported_actions)
    export_glb(root)
    validate_exported_glb()
    print(f"Built {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
