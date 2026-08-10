"""Fit the normalized licensed WWII wardrobe to an existing Mixamo body."""

from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[2]
DONOR = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor.glb"

DONOR_NAMES = (
    "wardrobe_jacket",
    "wardrobe_trousers",
    "wardrobe_boot_left",
    "wardrobe_boot_right",
    "wardrobe_belt",
    "wardrobe_headgear",
    "wardrobe_role_kit",
)

OUTPUT_NAMES = {
    "wardrobe_jacket": "outfit_jacket",
    "wardrobe_trousers": "outfit_trousers",
    "wardrobe_boot_left": "outfit_boot_left",
    "wardrobe_boot_right": "outfit_boot_right",
    "wardrobe_belt": "outfit_belt",
    "wardrobe_headgear": "outfit_headgear",
    "wardrobe_role_kit": "outfit_role_kit",
    "wardrobe_undershirt": "outfit_undershirt",
}


def world_bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return low, high


def collection_bounds(objects):
    bounds = [world_bounds(obj) for obj in objects]
    low = Vector(tuple(min(item[0][axis] for item in bounds) for axis in range(3)))
    high = Vector(tuple(max(item[1][axis] for item in bounds) for axis in range(3)))
    return low, high


def _delete_faces(mesh, obj_matrix, predicate, delete_selected):
    bm = bmesh.new()
    bm.from_mesh(mesh)
    doomed = []
    for face in bm.faces:
        selected = predicate(obj_matrix @ face.calc_center_median())
        if selected == delete_selected:
            doomed.append(face)
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    orphaned = [vertex for vertex in bm.verts if not vertex.link_faces]
    if orphaned:
        bmesh.ops.delete(bm, geom=orphaned, context="VERTS")
    bm.to_mesh(mesh)
    mesh.update()
    bm.free()


def _derive_visible_undershirt(jacket):
    """Split real collar, hem, and cuff faces from the licensed donor jacket."""
    low, high = world_bounds(jacket)
    center_x = (low.x + high.x) * 0.5
    half_width = max((high.x - low.x) * 0.5, 1e-6)
    height = max(high.z - low.z, 1e-6)

    def interior_region(point):
        normalized_x = abs(point.x - center_x) / half_width
        normalized_z = (point.z - low.z) / height
        collar = normalized_x <= 0.24 and normalized_z >= 0.82
        hem = normalized_x <= 0.48 and normalized_z <= 0.16
        cuffs = normalized_x >= 0.84 and 0.30 <= normalized_z <= 0.78
        return collar or hem or cuffs

    undershirt = jacket.copy()
    undershirt.data = jacket.data.copy()
    undershirt.name = "wardrobe_undershirt"
    undershirt.data.name = "wardrobe_undershirt_mesh"
    bpy.context.collection.objects.link(undershirt)

    _delete_faces(undershirt.data, undershirt.matrix_world, interior_region, delete_selected=False)
    _delete_faces(jacket.data, jacket.matrix_world, interior_region, delete_selected=True)
    if len(undershirt.data.vertices) <= 24 or len(jacket.data.vertices) <= 24:
        raise RuntimeError("Donor jacket does not contain usable collar, hem, and cuff regions")
    undershirt["wardrobe_source"] = DONOR.name
    undershirt["wardrobe_geometry_source"] = "wardrobe_jacket:collar+hem+sleeve-cuffs"
    undershirt["wardrobe_provenance"] = jacket.get("wardrobe_provenance", "licensed donor jacket")
    jacket["wardrobe_derivation"] = "licensed donor jacket minus undershirt regions"
    return undershirt


def import_normalized_donor(path):
    if not path.is_file():
        raise FileNotFoundError(f"Normalized wardrobe donor is missing: {path}")
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    meshes = {obj.name: obj for obj in imported if obj.type == "MESH"}
    missing = set(DONOR_NAMES) - set(meshes)
    if missing:
        raise RuntimeError(f"Normalized wardrobe donor is incomplete: {sorted(missing)}")
    unexpected = [obj for obj in imported if obj.type == "MESH" and obj.name not in DONOR_NAMES]
    if unexpected:
        raise RuntimeError(f"Normalized wardrobe donor has unexpected meshes: {[obj.name for obj in unexpected]}")
    pieces = [meshes[name] for name in DONOR_NAMES]
    pieces.append(_derive_visible_undershirt(meshes["wardrobe_jacket"]))
    return pieces


def vertex_group_centroid(body, semantic_name):
    group = next(
        (item for item in body.vertex_groups if item.name == semantic_name or item.name.endswith(f":{semantic_name}")),
        None,
    )
    if group is None:
        raise RuntimeError(f"Body lacks Mixamo landmark group: {semantic_name}")
    weighted = Vector((0.0, 0.0, 0.0))
    total = 0.0
    for vertex in body.data.vertices:
        assignment = next((item for item in vertex.groups if item.group == group.index), None)
        if assignment is None or assignment.weight <= 0.0:
            continue
        weighted += (body.matrix_world @ vertex.co) * assignment.weight
        total += assignment.weight
    if total <= 0.0:
        raise RuntimeError(f"Body landmark group has no weighted vertices: {semantic_name}")
    return weighted / total


def _translate_center(piece, target, axes=(0, 1, 2)):
    low, high = world_bounds(piece)
    center = (low + high) * 0.5
    delta = Vector((0.0, 0.0, 0.0))
    for axis in axes:
        delta[axis] = target[axis] - center[axis]
    piece.matrix_world.translation += delta


