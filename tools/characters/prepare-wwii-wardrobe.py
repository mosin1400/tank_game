"""Normalize only semantically proven garment geometry from the licensed donor."""

from __future__ import annotations

import shutil
import tempfile
import zipfile
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
DONOR_ROOT = ROOT / "tools/raw-character/donor/russian-soldier"
ARCHIVE = DONOR_ROOT / "original-download.zip"
TARGET = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor.glb"
PROOF = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor-proof.png"
SUPPORTED = {".glb", ".gltf", ".fbx", ".obj"}
REQUIRED = (
    "wardrobe_jacket", "wardrobe_trousers", "wardrobe_boot_left",
    "wardrobe_boot_right", "wardrobe_belt", "wardrobe_headgear",
    "wardrobe_role_kit",
)

# These are labelled UV islands in the licensed sov_soldier_0_co atlas, reviewed
# against its texture sheet. They are deliberately atlas-semantic, never world-Z bands.
UNIFORM_ATLAS = "sov_soldier_0_co.png"
EQUIPMENT_ATLAS = "sov_eqipment_0_co.png"
HEADGEAR_ATLAS = "sov_eqipment_1_co.png"
REJECTED_ATLASES = {"hhl_01_co.png", "mouth_co.png"}


def source_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.suffix.lower() in SUPPORTED)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_source(source: Path) -> None:
    if source.suffix.lower() == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(source))
    elif source.suffix.lower() in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(source))
    elif source.suffix.lower() == ".obj":
        bpy.ops.wm.obj_import(filepath=str(source))
    else:
        raise RuntimeError(f"unsupported source: {source}")


def extract_donor_textures() -> Path:
    if not ARCHIVE.is_file():
        raise RuntimeError(f"licensed donor archive is missing: {ARCHIVE}")
    texture_root = Path(tempfile.gettempdir()) / "t3475-wwii-donor-textures"
    if texture_root.exists():
        shutil.rmtree(texture_root)
    with zipfile.ZipFile(ARCHIVE) as archive:
        for member in archive.namelist():
            if member.startswith("textures/") and member.lower().endswith((".png", ".jpg", ".jpeg", ".tga")):
                archive.extract(member, texture_root)
    return texture_root / "textures"


def image_nodes(material: bpy.types.Material) -> list[bpy.types.Node]:
    if not material or not material.use_nodes or not material.node_tree:
        return []
    return [node for node in material.node_tree.nodes if node.type == "TEX_IMAGE" and node.image]


def material_images(obj: bpy.types.Object) -> set[str]:
    return {node.image.name.lower() for material in obj.data.materials for node in image_nodes(material)}


def relink_donor_images(texture_root: Path) -> None:
    for material in bpy.data.materials:
        for node in image_nodes(material):
            png = texture_root / (Path(node.image.name).stem + ".png")
            if png.is_file():
                node.image = bpy.data.images.load(str(png), check_existing=True)


def uv_bbox(obj: bpy.types.Object, face_indices: list[int] | None = None) -> tuple[float, float, float, float]:
    layer = obj.data.uv_layers.active
    if layer is None:
        raise RuntimeError(f"{obj.name} has no UV map")
    faces = face_indices if face_indices is not None else [face.index for face in obj.data.polygons]
    loops = [loop for index in faces for loop in obj.data.polygons[index].loop_indices]
    if not loops:
        raise RuntimeError(f"{obj.name} has no UV faces")
    uv = layer.data
    return (
        min(uv[loop].uv.x for loop in loops), min(uv[loop].uv.y for loop in loops),
        max(uv[loop].uv.x for loop in loops), max(uv[loop].uv.y for loop in loops),
    )


