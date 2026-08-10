from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor.glb"
PROOF = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor-proof.png"
REQUIRED = {
    "wardrobe_jacket", "wardrobe_trousers", "wardrobe_boot_left",
    "wardrobe_boot_right", "wardrobe_belt", "wardrobe_headgear",
    "wardrobe_role_kit",
}

assert TARGET.is_file(), "normalized donor GLB is missing"
assert PROOF.is_file() and PROOF.stat().st_size > 8_000, "CPU visual proof is missing"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(TARGET))
meshes = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
assert REQUIRED <= meshes.keys(), f"missing donor pieces: {sorted(REQUIRED - meshes.keys())}"
assert all(len(mesh.data.vertices) >= 24 for mesh in meshes.values()), "primitive or empty donor piece"
assert sum(len(mesh.data.polygons) for mesh in meshes.values()) * 2 <= 40_000, "donor exceeds triangle budget"
assert all(mesh.data.materials for mesh in meshes.values()), "donor piece lacks material"
assert any(material.use_nodes for mesh in meshes.values() for material in mesh.data.materials), "PBR nodes missing"
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
print("verify-wwii-donor: PASS")
