from pathlib import Path
import bpy


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "assets/models/characters/core/soldier-base.glb"

assert TARGET.is_file(), f"shared soldier GLB is missing: {TARGET}"
for scene_object in list(bpy.data.objects):
    bpy.data.objects.remove(scene_object, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(TARGET))

armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
meshes = [
    obj
    for obj in bpy.context.scene.objects
    if obj.type == "MESH" and obj.name != "Icosphere"
]
assert len(armatures) == 1, f"expected one armature, got {len(armatures)}"
armature = armatures[0]
assert len(armature.data.bones) == 65, "shared soldier must use the 65-bone Mixamo skeleton"
assert armature.data.bones.get("mixamorig:Hips"), "Mixamo hips bone is missing"
assert armature.get("mixamo_skeleton") is True, "output does not declare Mixamo compatibility"
assert len(meshes) == 16, f"expected 16 body/clothing/equipment meshes, got {len(meshes)}"

skinned = [obj for obj in meshes if any(mod.type == "ARMATURE" and mod.object == armature for mod in obj.modifiers)]
rigid = [obj for obj in meshes if obj not in skinned]
assert len(skinned) == 16, f"all body/clothing/equipment meshes must follow the Mixamo rig, got {len(skinned)}"
assert len(rigid) == 0, f"detached equipment remains: {[obj.name for obj in rigid]}"
skinned_counts = sorted(len(obj.data.vertices) for obj in skinned)
rigid_counts = sorted(len(obj.data.vertices) for obj in rigid)
assert len(skinned_counts) == 16 and sum(skinned_counts) >= 7_000, f"skinned source geometry missing: {skinned_counts}"
assert not bpy.data.actions, "base character must not embed animation actions"

expected_material_images = {
    "Material.001": "sov_soldier_0_co",
    "Material.004": "sov_eqipment_0_co",
    "Material.005": "sov_eqipment_1_co",
    "Material.006": "sov_eqipment_1_co",
    "Material.007": "sov_eqipment_1_co",
    "Material.008": "sov_eqipment_0_co",
    "Material.009": "sov_eqipment_0_co",
    "Material.010": "sov_eqipment_0_co",
    "Material.011": "mouth_co",
    "Material.012": "hhl_01_co",
    "Default OBJ": "hhl_01_co",
}
for obj in meshes:
    for material in obj.data.materials:
        assert material and material.use_nodes and material.node_tree, f"{obj.name}: missing node material"
        images = [
            node.image.name.lower()
            for node in material.node_tree.nodes
            if node.type == "TEX_IMAGE" and node.image is not None
        ]
        expected = expected_material_images.get(material.name)
        assert expected, f"{obj.name}: unknown material mapping {material.name}"
        assert any(expected in image for image in images), (
            f"{obj.name}: {material.name} must use {expected}, got {images or ['NONE']}"
        )

for obj in skinned:
    for vertex in obj.data.vertices:
        weights = [item.weight for item in vertex.groups if item.weight > 0]
        assert weights, f"unweighted vertex in {obj.name}"
        assert abs(sum(weights) - 1.0) < 0.02, f"original weights changed in {obj.name}"

print(
    "verify-shared-soldier: PASS",
    f"meshes={len(meshes)}",
    f"bones={len(armature.data.bones)}",
    f"skinned={len(skinned)}",
    f"rigid={len(rigid)}",
)