def align_to_body_landmarks(pieces, body):
    body_low, body_high = world_bounds(body)
    donor_low, donor_high = collection_bounds(pieces)
    donor_height = donor_high.z - donor_low.z
    body_height = body_high.z - body_low.z
    if donor_height <= 0.0 or body_height <= 0.0:
        raise RuntimeError("Body or donor has invalid world bounds")
    scale = body_height / donor_height
    body_center = (body_low + body_high) * 0.5
    donor_anchor = Vector(((donor_low.x + donor_high.x) * 0.5,
                           (donor_low.y + donor_high.y) * 0.5,
                           donor_low.z))
    body_anchor = Vector((body_center.x, body_center.y, body_low.z))
    transform = Matrix.Translation(body_anchor) @ Matrix.Scale(scale, 4) @ Matrix.Translation(-donor_anchor)
    for piece in pieces:
        piece.matrix_world = transform @ piece.matrix_world

    landmarks = {
        name: vertex_group_centroid(body, name)
        for name in ("Hips", "Spine2", "Head", "LeftFoot", "RightFoot")
    }
    by_name = {piece.name: piece for piece in pieces}

    jacket = by_name["wardrobe_jacket"]
    jacket_low, jacket_high = world_bounds(jacket)
    jacket_center = (jacket_low + jacket_high) * 0.5
    jacket_delta = landmarks["Spine2"] - jacket_center
    jacket.matrix_world.translation += jacket_delta
    by_name["wardrobe_undershirt"].matrix_world.translation += jacket_delta

    trousers = by_name["wardrobe_trousers"]
    trouser_low, trouser_high = world_bounds(trousers)
    trouser_center = (trouser_low + trouser_high) * 0.5
    trousers.matrix_world.translation += Vector((
        landmarks["Hips"].x - trouser_center.x,
        landmarks["Hips"].y - trouser_center.y,
        landmarks["Hips"].z - trouser_high.z,
    ))
    _translate_center(by_name["wardrobe_belt"], landmarks["Hips"])
    headgear = by_name["wardrobe_headgear"]
    _translate_center(headgear, landmarks["Head"])
    headgear.matrix_world.translation.z += body_height * 0.01
    _translate_center(by_name["wardrobe_boot_left"], landmarks["LeftFoot"])
    _translate_center(by_name["wardrobe_boot_right"], landmarks["RightFoot"])
    _translate_center(by_name["wardrobe_role_kit"], landmarks["Hips"], axes=(2,))


def _adopt_body_space(piece, body):
    world_to_body = body.matrix_world.inverted() @ piece.matrix_world
    piece.data.transform(world_to_body)
    piece.parent = body.parent
    piece.parent_type = body.parent_type
    piece.matrix_parent_inverse = body.matrix_parent_inverse.copy()
    piece.matrix_basis = body.matrix_basis.copy()


def _apply_modifier(obj, modifier):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def conform_to_body(piece, body, clearance=0.008):
    _adopt_body_space(piece, body)
    shrinkwrap = piece.modifiers.new("wardrobe_surface_clearance", "SHRINKWRAP")
    shrinkwrap.target = body
    shrinkwrap.wrap_method = "NEAREST_SURFACEPOINT"
    shrinkwrap.wrap_mode = "OUTSIDE_SURFACE"
    shrinkwrap.offset = clearance
    _apply_modifier(piece, shrinkwrap)

    smoothing = piece.modifiers.new("wardrobe_corrective_smoothing", "CORRECTIVE_SMOOTH")
    smoothing.factor = 0.25
    smoothing.iterations = 2
    smoothing.smooth_type = "LENGTH_WEIGHTED"
    _apply_modifier(piece, smoothing)


def transfer_mixamo_weights(piece, body, armature):
    piece.vertex_groups.clear()
    for group in body.vertex_groups:
        piece.vertex_groups.new(name=group.name)
    transfer = piece.modifiers.new("mixamo_weight_transfer", "DATA_TRANSFER")
    transfer.object = body
    transfer.use_vert_data = True
    transfer.data_types_verts = {"VGROUP_WEIGHTS"}
    transfer.vert_mapping = "POLYINTERP_NEAREST"
    transfer.use_object_transform = True
    _apply_modifier(piece, transfer)
    modifier = piece.modifiers.new("mixamo_armature", "ARMATURE")
    modifier.object = armature


def limit_vertex_influences(piece, maximum=4):
    if maximum < 1:
        raise ValueError("maximum vertex influences must be positive")
    for vertex in piece.data.vertices:
        influences = sorted(
            ((assignment.group, assignment.weight) for assignment in vertex.groups if assignment.weight > 0.0),
            key=lambda item: item[1],
            reverse=True,
        )
        kept = influences[:maximum]
        kept_indices = {index for index, _weight in kept}
        for index, _weight in influences[maximum:]:
            piece.vertex_groups[index].remove([vertex.index])
        total = sum(weight for _index, weight in kept)
        if total <= 0.0:
            continue
        for index, weight in kept:
            if index in kept_indices:
                piece.vertex_groups[index].add([vertex.index], weight / total, "REPLACE")


def apply_role_materials(pieces, role):
    for piece in pieces:
        piece["wardrobe_role"] = role
        piece["wardrobe_source"] = DONOR.name
        for slot_index, slot in enumerate(piece.material_slots):
            if slot.material is None:
                continue
            role_material = slot.material.copy()
            role_material.name = f"{role}_{piece.name}_{slot_index}"
            role_material["wardrobe_role"] = role
            role_material["wardrobe_source"] = DONOR.name
            slot.material = role_material


def fit_wardrobe(body, armature, role):
    pieces = import_normalized_donor(DONOR)
    align_to_body_landmarks(pieces, body)
    for piece in pieces:
        conform_to_body(piece, body, clearance=0.008)
        transfer_mixamo_weights(piece, body, armature)
        limit_vertex_influences(piece, maximum=4)
        piece.name = OUTPUT_NAMES[piece.name]
    apply_role_materials(pieces, role)
    return pieces
