from pathlib import Path
import bpy


ROOT = Path(__file__).resolve().parents[1]
SOLDIER = ROOT / "tools/raw-character/donor/russian-soldier/soldier.fbx"
MIXAMO = ROOT / "tools/raw-character/mixamo/player-commander-rigged.fbx"
ANIMATION_ARCHIVE = ROOT.parents[1] / "Universal Animation Library[Standard].zip"
ANIMATION_TREE = ROOT / "tools/raw-character/quaternius-standard/Universal Animation Library[Standard]"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


assert SOLDIER.is_file(), f"missing downloaded soldier: {SOLDIER}"
assert MIXAMO.is_file(), f"missing Mixamo auto-rig: {MIXAMO}"
assert ANIMATION_ARCHIVE.is_file(), f"animation archive must be preserved: {ANIMATION_ARCHIVE}"
assert ANIMATION_TREE.is_dir(), f"extracted animation library must be preserved: {ANIMATION_TREE}"

clear_scene()
bpy.ops.import_scene.fbx(filepath=str(SOLDIER))
soldier_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
assert len(soldier_meshes) >= 8, f"downloaded soldier must include body/clothing/equipment meshes, got {len(soldier_meshes)}"
soldier_mesh_count = len(soldier_meshes)
soldier_vertex_count = sum(len(obj.data.vertices) for obj in soldier_meshes)
assert soldier_vertex_count >= 5_000, "downloaded soldier geometry is incomplete"
assert all(obj.data.materials for obj in soldier_meshes), "soldier mesh without material"

clear_scene()
bpy.ops.import_scene.fbx(filepath=str(MIXAMO))
armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
assert len(armatures) == 1, f"Mixamo source must contain exactly one armature, got {len(armatures)}"
assert len(armatures[0].data.bones) >= 60, f"Mixamo humanoid skeleton is incomplete: {len(armatures[0].data.bones)} bones"

print(
    "single-soldier-source-check: PASS",
    f"soldier_meshes={soldier_mesh_count}",
    f"soldier_vertices={soldier_vertex_count}",
    f"mixamo_bones={len(armatures[0].data.bones)}",
)
