"""Combine compatible Mixamo motions and remove horizontal root motion."""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
MOTIONS = ROOT / "tools/raw-character/mixamo/motions"
OUTPUT = ROOT / "assets/models/characters/animation/character-motion.glb"

CLIP_FILES = {
    "idle": "Breathing Idle.fbx",
    "walk": "Walking (1).fbx",
    "run": "Running.fbx",
    "aim": "Rifle Aiming Idle.fbx",
    "fall": "Walking To Dying.fbx",
    "talk": "Breathing Idle.fbx",
    "point": "Pointing Forward.fbx",
    "repair": "Breathing Idle.fbx",
    "driver-sit": "Sitting.fbx",
    "rifle-reload": "Rifle Idle.fbx",
    "hit-react": "Walking Hit Reaction.fbx",
    "rifle-walk": "Rifle Run.fbx",
    "rifle-idle": "Rifle Idle.fbx",
    "stop-walk": "Stop Walking.fbx",
    "strafe-run": "Run Forward Right.fbx",
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def import_motion(path):
    before_objects = set(bpy.context.scene.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(path), use_anim=True)
    objects = [obj for obj in bpy.context.scene.objects if obj not in before_objects]
    rigs = [obj for obj in objects if obj.type == "ARMATURE"]
    actions = [action for action in bpy.data.actions if action not in before_actions]
    if len(rigs) != 1 or len(rigs[0].data.bones) != 65:
        raise RuntimeError(f"{path.name}: expected one 65-bone Mixamo rig")
    if rigs[0].data.bones.get("mixamorig:Hips") is None:
        raise RuntimeError(f"{path.name}: Mixamo hips is missing")
    if len(actions) != 1:
        raise RuntimeError(f"{path.name}: expected one action, got {len(actions)}")
    return rigs[0], objects, actions[0]


def zero_horizontal_root_motion(action):
    changed = 0
    for curve in action.fcurves:
        is_hips = 'pose.bones["mixamorig:Hips"].location' == curve.data_path
        is_object = curve.data_path == "location"
        # Mixamo FBX imports with its armature rotated: local X/Z are world-horizontal,
        # while local Y is character height and must retain the natural body bob.
        if (is_hips or is_object) and curve.array_index in (0, 2) and curve.keyframe_points:
            anchor = curve.keyframe_points[0].co.y
            for key in curve.keyframe_points:
                key.co.y = anchor
                key.handle_left.y = anchor
                key.handle_right.y = anchor
            curve.update()
            changed += 1
    if changed < 2:
        raise RuntimeError(f"{action.name}: horizontal root curves were not found")


def main():
    missing = sorted({filename for filename in CLIP_FILES.values() if not (MOTIONS / filename).is_file()})
    if missing:
        raise FileNotFoundError(f"missing downloaded Mixamo motions: {missing}")
    clear_scene()
    cache = {}
    export_rig = None
    imported_objects = []
    output_actions = []
    for clip_name, filename in CLIP_FILES.items():
        if filename not in cache:
            rig, objects, source_action = import_motion(MOTIONS / filename)
            imported_objects.extend(objects)
            cache[filename] = (rig, source_action)
            if export_rig is None:
                export_rig = rig
        source_action = cache[filename][1]
        action = source_action.copy()
        action.name = clip_name
        zero_horizontal_root_motion(action)
        output_actions.append(action)
    for obj in imported_objects:
        if obj is not export_rig and obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    for action in list(bpy.data.actions):
        if action not in output_actions:
            bpy.data.actions.remove(action)
    export_rig.name = "soldier_mixamo_rig"
    export_rig.data.name = "soldier_mixamo_skeleton"
    export_rig.animation_data_create()
    export_rig.animation_data.action = output_actions[0]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    export_rig.select_set(True)
    bpy.context.view_layer.objects.active = export_rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT), export_format="GLB", use_selection=True,
        export_skins=True, export_materials="NONE", export_yup=True,
        export_force_sampling=True, export_animation_mode="ACTIONS",
    )
    print(f"build-character-motion: PASS clips={len(output_actions)} bones=65 root_motion=zero output={OUTPUT}")


if __name__ == "__main__":
    main()
