"""Render a 4-panel wardrobe turntable contact sheet for one character."""

from math import radians, sin, cos
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[2]
PANEL_SIZE = 512
PANEL_PANELS = 4
ROLE = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "player-commander"

SOURCE = ROOT / "assets" / "models" / "characters" / "core" / f"{ROLE}.glb"
OUTPUT = ROOT / "tools" / "previews" / "wardrobe" / f"{ROLE}-contact-sheet.png"
TEMP_DIR = ROOT / "tools" / "previews" / "wardrobe"


def clear_scene():
    for scene_object in list(bpy.data.objects):
        bpy.data.objects.remove(scene_object, do_unlink=True)


def character_meshes():
    meshes = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and any(mod.type == "ARMATURE" for mod in obj.modifiers)
    ]
    tagged = [obj for obj in meshes if obj.get("shared_character_geometry") is True]
    return tagged or meshes


def character_bounds(objects):
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    minimum = Vector((min(point[0] for point in corners), min(point[1] for point in corners), min(point[2] for point in corners)))
    maximum = Vector((max(point[0] for point in corners), max(point[1] for point in corners), max(point[2] for point in corners)))
    return minimum, maximum


def orthographic_camera(center, size, yaw_deg, distance):
    yaw = radians(yaw_deg)
    position = Vector((
        center.x + sin(yaw) * distance,
        center.y + cos(yaw) * distance,
        center.z + size * 0.25,
    ))
    bpy.ops.object.camera_add(location=position)
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = size * 1.3
    camera.data.clip_start = max(size * 0.001, 0.000001)
    camera.data.clip_end = max(distance * 20, 10.0)
    target = center + Vector((0, 0, size * 0.05))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    return camera


def add_lights(center, size):
    bpy.ops.object.light_add(type="AREA", location=center + Vector((size, -size * 1.2, size * 1.25)))
    soft = bpy.context.object
    soft.data.energy = 850
    soft.data.shape = "DISK"
    soft.data.size = size * 2.4

    bpy.ops.object.light_add(type="AREA", location=center + Vector((-size, size * 0.5, size * 0.9)))
    hard = bpy.context.object
    hard.data.energy = 520
    hard.data.shape = "DISK"
    hard.data.size = size * 1.5

    hard.rotation_euler = (center - hard.location).to_track_quat("-Z", "Y").to_euler()
    soft.rotation_euler = (center - soft.location).to_track_quat("-Z", "Y").to_euler()


def apply_stress_pose(armature):
    offsets = {"LeftArm": 0.9, "RightArm": -0.9, "LeftUpLeg": 0.7, "RightUpLeg": -0.7}
    originals = {}
    for bone_name, angle in offsets.items():
        bone = next((candidate for candidate in armature.pose.bones if candidate.name.endswith(bone_name)), None)
        if bone is None:
            continue
        originals[bone.name] = bone.matrix_basis.copy()
        bone.matrix_basis = Matrix.Rotation(angle, 4, "X") @ bone.matrix_basis
    bpy.context.view_layer.update()
    return originals


def restore_pose(armature, originals):
    for bone_name, matrix in originals.items():
        armature.pose.bones[bone_name].matrix_basis = matrix
    bpy.context.view_layer.update()


def render_panel(filepath, camera):
    scene = bpy.context.scene
    scene.camera = camera
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.color = (0.09, 0.10, 0.08)
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 2
    scene.render.resolution_x = PANEL_SIZE
    scene.render.resolution_y = PANEL_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(filepath)
    bpy.ops.render.render(write_still=True)


def blend_panels(panel_paths, output):
    panel_data = []
    for path in panel_paths:
        image = bpy.data.images.load(str(path))
        image.pack()
        panel_data.append(image)
    width = PANEL_SIZE * PANEL_PANELS
    height = PANEL_SIZE
    sheet = bpy.data.images.new("wardrobe-contact-sheet", width=width, height=height, alpha=False, float_buffer=False)
    sheet.pixels = [0.0] * (width * height * 4)
    pixels = list(sheet.pixels)
    for panel_index, image in enumerate(panel_data):
        src = list(image.pixels)
        for y in range(PANEL_SIZE):
            for x in range(PANEL_SIZE):
                source = (y * PANEL_SIZE + x) * 4
                target = (y * width + panel_index * PANEL_SIZE + x) * 4
                pixels[target:target + 4] = src[source:source + 4]
        bpy.data.images.remove(image)
    sheet.pixels = pixels
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.filepath_raw = str(output)
    sheet.file_format = "PNG"
    sheet.save()
    bpy.data.images.remove(sheet)


def main():
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    meshes = character_meshes()
    body_armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    low, high = character_bounds(meshes)
    center = (low + high) * 0.5
    span = max(high.x - low.x, high.y - low.y, high.z - low.z)
    distance = span * 2.8

    add_lights(center, span)
    scene = bpy.context.scene
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.color = (0.09, 0.10, 0.08)

    panel_paths = []
    panels = [
        (0, "front"),
        (45, "three_quarter"),
        (90, "side"),
        "stress",
    ]
    for index, panel in enumerate(panels):
        camera = orthographic_camera(center, span, panel if isinstance(panel, (int, float)) else 60, distance)
        if panel == "stress":
            pose_back = apply_stress_pose(body_armature)
            output_path = TEMP_DIR / f"{ROLE}-panel-{index}.png"
            render_panel(output_path, camera)
            restore_pose(body_armature, pose_back)
        else:
            output_path = TEMP_DIR / f"{ROLE}-panel-{index}.png"
            render_panel(output_path, camera)
        panel_paths.append(output_path)
    blend_panels(panel_paths, OUTPUT)
    print(f"Rendered contact sheet: {OUTPUT}")


if __name__ == "__main__":
    main()
