from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor.glb"
REQUIRED = {
    "wardrobe_jacket", "wardrobe_trousers", "wardrobe_boot_left",
    "wardrobe_boot_right", "wardrobe_belt", "wardrobe_headgear",
    "wardrobe_role_kit",
}

assert TARGET.is_file(), "normalized donor GLB is missing"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(TARGET))
meshes = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
assert REQUIRED <= meshes.keys(), f"missing donor pieces: {sorted(REQUIRED - meshes.keys())}"
assert all(len(mesh.data.vertices) >= 24 for mesh in meshes.values()), "primitive or empty donor piece"
assert sum(len(mesh.data.polygons) for mesh in meshes.values()) * 2 <= 40_000, "donor exceeds triangle budget"
assert all(mesh.data.materials for mesh in meshes.values()), "donor piece lacks material"
assert any(material.use_nodes for mesh in meshes.values() for material in mesh.data.materials), "PBR nodes missing"
print("verify-wwii-donor: PASS")
