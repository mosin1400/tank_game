"""Reject animation output that stretches or dislocates the Mixamo character."""

from pathlib import Path
import re
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/models/characters/core/soldier-base.glb"
MOTION = ROOT / "assets/models/characters/animation/character-motion.glb"
SAMPLES = {"idle", "walk", "run", "rifle-walk", "aim", "point", "hit-react", "repair", "driver-sit", "fall"}


def name(action):
    return re.sub(r"_soldier_mixamo_rig(?:\.\d+)?$", "", action.name).split("|")[-1]


def world_bounds(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = [obj.evaluated_get(depsgraph) for obj in objects]
    points = [obj.matrix_world @ Vector(corner) for obj in evaluated for corner in obj.bound_box]
    low = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    return low, high


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(BASE))
rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
base_objects = set(bpy.context.scene.objects)
base_bones = {bone.name for bone in rig.data.bones}
low, high = world_bounds(meshes)
rest_height = high.z - low.z
before_actions = set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=str(MOTION))
actions = {name(action): action for action in bpy.data.actions if action not in before_actions}
motion_rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE" and obj not in base_objects)
assert {bone.name for bone in motion_rig.data.bones} == base_bones, "motion and model skeletons differ"
for obj in list(bpy.context.scene.objects):
    if obj not in base_objects:
        bpy.data.objects.remove(obj, do_unlink=True)

rig.animation_data_create()
for clip in SAMPLES:
    action = actions[clip]
    rig.animation_data.action = action
    first, last = action.frame_range
    for fraction in (0.0, 0.5, 1.0):
        bpy.context.scene.frame_set(round(first + (last-first)*fraction))
        bpy.context.view_layer.update()
        posed_low, posed_high = world_bounds(meshes)
        span = posed_high - posed_low
        assert all(value == value for value in (*posed_low, *posed_high)), f"{clip}: non-finite pose bounds"
        assert max(span) < rest_height * 1.65, f"{clip}: exploded mesh span {tuple(round(v,2) for v in span)}"
        assert span.z > rest_height * .25, f"{clip}: character collapsed vertically ({span.z:.2f})"
        if clip == "repair":
            assert span.z > rest_height * .75, f"repair: mechanic must remain standing ({span.z:.2f})"

print("verify-motion-pose-quality: PASS sampled=10 bounds=human")
