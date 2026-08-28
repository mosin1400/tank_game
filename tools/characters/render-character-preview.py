"""Render a neutral diagnostic preview of a built character GLB."""

from pathlib import Path
import sys

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
role = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "player-commander"
source = ROOT / "assets" / "models" / "characters" / "core" / f"{role}.glb"
target = ROOT / "tools" / "previews" / f"{role}.png"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))

body = next(
    obj for obj in bpy.context.scene.objects
    if obj.type == "MESH" and any(mod.type == "ARMATURE" for mod in obj.modifiers)
    and not obj.name.startswith("outfit_")
)
corners = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
minimum = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
maximum = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
center = (minimum + maximum) * 0.5
height = max(maximum.z - minimum.z, maximum.y - minimum.y, maximum.x - minimum.x)

bpy.ops.object.camera_add(location=center + Vector((height * 1.25, -height * 2.4, height * 0.25)))
camera = bpy.context.object
camera.data.lens = 58
camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=center + Vector((height, -height, height * 1.6)))
bpy.context.object.data.energy = 900
bpy.context.object.data.shape = "DISK"
bpy.context.object.data.size = height * 2.0
bpy.ops.object.light_add(type="AREA", location=center + Vector((-height, height, height * 0.6)))
bpy.context.object.data.energy = 550
bpy.context.object.data.size = height * 1.4
bpy.context.object.rotation_euler = (center - bpy.context.object.location).to_track_quat("-Z", "Y").to_euler()

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.cycles.use_denoising = False
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.world.color = (0.035, 0.04, 0.03)
target.parent.mkdir(parents=True, exist_ok=True)
scene.render.filepath = str(target)
bpy.ops.render.render(write_still=True)
print(f"Rendered {target}")
