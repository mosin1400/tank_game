"""Run inside Blender: verify the built main cast has usable rigs and outfits."""

import argparse
from pathlib import Path
import sys
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
CAST = ("player-commander", "ramin", "saman", "nikan", "shahin-tali", "general-varen")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def world_bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return low, high


def requested_roles():
    script_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--role", choices=CAST)
    args = parser.parse_args(script_args)
    return (args.role,) if args.role else CAST


for role in requested_roles():
    clear_scene()
    target = ROOT / "assets" / "models" / "characters" / "core" / f"{role}.glb"
    source = ROOT / "tools" / "raw-character" / "makehuman-js" / f"{role}.obj"
    assert target.is_file() and target.stat().st_size > 500_000, f"missing or tiny: {target.name}"
    assert source.is_file() and target.stat().st_mtime >= source.stat().st_mtime, \
        f"GLB is stale relative to corrected OBJ: {role}"
    bpy.ops.import_scene.gltf(filepath=str(target))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    outfits = [obj for obj in meshes if obj.name.startswith("outfit_")]
    undershirts = [obj for obj in outfits if obj.name == "outfit_undershirt"]
    trousers = [obj for obj in outfits if obj.name in {"outfit_trouser_left", "outfit_trouser_right"}]
    bodies = [obj for obj in meshes if any(mod.type == "ARMATURE" for mod in obj.modifiers) and obj not in outfits]
    fitted_garments = undershirts + trousers + [obj for obj in outfits if obj.name == "outfit_tunic"]
    assert len(armatures) == 1 and len(armatures[0].data.bones) >= 60, f"bad rig: {role}"
    assert len(bodies) == 1, f"missing or ambiguous skinned body mesh: {role}"
    assert 1.4 <= max(bodies[0].dimensions) <= 2.2, f"body scale is not human-sized: {role}"
    assert len(outfits) >= 8, f"incomplete outfit: {role}"
    assert len(undershirts) == 1, f"missing base garment: {role}"
    if role != "player-commander":
        assert len(trousers) == 2, f"missing trouser objects: {role}"
        assert len(fitted_garments) == 4, f"missing fitted clothing layer: {role}"
        assert all(len(item.data.vertices) >= 100 for item in fitted_garments), f"box clothing detected: {role}"
        assert all(any(mod.type == "ARMATURE" for mod in item.modifiers) for item in fitted_garments), \
            f"clothing is not skinned to the rig: {role}"
        assert all(item.parent == armatures[0] and item.parent_type == "OBJECT" for item in fitted_garments), \
            f"clothing is rigidly bone-parented: {role}"
        assert max(undershirts[0].dimensions) >= 0.45, f"undershirt transform is too small: {role}"
        assert all(max(item.dimensions) >= 0.4 for item in trousers), f"trouser transform is too small: {role}"
    assert all(item.parent == armatures[0] and item.parent_type == "OBJECT" for item in outfits), \
        f"outfit object is not bound through the shared character transform: {role}"
    assert all(any(mod.type == "ARMATURE" for mod in item.modifiers) for item in outfits), \
        f"outfit object is not skinned to the rig: {role}"
    body_center = bodies[0].matrix_world.translation
    assert all((item.matrix_world.translation - body_center).length <= 2.5 for item in outfits), \
        f"accessory transform escaped the character: {role}"
    body_low, body_high = world_bounds(bodies[0])
    body_height = body_high.z - body_low.z
    belt = next(item for item in outfits if item.name == "outfit_belt")
    belt_low, belt_high = world_bounds(belt)
    if role == "player-commander":
        headgear = next(item for item in outfits if item.name == "outfit_headgear")
    else:
        headgear = next(item for item in outfits if item.name not in {
            "outfit_belt", "outfit_undershirt", "outfit_tunic", "outfit_trouser_left",
            "outfit_trouser_right", "outfit_boot_left", "outfit_boot_right",
        } and "map" not in item.name and "pack" not in item.name and "roll" not in item.name
            and "case" not in item.name and "notebook" not in item.name)
    head_low, head_high = world_bounds(headgear)
    belt_ratio = (((belt_low.z + belt_high.z) * 0.5) - body_low.z) / body_height
    head_ratio = (((head_low.z + head_high.z) * 0.5) - body_low.z) / body_height
    assert 0.42 <= belt_ratio <= 0.58, f"belt is not at the waist: {role} ({belt_ratio:.2f})"
    assert len(belt.data.vertices) >= 100, f"belt is still a box primitive: {role}"
    assert head_ratio >= 0.92, f"headgear is not on the head: {role} ({head_ratio:.2f})"
    maximum_headgear_ratio = 0.18 if role == "player-commander" else 0.09
    assert (head_high.z - head_low.z) / body_height <= maximum_headgear_ratio, \
        f"headgear covers the face: {role}"
    if role == "player-commander":
        primitive_meshes = [item for item in outfits if len(item.data.vertices) <= 24]
        assert not primitive_meshes, \
            f"visible primitive wardrobe remains: {[item.name for item in primitive_meshes]}"
        required_real = {
            "outfit_jacket", "outfit_trousers", "outfit_boot_left", "outfit_boot_right",
            "outfit_belt", "outfit_headgear", "outfit_role_kit", "outfit_undershirt",
        }
        assert required_real <= {item.name for item in outfits}, "commander real wardrobe is incomplete"
        assert all(any(mod.type == "ARMATURE" for mod in item.modifiers) for item in outfits), \
            "wardrobe is not skinned"
        assert armatures[0].get("character_id") == role, "commander identity metadata is missing"
        assert all(item.get("wardrobe_source") == "wwii-russian-donor.glb" for item in outfits), \
            "commander wardrobe provenance is missing"
        assert undershirts[0].get("wardrobe_geometry_source") == \
            "wardrobe_jacket:collar+hem+sleeve-cuffs", "undershirt donor regions are not recorded"
    assert not bpy.data.actions, f"base character must not embed a pose animation: {role}"
    print(f"rigged GLB: PASS {role} ({len(armatures[0].data.bones)} bones, {len(outfits)} outfit parts)")
