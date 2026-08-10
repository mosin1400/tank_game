from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor.glb"
PROOF = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor-proof.png"
DONOR = ROOT / "tools/raw-character/donor/russian-soldier/soldier.fbx"
PBR_ROOT = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor-pbr"
REQUIRED = {
    "wardrobe_jacket", "wardrobe_trousers", "wardrobe_boot_left",
    "wardrobe_boot_right", "wardrobe_belt", "wardrobe_headgear",
    "wardrobe_role_kit",
}
AUTHORIZED_ATLASES = {
    "sov_soldier_0_co.png",
    "sov_eqipment_0_co.png",
    "sov_eqipment_1_co.png",
}
PBR_ROLES = ("normal", "roughness", "metallic")


def pixels_from_file(path):
    image = bpy.data.images.load(str(path), check_existing=False)
    try:
        assert tuple(image.size) == (256, 256), f"{path.name} is not a 256px derived map"
        image.colorspace_settings.name = "Non-Color"
        pixels = [0.0] * (image.size[0] * image.size[1] * 4)
        image.pixels.foreach_get(pixels)
        return pixels
    finally:
        bpy.data.images.remove(image)


authorized_files = {
    (atlas, role): PBR_ROOT / f"{Path(atlas).stem}__derived_{role}.png"
    for atlas in AUTHORIZED_ATLASES
    for role in PBR_ROLES
}
assert all(path.is_file() for path in authorized_files.values()), "authorized generated-PBR set is incomplete"
assert len({path.read_bytes() for path in authorized_files.values()}) == len(authorized_files), "authorized PBR maps are byte-identical"
authorized_pixels = {}
for (atlas, role), path in authorized_files.items():
    pixels = pixels_from_file(path)
    authorized_pixels[(atlas, role)] = pixels
    red, green, blue = pixels[0::4], pixels[1::4], pixels[2::4]
    assert max(red + green + blue) - min(red + green + blue) > .005, f"{path.name} contains blank or constant RGB data"
    if role == "normal":
        assert min(blue) > .9 and max(red) - min(red) > .002 and max(green) - min(green) > .002, f"{path.name} lacks diffuse-derived normal variation"
    else:
        assert max(abs(r - g) for r, g in zip(red, green)) < 1e-5 and max(abs(r - b) for r, b in zip(red, blue)) < 1e-5, f"{path.name} is not a scalar {role} map"

assert TARGET.is_file(), "normalized donor GLB is missing"
assert PROOF.is_file() and PROOF.stat().st_size > 8_000, "CPU visual proof is missing"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(DONOR))
source = max((obj for obj in bpy.context.scene.objects if obj.type == "MESH"), key=lambda obj: len(obj.data.polygons))
SOURCE_VERTICES = len(source.data.vertices)
SOURCE_POLYGONS = len(source.data.polygons)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(TARGET))
meshes = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
assert REQUIRED <= meshes.keys(), f"missing donor pieces: {sorted(REQUIRED - meshes.keys())}"
assert all(len(mesh.data.vertices) >= 24 for mesh in meshes.values()), "primitive or empty donor piece"
assert sum(len(mesh.data.polygons) for mesh in meshes.values()) * 2 <= 40_000, "donor exceeds triangle budget"
assert all(mesh.data.materials for mesh in meshes.values()), "donor piece lacks material"
assert any(material.use_nodes for mesh in meshes.values() for material in mesh.data.materials), "PBR nodes missing"


def bounds(mesh):
    points = [mesh.matrix_world @ Vector(corner) for corner in mesh.bound_box]
    return tuple((min(point[index] for point in points), max(point[index] for point in points)) for index in range(3))


def triangle_signatures(mesh):
    mesh.data.calc_loop_triangles()
    return {
        tuple(sorted(tuple(round(value, 5) for value in mesh.matrix_world @ mesh.data.vertices[index].co) for index in triangle.vertices))
        for triangle in mesh.data.loop_triangles
    }


def linked_source(socket, message):
    assert socket.is_linked and len(socket.links) == 1, message
    link = socket.links[0]
    return link.from_node, link.from_socket


def image_pixels(image):
    assert tuple(image.size) == (256, 256), f"{image.name} is not the authorized PBR resolution"
    pixels = [0.0] * (image.size[0] * image.size[1] * 4)
    image.pixels.foreach_get(pixels)
    return pixels


def channel_delta(actual, actual_channel, expected, expected_channel):
    return max(abs(actual[index + actual_channel] - expected[index + expected_channel]) for index in range(0, len(actual), 4))


for name in REQUIRED:
    mesh = meshes[name]
    assert len(mesh.data.vertices) < SOURCE_VERTICES * .8, f"{name} retains near-full donor vertices"
    assert len(mesh.data.polygons) < SOURCE_POLYGONS * .8, f"{name} retains near-full donor faces"
    assert mesh.get("donor_proof"), f"{name} lacks donor material/UV provenance"

assert meshes["wardrobe_belt"]["donor_proof"] == "sov_soldier_0_co brown belt-strap UV island", "belt proof is not the exact licensed atlas island"
assert meshes["wardrobe_role_kit"]["donor_proof"] == "sov_eqipment_0_co.png pouch UV island [0.285,0.258]-[0.586,0.600]", "kit proof is not the exact licensed atlas island"

signatures = {name: triangle_signatures(meshes[name]) for name in REQUIRED}
for name, own in signatures.items():
    for other, candidate in signatures.items():
        if name < other:
            assert not own & candidate, f"{name} duplicates donor faces in {other}"

