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
        assert principled.inputs["Base Color"].is_linked and principled.inputs["Base Color"].links[0].from_node.type == "TEX_IMAGE", f"{material.name} diffuse image is unbound"
        roughness = principled.inputs["Roughness"].links[0].from_node if principled.inputs["Roughness"].is_linked else None
        metallic = principled.inputs["Metallic"].links[0].from_node if principled.inputs["Metallic"].is_linked else None
        assert roughness and roughness.type in {"TEX_IMAGE", "SEPARATE_COLOR"}, f"{material.name} roughness image is unbound"
        assert metallic and metallic.type in {"TEX_IMAGE", "SEPARATE_COLOR"}, f"{material.name} metallic image is unbound"
        normal = principled.inputs["Normal"].links[0].from_node if principled.inputs["Normal"].is_linked else None
        assert normal and normal.type == "NORMAL_MAP" and normal.inputs["Color"].is_linked and normal.inputs["Color"].links[0].from_node.type == "TEX_IMAGE", f"{material.name} normal image is unbound"
        image_names = {node.image.name.lower() for node in nodes if node.type == "TEX_IMAGE" and node.image}
        assert len(image_names) >= 3, f"{material.name} lacks diffuse plus derived normal/roughness/metallic images"
        assert not any("hhl_01" in name or "mouth_co" in name for name in image_names), f"{material.name} retains body or mouth atlas"
        generated = material.get("generated_pbr_files")
        assert generated, f"{material.name} lacks authorized generated-PBR provenance"
        expected_paths = [PBR_ROOT / name for name in generated.split("|")]
        assert all(path.is_file() and path.stat().st_size > 1_000 for path in expected_paths), f"{material.name} generated-PBR files are missing"
        assert all("__derived_" in path.name for path in expected_paths), f"{material.name} PBR maps are not named as derived maps"
print("verify-wwii-donor: PASS")
