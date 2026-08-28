"""Blender-side validation of the baked animation-only GLB."""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
MOTION = ROOT / "assets/models/characters/animation/character-motion.glb"
REQUIRED = {"idle", "walk", "run", "aim", "fall", "talk", "point", "repair", "driver-sit", "rifle-reload", "hit-react", "rifle-walk"}

if not MOTION.is_file():
    raise AssertionError("character-motion.glb is missing")
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(MOTION))
rigs = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
assert len(rigs) == 1, f"expected one motion armature, got {len(rigs)}"
rig = rigs[0]
assert len(rig.data.bones) == 65, f"motion skeleton must use 65 Mixamo bones, got {len(rig.data.bones)}"
assert rig.pose.bones.get("mixamorig:Hips"), "motion skeleton lacks Mixamo hips"
actions_by_name = {a.name.split("|")[-1].removesuffix("_soldier_mixamo_rig"): a for a in bpy.data.actions}
missing = REQUIRED - set(actions_by_name)
assert not missing, f"missing clips: {sorted(missing)}; got {sorted(actions_by_name)}"

def action_fingerprint(action):
    return tuple(
        (curve.data_path, curve.array_index, tuple(round(point.co.y, 5) for point in curve.keyframe_points))
        for curve in action.fcurves
    )

assert action_fingerprint(actions_by_name["repair"]) != action_fingerprint(actions_by_name["driver-sit"]), (
    "repair must be a standing mechanic action, not the seated driver clip"
)
for action in bpy.data.actions:
    assert action.frame_range[1] > action.frame_range[0], f"{action.name}: empty clip"
    rig.animation_data_create()
    rig.animation_data.action = action
    first, last = map(int, action.frame_range)
    bpy.context.scene.frame_set(first); bpy.context.view_layer.update()
    start = (rig.matrix_world @ rig.pose.bones["mixamorig:Hips"].head).copy()
    bpy.context.scene.frame_set(last); bpy.context.view_layer.update()
    end = (rig.matrix_world @ rig.pose.bones["mixamorig:Hips"].head).copy()
    horizontal = ((end.x-start.x)**2 + (end.y-start.y)**2) ** .5
    assert horizontal < .02, (
        f"{action.name}: root motion was not zeroed ({horizontal:.4f}); "
        f"delta=({end.x-start.x:.4f},{end.y-start.y:.4f},{end.z-start.z:.4f})"
    )
print(f"verify-character-motion: PASS clips={len(actions_by_name)} bones=65 root_motion=zero")