vertical = {name: bounds(meshes[name])[2] for name in REQUIRED}
assert vertical["wardrobe_boot_left"][1] < 45 and vertical["wardrobe_boot_right"][1] < 45, "boots are not isolated to donor boot bounds"
assert vertical["wardrobe_trousers"][0] < 50 and vertical["wardrobe_trousers"][1] < 100, "trousers are not isolated to donor trouser bounds"
assert vertical["wardrobe_jacket"][0] > 75 and vertical["wardrobe_jacket"][1] > 145, "jacket is not isolated to donor jacket bounds"
assert 100 < vertical["wardrobe_belt"][0] < vertical["wardrobe_belt"][1] < 120, "belt is not isolated to donor belt bounds"
assert vertical["wardrobe_role_kit"][0] > 90 and vertical["wardrobe_role_kit"][1] < 125, "kit lacks component provenance bounds"
for mesh in meshes.values():
    for material in mesh.data.materials:
        assert material and material.use_nodes and material.node_tree, f"{mesh.name} lacks a node material"
        nodes = material.node_tree.nodes
        principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
        assert principled, f"{material.name} lacks Principled BSDF"
        diffuse, diffuse_output = linked_source(principled.inputs["Base Color"], f"{material.name} diffuse image is unbound")
        assert diffuse.type == "TEX_IMAGE" and diffuse_output.name == "Color", f"{material.name} diffuse does not use image color"
        normal, normal_output = linked_source(principled.inputs["Normal"], f"{material.name} normal map is unbound")
        assert normal.type == "NORMAL_MAP" and normal_output.name == "Normal", f"{material.name} normal input bypasses Normal Map"
        normal_image, normal_image_output = linked_source(normal.inputs["Color"], f"{material.name} normal image is unbound")
        assert normal_image.type == "TEX_IMAGE" and normal_image_output.name == "Color", f"{material.name} normal map lacks image color"
        roughness, roughness_output = linked_source(principled.inputs["Roughness"], f"{material.name} roughness image is unbound")
        metallic, metallic_output = linked_source(principled.inputs["Metallic"], f"{material.name} metallic image is unbound")
        if roughness.type == "SEPARATE_COLOR":
            assert roughness_output.name == "Green", f"{material.name} uses the wrong glTF roughness channel"
            roughness_image, roughness_image_output = linked_source(roughness.inputs["Color"], f"{material.name} packed roughness image is unbound")
            roughness_channel = 1
        else:
            assert roughness.type == "TEX_IMAGE" and roughness_output.name == "Color", f"{material.name} roughness lacks a direct or packed image"
            roughness_image, roughness_image_output, roughness_channel = roughness, roughness_output, 0
        if metallic.type == "SEPARATE_COLOR":
            assert metallic_output.name == "Blue", f"{material.name} uses the wrong glTF metallic channel"
            metallic_image, metallic_image_output = linked_source(metallic.inputs["Color"], f"{material.name} packed metallic image is unbound")
            metallic_channel = 2
        else:
            assert metallic.type == "TEX_IMAGE" and metallic_output.name == "Color", f"{material.name} metallic lacks a direct or packed image"
            metallic_image, metallic_image_output, metallic_channel = metallic, metallic_output, 0
        assert roughness_image.type == "TEX_IMAGE" and roughness_image_output.name == "Color", f"{material.name} roughness lacks an image source"
        assert metallic_image.type == "TEX_IMAGE" and metallic_image_output.name == "Color", f"{material.name} metallic lacks an image source"
        image_names = {node.image.name.lower() for node in nodes if node.type == "TEX_IMAGE" and node.image}
        assert len(image_names) >= 3, f"{material.name} lacks diffuse plus derived normal/roughness/metallic images"
        assert not any("hhl_01" in name or "mouth_co" in name for name in image_names), f"{material.name} retains body or mouth atlas"
        generated = material.get("generated_pbr_files")
        assert generated, f"{material.name} lacks authorized generated-PBR provenance"
        source_atlas = material.get("generated_pbr_source")
        assert source_atlas in AUTHORIZED_ATLASES, f"{material.name} names an unauthorized PBR source atlas"
        expected_names = [authorized_files[(source_atlas, role)].name for role in PBR_ROLES]
        assert generated.split("|") == expected_names, f"{material.name} generated-PBR roles do not match {source_atlas}"
        assert Path(source_atlas).stem.lower() in diffuse.image.name.lower(), f"{material.name} diffuse node does not match its authorized source atlas"
        normal_actual = image_pixels(normal_image.image)
        roughness_actual = image_pixels(roughness_image.image)
        metallic_actual = image_pixels(metallic_image.image)
        assert channel_delta(normal_actual, 0, authorized_pixels[(source_atlas, "normal")], 0) <= 1 / 255, f"{material.name} normal R is not the authorized generated map"
        assert channel_delta(normal_actual, 1, authorized_pixels[(source_atlas, "normal")], 1) <= 1 / 255, f"{material.name} normal G is not the authorized generated map"
        assert channel_delta(normal_actual, 2, authorized_pixels[(source_atlas, "normal")], 2) <= 1 / 255, f"{material.name} normal B is not the authorized generated map"
        assert channel_delta(roughness_actual, roughness_channel, authorized_pixels[(source_atlas, "roughness")], 0) <= 1 / 255, f"{material.name} roughness input is not the authorized generated map"
        assert channel_delta(metallic_actual, metallic_channel, authorized_pixels[(source_atlas, "metallic")], 0) <= 1 / 255, f"{material.name} metallic input is not the authorized generated map"
print("verify-wwii-donor: PASS")
