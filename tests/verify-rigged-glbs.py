"""Run inside Blender: verify the built main cast has usable rigs and outfits."""

from pathlib import Path
import bpy


ROOT = Path(__file__).resolve().parents[1]
CAST = ("player-commander", "ramin", "saman", "nikan", "shahin-tali", "general-varen")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


for role in CAST:
    clear_scene()
    target = ROOT / "assets" / "models" / "characters" / "core" / f"{role}.glb"
    assert target.is_file() and target.stat().st_size > 500_000, f"missing or tiny: {target.name}"
    bpy.ops.import_scene.gltf(filepath=str(target))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    outfits = [obj for obj in meshes if obj.name.startswith("outfit_")]
    undershirts = [obj for obj in outfits if obj.name == "outfit_undershirt"]
    assert len(armatures) == 1 and len(armatures[0].data.bones) >= 60, f"bad rig: {role}"
    assert len(outfits) >= 8, f"incomplete outfit: {role}"
    assert len(undershirts) == 1, f"missing base garment: {role}"
    assert all(item.parent == armatures[0] and item.parent_type == "BONE" for item in outfits), f"unbound outfit: {role}"
    assert undershirts[0].parent_bone.endswith("Spine2"), f"undershirt not attached to Spine2: {role}"
    print(f"rigged GLB: PASS {role} ({len(armatures[0].data.bones)} bones, {len(outfits)} outfit parts)")
