"""Run inside Blender: verify the built main cast has usable rigs and outfits."""

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import bpy
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree


ROOT = Path(__file__).resolve().parents[1]
CAST = ("player-commander", "ramin", "saman", "nikan", "shahin-tali", "general-varen")
COMMANDER_BASELINE = {
    "body_name": "player-commander",
    "vertices": 13380,
    "polygons": 26756,
    "positions": "a7d5f6c2dbb7d236121535f84db2a5afbeba45f991b2b70123ed72eaba4ba484",
    "topology": "5691bb9e973fc65dc57141ac959921fc5a9d3f0dfdf011405b9e7e144c4b369b",
    "weights": "b488e0e4cedfb18dbb82531ac83e29b7e34df3554dda709e7b1c66f01329be87",
    "bones": "ea3d9227a0ae8da9ec58e62311c16dd4b248dfa763a4f8b80e31783040b35ebe",
    "bounds": [[-0.050253, 0.050253], [-0.032411, 0.010261], [-0.081623, 0.088098]],
    "armature_scale": [0.01, 0.01, 0.01],
    "armature_matrix": [
        0.01, 0.0, 0.0, 0.0, 0.0, -0.0, -0.01, 0.0,
        0.0, 0.01, -0.0, 0.0, 0.0, 0.0, 0.0, 1.0,
    ],
    "body_matrix": [
        0.01, 0.0, 0.0, 0.0, 0.0, -0.0, -0.01, 0.0,
        0.0, 0.01, -0.0, 0.0, 0.0, 0.0, 0.0, 1.0,
    ],
    "parent_inverse": [
        1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
    ],
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def world_bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return low, high


def digest(rows):
    payload = json.dumps(rows, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def rounded_matrix(matrix):
    return [round(value, 6) for row in matrix for value in row]


def body_position_hash(body):
    return digest([[round(component, 6) for component in vertex.co] for vertex in body.data.vertices])


def body_topology_hash(body):
    return digest([list(polygon.vertices) for polygon in body.data.polygons])


def body_weight_hash(body):
    return digest([
        [
            [body.vertex_groups[item.group].name, round(item.weight, 6)]
            for item in sorted(vertex.groups, key=lambda assignment: body.vertex_groups[assignment.group].name)
        ]
        for vertex in body.data.vertices
    ])


def rest_bone_hash(armature):
    return digest([
        [bone.name, bone.parent.name if bone.parent else None, rounded_matrix(bone.matrix_local)]
        for bone in armature.data.bones
    ])


def position_bounds(obj):
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    return [
        [round(min(point[axis] for point in points), 6), round(max(point[axis] for point in points), 6)]
        for axis in range(3)
    ]


def mesh_world_points(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()
    return points


def assert_legal_pose_coordinates(obj, depsgraph):
    points = mesh_world_points(obj, depsgraph)
    assert points, f"{obj.name} has no renderable vertices"
    for point in points:
        assert all(math.isfinite(component) for component in point), \
            f"non-finite posed vertex detected: {obj.name}"
    span = max(
        (max(point[axis] for point in points) - min(point[axis] for point in points))
        for axis in range(3)
    )
    assert span < 2.5, f"posed mesh exploded: {obj.name} span={span:.2f}m"


def _collect_landmark_points(armature):
    pose = armature.pose.bones
    mapping = {
        "shoulder": [
            ("LeftArm", "head"),
            ("RightArm", "head"),
            ("LeftShoulder", "head"),
            ("RightShoulder", "head"),
        ],
        "waist": [
            ("Spine2", "tail"),
            ("Spine", "tail"),
            ("Hips", "head"),
        ],
        "knee": [
            ("LeftUpLeg", "tail"),
            ("RightUpLeg", "tail"),
        ],
        "ankle": [
            ("LeftFoot", "head"),
            ("RightFoot", "head"),
        ],
    }
    result = {}
    missing = []
    for group_name, specs in mapping.items():
        points = []
        for bone_name, endpoint in specs:
            bone = pose.get(bone_name)
            if bone is None:
                missing.append(f"{group_name}:{bone_name}")
                continue
            local_point = bone.tail if endpoint == "tail" else bone.head
            points.append(armature.matrix_world @ local_point)
        assert points, f"no usable landmark points for {group_name}"
        result[group_name] = points
    assert not missing, f"pose landmarks missing: {sorted(set(missing))}"
    return result


def _build_kdtree_for_mesh(obj, depsgraph):
    points = mesh_world_points(obj, depsgraph)
    tree = KDTree(len(points))
    for index, point in enumerate(points):
        tree.insert(point, index)
    tree.balance()
    return tree


def assert_body_garment_proximity(body, outfits, armature):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    landmark_groups = _collect_landmark_points(armature)
    trees = [_build_kdtree_for_mesh(outfit, depsgraph) for outfit in outfits]
    for group_name, points in landmark_groups.items():
        max_distance = 0.0
        for point in points:
            nearest = min((tree.find(point)[2] for tree in trees), default=float("inf"))
            max_distance = max(max_distance, nearest)
        assert max_distance <= 0.02, \
            f"{group_name} garment clearance too high: {max_distance:.3f}m"


def _apply_pose_offsets(armature, offsets):
    originals = {}
    for bone_name, angle in offsets.items():
        bone = armature.pose.bones.get(bone_name)
        if bone is None:
            continue
        originals[bone_name] = bone.matrix_basis.copy()
        bone.matrix_basis = Matrix.Rotation(angle, 4, "X") @ bone.matrix_basis


def assert_extreme_pose_integrity(armature, body, outfits):
    cases = [
        {"LeftArm": 0.9, "RightArm": -0.9},
        {"LeftArm": -0.9, "RightArm": 0.9},
        {"LeftUpLeg": 0.9, "RightUpLeg": -0.9},
        {"LeftUpLeg": -0.9, "RightUpLeg": 0.9},
    ]
    assert all(
        armature.pose.bones.get(name) is not None for name in {"LeftArm", "RightArm", "LeftUpLeg", "RightUpLeg"}
    ), "required limb bones are missing for pose stress"
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for index, offsets in enumerate(cases, start=1):
        original = {bone_name: armature.pose.bones.get(bone_name).matrix_basis.copy() for bone_name in offsets}
        try:
            _apply_pose_offsets(armature, offsets)
            bpy.context.view_layer.update()
            for obj in (body, *outfits):
                assert_legal_pose_coordinates(obj, depsgraph)
            assert_body_garment_proximity(body, outfits, armature)
            print(f"extreme pose pass: case {index}")
        finally:
            for bone_name, matrix in original.items():
                armature.pose.bones[bone_name].matrix_basis = matrix
            bpy.context.view_layer.update()


def maximum_influences(obj):
    return max(
        (sum(assignment.weight > 1e-6 for assignment in vertex.groups) for vertex in obj.data.vertices),
        default=0,
    )


def linked_source(socket, message):
    assert socket.is_linked and len(socket.links) == 1, message
    link = socket.links[0]
    return link.from_node, link.from_socket


def assert_pbr_materials(outfits):
    for outfit in outfits:
        assert outfit.data.materials, f"{outfit.name} lacks a material"
        for material in outfit.data.materials:
            assert material and material.use_nodes and material.node_tree, f"{outfit.name} lacks PBR nodes"
            principled = next(
                (node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"),
                None,
            )
            assert principled, f"{material.name} lacks Principled BSDF"
            base_color, base_color_output = linked_source(
                principled.inputs["Base Color"], f"{material.name} Base Color image is unbound",
            )
            assert base_color.type == "TEX_IMAGE" and base_color_output.name == "Color" \
                and base_color.image is not None, f"{material.name} Base Color lacks an image"
            normal, normal_output = linked_source(
                principled.inputs["Normal"], f"{material.name} normal map is unbound",
            )
            assert normal.type == "NORMAL_MAP" and normal_output.name == "Normal", \
                f"{material.name} normal input bypasses Normal Map"
            normal_image, normal_image_output = linked_source(
                normal.inputs["Color"], f"{material.name} normal image is unbound",
            )
            assert normal_image.type == "TEX_IMAGE" and normal_image_output.name == "Color" \
                and normal_image.image is not None, \
                f"{material.name} normal map lacks an image"
            path_images = {base_color.image, normal_image.image}
            for socket_name, channel_name in (("Roughness", "Green"), ("Metallic", "Blue")):
                source, output = linked_source(
                    principled.inputs[socket_name], f"{material.name} {socket_name.lower()} map is unbound",
                )
                if source.type == "SEPARATE_COLOR":
                    assert output.name == channel_name, \
                        f"{material.name} uses the wrong packed {socket_name.lower()} channel"
                    source, output = linked_source(
                        source.inputs["Color"], f"{material.name} packed MR image is unbound",
                    )
                assert source.type == "TEX_IMAGE" and output.name == "Color" and source.image is not None, \
                    f"{material.name} {socket_name.lower()} lacks an image"
                path_images.add(source.image)
            assert len(path_images) >= 3, f"{material.name} lacks Base Color, Normal, and MR path images"
            assert all(max(image.size) <= 2048 for image in path_images), \
                f"{material.name} exceeds the 2K PBR limit"


def assert_pbr_guard_rejects_detached_paths(outfit):
    accepted = []
    for socket_name in ("Base Color", "Normal", "Roughness", "Metallic"):
        probe = outfit.copy()
        probe.data = outfit.data.copy()
        material = outfit.data.materials[0].copy()
        probe.data.materials.clear()
        probe.data.materials.append(material)
        principled = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
        if socket_name == "Base Color":
            material.node_tree.links.remove(principled.inputs[socket_name].links[0])
        else:
            source, _output = linked_source(principled.inputs[socket_name], "negative PBR fixture is unbound")
            if source.type == "NORMAL_MAP":
                source, _output = linked_source(source.inputs["Color"], "negative normal fixture is unbound")
            elif source.type == "SEPARATE_COLOR":
                source, _output = linked_source(source.inputs["Color"], "negative MR fixture is unbound")
            image = source.image
            source.image = None
            decoy = material.node_tree.nodes.new("ShaderNodeTexImage")
            decoy.image = image
        try:
            assert_pbr_materials([probe])
            accepted.append(socket_name)
        except AssertionError:
            pass
        finally:
            mesh = probe.data
            bpy.data.objects.remove(probe, do_unlink=True)
            bpy.data.meshes.remove(mesh)
            bpy.data.materials.remove(material)
    assert not accepted, f"PBR verifier accepts detached shader paths: {accepted}"


def requested_roles():
    script_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--role", choices=CAST)
    args = parser.parse_args(script_args)
    return (args.role,) if args.role else CAST


for role in requested_roles():
    clear_scene()
    target = ROOT / "assets" / "models" / "characters" / "core" / f"{role}.glb"
    source = ROOT / "tools" / "raw-character" / (
        "mixamo/player-commander-rigged.fbx"
        if role == "player-commander"
        else f"makehuman-js/{role}.obj"
    )
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
    assert len(armatures) == 1 and len(armatures[0].data.bones) == 65, f"bad rig: {role}"
    assert len(bodies) == 1, f"missing or ambiguous skinned body mesh: {role}"
    if role != "player-commander":
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
        assert required_real == {item.name for item in outfits}, "commander outfit set is not exact"
        assert all(any(mod.type == "ARMATURE" for mod in item.modifiers) for item in outfits), \
            "wardrobe is not skinned"
        assert maximum_influences(bodies[0]) <= 4, "commander body exceeds four bone influences"
        assert all(maximum_influences(item) <= 4 for item in outfits), \
            "commander wardrobe exceeds four bone influences"
        assert_pbr_guard_rejects_detached_paths(outfits[0])
        assert_pbr_materials(outfits)
        baseline = COMMANDER_BASELINE
        assert body_position_hash(bodies[0]) == baseline["positions"], \
            "commander POSITION data changed from the pre-Task-3 baseline"
        assert body_topology_hash(bodies[0]) == baseline["topology"], \
            "commander face topology changed from the pre-Task-3 baseline"
        assert body_weight_hash(bodies[0]) == baseline["weights"], \
            "commander body weights changed from the pre-Task-3 baseline"
        assert rest_bone_hash(armatures[0]) == baseline["bones"], \
            "commander bind bones changed from the pre-Task-3 baseline"
        assert position_bounds(bodies[0]) == baseline["bounds"], \
            "commander body bounds changed from the pre-Task-3 baseline"
        assert bodies[0].name == baseline["body_name"], "commander body identity changed"
        assert len(bodies[0].data.vertices) == baseline["vertices"], "commander vertex count changed"
        assert len(bodies[0].data.polygons) == baseline["polygons"], "commander face count changed"
        assert [round(value, 6) for value in armatures[0].scale] == baseline["armature_scale"], \
            "commander armature scale changed from 0.01"
        assert rounded_matrix(armatures[0].matrix_world) == baseline["armature_matrix"], \
            "commander armature world matrix changed"
        assert rounded_matrix(bodies[0].matrix_world) == baseline["body_matrix"], \
            "commander body world matrix changed"
        assert rounded_matrix(bodies[0].matrix_parent_inverse) == baseline["parent_inverse"], \
            "commander bind parent inverse changed"
        assert armatures[0].get("character_id") == role, "commander identity metadata is missing"
        assert all(item.get("wardrobe_source") == "wwii-russian-donor.glb" for item in outfits), \
            "commander wardrobe provenance is missing"
        assert undershirts[0].get("wardrobe_geometry_source") == \
            "wardrobe_jacket:collar+hem+sleeve-cuffs", "undershirt donor regions are not recorded"
        assert_extreme_pose_integrity(armatures[0], bodies[0], outfits)
    assert not bpy.data.actions, f"base character must not embed a pose animation: {role}"
    print(f"rigged GLB: PASS {role} ({len(armatures[0].data.bones)} bones, {len(outfits)} outfit parts)")
