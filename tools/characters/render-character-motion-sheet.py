"""Render five representative animation poses as a visual deformation gate."""

from pathlib import Path
from math import radians, sin, cos
import re
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets/models/characters/core/soldier-base.glb"
MOTION = ROOT / "assets/models/characters/animation/character-motion.glb"
OUTPUT = ROOT / "tools/previews/wardrobe/soldier-motion-contact-sheet.png"
TEMP = ROOT / "tools/previews/wardrobe/motion-panels"
PANELS = (("idle", 30), ("walk", 15), ("run", 10), ("aim", 25), ("fall", 60))
SIZE = 320


def bounds(objects):
    points = [o.matrix_world @ Vector(c) for o in objects for c in o.bound_box]
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    return lo, hi


def add_camera(center, span):
    yaw = radians(28)
    position = center + Vector((sin(yaw) * span * 2.8, cos(yaw) * span * 2.8, span * 0.14))
    bpy.ops.object.camera_add(location=position)
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.22
    camera.rotation_euler = (center - position).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera


def add_light(center, span, offset, energy):
    bpy.ops.object.light_add(type="AREA", location=center + Vector(tuple(v * span for v in offset)))
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = span * 1.5
    light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()


def render(path):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 2
    scene.cycles.use_denoising = False
    scene.render.resolution_x = SIZE
    scene.render.resolution_y = SIZE
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    scene.render.film_transparent = False
    bpy.ops.render.render(write_still=True)


def combine(paths):
    width = SIZE * len(paths)
    sheet = bpy.data.images.new("motion-sheet", width=width, height=SIZE, alpha=False)
    target = [0.0] * (width * SIZE * 4)
    for panel_index, path in enumerate(paths):
        image = bpy.data.images.load(str(path), check_existing=False)
        source = list(image.pixels)
        for row in range(SIZE):
            source_start = row * SIZE * 4
            target_start = (row * width + panel_index * SIZE) * 4
            target[target_start:target_start + SIZE * 4] = source[source_start:source_start + SIZE * 4]
        bpy.data.images.remove(image)
    sheet.pixels = target
    sheet.filepath_raw = str(OUTPUT)
    sheet.file_format = "PNG"
    sheet.save()


def main():
    TEMP.mkdir(parents=True, exist_ok=True)
    bpy.ops.import_scene.gltf(filepath=str(BASE))
    base_rig = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    base_objects = list(bpy.context.scene.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(MOTION))
    motion_actions = [a for a in bpy.data.actions if a not in before_actions]
    for obj in list(bpy.context.scene.objects):
        if obj not in base_objects:
            bpy.data.objects.remove(obj, do_unlink=True)

    meshes = [o for o in base_objects if o.type == "MESH"]
    low, high = bounds(meshes)
    center = (low + high) * 0.5
    span = max(high.x-low.x, high.y-low.y, high.z-low.z)
    add_camera(center, span)
    add_light(center, span, (1.1, -1.2, 1.4), 1200)
    add_light(center, span, (-1.0, 0.6, 0.8), 800)
    world = bpy.data.worlds.new("motion-world")
    world.color = (0.16, 0.18, 0.13)
    bpy.context.scene.world = world
    base_rig.animation_data_create()

    paths = []
    for clip_name, frame in PANELS:
        action = next((a for a in motion_actions if re.sub(r"_soldier_(?:mixamo_)?rig(?:\.\d+)?$", "", a.name) == clip_name), None)
        if action is None:
            raise RuntimeError(f"missing action {clip_name}")
        base_rig.animation_data.action = action
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        path = TEMP / f"{clip_name}.png"
        render(path)
        paths.append(path)
    combine(paths)
    print(f"Rendered motion sheet: {OUTPUT}")


if __name__ == "__main__":
    main()
