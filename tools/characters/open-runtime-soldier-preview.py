"""Open an interactive Blender preview matching the runtime character setup."""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets/models/characters/core/soldier-base.glb"
MOTION = ROOT / "assets/models/characters/animation/character-motion.glb"
WORLD_SCALE = 1.82 / 184.094467

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

bpy.ops.import_scene.gltf(filepath=str(BASE))
base_objects = set(bpy.context.scene.objects)
base_rig = next(obj for obj in base_objects if obj.type == "ARMATURE")

preview_root = bpy.data.objects.new("Runtime_Character_Height_1_82m", None)
bpy.context.scene.collection.objects.link(preview_root)
for obj in base_objects:
    if obj.parent is None:
        obj.parent = preview_root
preview_root.scale = (WORLD_SCALE,) * 3

before_motion = set(bpy.context.scene.objects)
before_actions = set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=str(MOTION))
motion_objects = set(bpy.context.scene.objects) - before_motion
motion_actions = set(bpy.data.actions) - before_actions

for action in motion_actions:
    for curve in list(action.fcurves):
        if not curve.data_path.endswith("rotation_quaternion"):
            action.fcurves.remove(curve)

idle = next(action for action in motion_actions if action.name.startswith("idle_"))
base_rig.animation_data_create()
base_rig.animation_data.action = idle
bpy.context.scene.frame_set(30)

for obj in motion_objects:
    bpy.data.objects.remove(obj, do_unlink=True)

bpy.ops.object.select_all(action="DESELECT")
for obj in base_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = base_rig

for area in bpy.context.screen.areas:
    if area.type != "VIEW_3D":
        continue
    region = next((item for item in area.regions if item.type == "WINDOW"), None)
    if region:
        with bpy.context.temp_override(area=area, region=region):
            bpy.ops.view3d.view_selected(use_all_regions=False)

print("Runtime soldier preview ready: 1.82m, rotation-only animation")