def uv_islands(obj: bpy.types.Object) -> list[list[int]]:
    """Group faces only across shared mesh edges with matching UV endpoints."""
    mesh = obj.data
    layer = mesh.uv_layers.active
    if layer is None:
        raise RuntimeError(f"{obj.name} has no UV map")
    parent = list(range(len(mesh.polygons)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        left, right = find(left), find(right)
        if left != right:
            parent[right] = left

    seen: dict[tuple, int] = {}
    for polygon in mesh.polygons:
        loops = list(polygon.loop_indices)
        for index, current in enumerate(loops):
            following = loops[(index + 1) % len(loops)]
            current_key = (mesh.loops[current].vertex_index, round(layer.data[current].uv.x, 5), round(layer.data[current].uv.y, 5))
            following_key = (mesh.loops[following].vertex_index, round(layer.data[following].uv.x, 5), round(layer.data[following].uv.y, 5))
            edge = tuple(sorted((current_key, following_key)))
            if edge in seen:
                union(polygon.index, seen[edge])
            else:
                seen[edge] = polygon.index
    groups: dict[int, list[int]] = {}
    for polygon in mesh.polygons:
        groups.setdefault(find(polygon.index), []).append(polygon.index)
    return list(groups.values())


def uniform_island_category(box: tuple[float, float, float, float]) -> str | None:
    """Classify the reviewed labelled islands from the real uniform texture atlas."""
    u0, v0, u1, v1 = box
    if u0 >= .47 and v1 <= .31:
        return "boots"
    if v0 >= .24 and v1 <= .57 and u1 <= .67:
        return "trousers"
    if u0 <= .01 and .20 <= v0 and v1 <= .25 and u1 <= .51:
        return "belt"
    if (v0 >= .53 and u1 <= .65) or (u0 >= .72 and v0 >= .30):
        return "jacket"
    return None


def extract_selected_faces(source: bpy.types.Object, face_indices: set[int], label: str, proof: str) -> bpy.types.Object:
    if not face_indices:
        raise RuntimeError(f"unresolved semantic donor category: {label}")
    copy = source.copy()
    copy.data = source.data.copy()
    copy.name = label
    bpy.context.collection.objects.link(copy)
    for polygon in copy.data.polygons:
        polygon.select = polygon.index in face_indices
    before = set(bpy.context.scene.objects)
    bpy.ops.object.select_all(action="DESELECT")
    copy.select_set(True)
    bpy.context.view_layer.objects.active = copy
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    parts = [obj for obj in bpy.context.scene.objects if obj not in before]
    bpy.data.objects.remove(copy, do_unlink=True)
    if len(parts) != 1:
        raise RuntimeError(f"could not isolate semantic donor category: {label}")
    part = parts[0]
    part.name = label
    part["donor_proof"] = proof
    return part


def split_loose_parts(obj: bpy.types.Object) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return [obj, *(candidate for candidate in bpy.context.scene.objects if candidate not in before)]


def choose_largest(candidates: list[bpy.types.Object], amount: int = 1) -> list[bpy.types.Object]:
    return sorted(candidates, key=lambda obj: len(obj.data.vertices), reverse=True)[:amount]


def find_atlas_mesh(meshes: list[bpy.types.Object], atlas: str, *, largest: bool = True) -> bpy.types.Object:
    candidates = [obj for obj in meshes if atlas in material_images(obj)]
    if not candidates:
        raise RuntimeError(f"no donor mesh uses required atlas: {atlas}")
    return choose_largest(candidates)[0] if largest else candidates[0]


def select_role_kit(meshes: list[bpy.types.Object]) -> bpy.types.Object:
    """Accept only the pouch UV island on the equipment atlas; reject ambiguous equipment."""
    candidates = []
    for obj in meshes:
        if EQUIPMENT_ATLAS not in material_images(obj):
            continue
        u0, v0, u1, v1 = uv_bbox(obj)
        if .28 <= u0 <= .30 and .25 <= v0 <= .27 and .58 <= u1 <= .59 and .59 <= v1 <= .61:
            candidates.append(obj)
    if len(candidates) != 1:
        raise RuntimeError(f"unresolved or ambiguous role-kit pouch evidence: {len(candidates)} matches")
    kit = candidates[0]
    kit["donor_proof"] = "sov_eqipment_0_co.png pouch UV island [0.285,0.258]-[0.586,0.600]"
    return kit


def semantic_categories(meshes: list[bpy.types.Object]) -> dict[str, list[bpy.types.Object]]:
    uniform = find_atlas_mesh(meshes, UNIFORM_ATLAS)
    indices = {"jacket": set(), "trousers": set(), "boots": set(), "belt": set()}
    for island in uv_islands(uniform):
        box = uv_bbox(uniform, island)
        category = uniform_island_category(box)
        if category:
            indices[category].update(island)
            print(f"UV proof {category}: {len(island)} faces, {[round(value, 3) for value in box]}")
    jacket = extract_selected_faces(uniform, indices["jacket"], "donor_jacket", "sov_soldier_0_co labelled jacket/sleeve UV islands")
    trousers = extract_selected_faces(uniform, indices["trousers"], "donor_trousers", "sov_soldier_0_co labelled trouser UV islands")
    belt = extract_selected_faces(uniform, indices["belt"], "donor_belt", "sov_soldier_0_co brown belt-strap UV island")
    boots = extract_selected_faces(uniform, indices["boots"], "donor_boots", "sov_soldier_0_co paired boot UV islands")
    boot_parts = choose_largest(split_loose_parts(boots), 2)
    if len(boot_parts) != 2:
        raise RuntimeError("paired boot UV islands did not resolve to two donor boot meshes")
    boot_parts.sort(key=lambda obj: obj.bound_box[0][0])
    headgear = find_atlas_mesh(meshes, HEADGEAR_ATLAS)
    headgear["donor_proof"] = "sov_eqipment_1_co hard-headgear atlas mesh"
    kit = select_role_kit(meshes)
    return {
        "wardrobe_jacket": [jacket],
        "wardrobe_trousers": [trousers],
        "wardrobe_boot_left": [boot_parts[0]],
        "wardrobe_boot_right": [boot_parts[1]],
        "wardrobe_belt": [belt],
        "wardrobe_headgear": [headgear],
        "wardrobe_role_kit": split_loose_parts(kit),
    }


def derive_pbr_maps(material: bpy.types.Material) -> None:
    """Derive labelled PBR maps from the licensed diffuse image; never claim they were donor maps."""
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    diffuse = next((node for node in image_nodes(material) if "derived_" not in node.image.name.lower()), None)
    if not principled or not diffuse:
        raise RuntimeError(f"{material.name} lacks a licensed diffuse image for PBR derivation")
    sample = diffuse.image.copy()
    sample.scale(min(256, sample.size[0]), min(256, sample.size[1]))
    width, height = sample.size
    source = [0.0] * (width * height * 4)
    sample.pixels.foreach_get(source)
    roughness, metallic, normal = [], [], []
    luminance = [source[index] * .2126 + source[index + 1] * .7152 + source[index + 2] * .0722 for index in range(0, len(source), 4)]
    for y in range(height):
        for x in range(width):
            index = y * width + x
            left = luminance[y * width + max(0, x - 1)]
            right = luminance[y * width + min(width - 1, x + 1)]
            below = luminance[max(0, y - 1) * width + x]
            above = luminance[min(height - 1, y + 1) * width + x]
            rough = max(.28, min(.92, .72 + (luminance[index] - .5) * .28))
            metal = max(.0, min(.12, (1.0 - luminance[index]) * .08))
            roughness.extend((rough, rough, rough, 1.0))
            metallic.extend((metal, metal, metal, 1.0))
            normal.extend((.5 + (right - left) * .35, .5 + (above - below) * .35, 1.0, 1.0))
    generated = {}
    for role, pixels in (("derived_normal", normal), ("derived_roughness", roughness), ("derived_metallic", metallic)):
        image = bpy.data.images.new(f"{diffuse.image.name}_{role}", width=width, height=height, alpha=False)
        image.pixels.foreach_set(pixels)
        image.colorspace_settings.name = "Non-Color"
        node = nodes.new("ShaderNodeTexImage")
        node.name = role
        node.label = f"generated from licensed diffuse: {role}"
        node.image = image
        generated[role] = node
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.label = "generated from licensed diffuse: normal conversion"
    links.new(generated["derived_normal"].outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], principled.inputs["Normal"])
    links.new(generated["derived_roughness"].outputs["Color"], principled.inputs["Roughness"])
    links.new(generated["derived_metallic"].outputs["Color"], principled.inputs["Metallic"])
    bpy.data.images.remove(sample)


def join_as(category: str, objects: list[bpy.types.Object]) -> bpy.types.Object:
    objects = [obj for obj in objects if obj.name in bpy.data.objects and obj.data.polygons]
    if not objects:
        raise RuntimeError(f"unresolved wardrobe category: {category}")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    wardrobe = bpy.context.view_layer.objects.active
    wardrobe.name = category
    wardrobe.data.name = category
    print(f"classified {wardrobe.name}: {len(wardrobe.data.vertices)} vertices; {wardrobe.get('donor_proof', 'joined donor kit parts')}")
    return wardrobe


def render_proof(objects: list[bpy.types.Object]) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8
    scene.render.resolution_x = 600
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PROOF)
    scene.world.color = (.12, .12, .12)
    scene.view_settings.look = "AgX - Medium Low Contrast"
    scene.view_settings.exposure = 2.2
    target = Vector((0, 0, 92))
    camera_data = bpy.data.cameras.new("wardrobe_proof_camera")
    camera = bpy.data.objects.new("wardrobe_proof_camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (245, -360, 145)
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 52
    scene.camera = camera
    for position, energy, size in (((170, -220, 240), 3200, 85), ((-150, -160, 160), 2400, 65), ((0, 100, 170), 1800, 55)):
        light_data = bpy.data.lights.new("wardrobe_proof_light", "AREA")
        light_data.energy, light_data.shape, light_data.size = energy, "DISK", size
        light = bpy.data.objects.new("wardrobe_proof_light", light_data)
        bpy.context.collection.objects.link(light)
        light.location = position
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.render.render(write_still=True)
    for obj in [obj for obj in bpy.context.scene.objects if obj.name.startswith("wardrobe_proof_")]:
        bpy.data.objects.remove(obj, do_unlink=True)


def main() -> None:
    candidates = source_files(DONOR_ROOT)
    if not candidates:
        raise RuntimeError(f"no supported donor source under {DONOR_ROOT}")
    source = max(candidates, key=lambda path: path.stat().st_size)
    clear_scene()
    import_source(source)
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    relink_donor_images(extract_donor_textures())
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if any(material_images(obj) & REJECTED_ATLASES for obj in meshes):
        print("rejecting hhl_01_co and mouth_co source meshes as body/eyes/mouth evidence")
    categories = semantic_categories(meshes)
    normalized = [join_as(category, categories[category]) for category in REQUIRED]
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH" and obj not in normalized:
            bpy.data.objects.remove(obj, do_unlink=True)
    for material in {material for obj in normalized for material in obj.data.materials if material}:
        derive_pbr_maps(material)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    render_proof(normalized)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in normalized:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = normalized[0]
    bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format="GLB", use_selection=True, export_materials="EXPORT", export_normals=True, export_extras=True)
    print(f"prepare-wwii-wardrobe: exported {TARGET}")


if __name__ == "__main__":
    main()
