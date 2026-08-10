"""Normalize the licensed Russian-soldier donor into reusable wardrobe meshes."""

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
SUPPORTED = {".glb", ".gltf", ".fbx", ".obj"}
REQUIRED = (
    "wardrobe_jacket", "wardrobe_trousers", "wardrobe_boot_left",
    "wardrobe_boot_right", "wardrobe_belt", "wardrobe_headgear",
    "wardrobe_role_kit",
)
KEYWORDS = {
    "wardrobe_jacket": ("jacket", "coat", "tunic", "uniform", "torso"),
    "wardrobe_trousers": ("trouser", "pants", "legs"),
    "wardrobe_boot_left": ("boot_l", "boot.left", "leftboot"),
    "wardrobe_boot_right": ("boot_r", "boot.right", "rightboot"),
    "wardrobe_belt": ("belt", "strap", "waist"),
    "wardrobe_headgear": ("helmet", "cap", "hat", "headgear"),
    "wardrobe_role_kit": ("pouch", "bag", "pack", "kit"),
}
FORBIDDEN = (
    "armature", "body", "skin", "eye", "face", "mouth", "weapon", "rifle",
    "gun", "knife", "sword", "camera", "light", "insignia", "badge", "star",
    "hammer", "sickle",
)


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


def bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector(tuple(min(point[index] for point in points) for index in range(3))),
        Vector(tuple(max(point[index] for point in points) for index in range(3))),
    )


def bounds_for(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    pairs = [bounds(obj) for obj in objects]
    return (
        Vector(tuple(min(pair[0][index] for pair in pairs) for index in range(3))),
        Vector(tuple(max(pair[1][index] for pair in pairs) for index in range(3))),
    )


def material_text(obj: bpy.types.Object) -> str:
    words = [obj.name]
    for material in obj.data.materials:
        if material is None:
            continue
        words.append(material.name)
        if material.use_nodes and material.node_tree:
            words.extend(node.image.name for node in material.node_tree.nodes if node.type == "TEX_IMAGE" and node.image)
    return " ".join(words).lower()


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


def relink_donor_images(texture_root: Path) -> None:
    for material in bpy.data.materials:
        if not material.use_nodes or not material.node_tree:
            continue
        for node in material.node_tree.nodes:
            if node.type != "TEX_IMAGE" or node.image is None:
                continue
            png = texture_root / (Path(node.image.name).stem + ".png")
            if png.is_file():
                node.image = bpy.data.images.load(str(png), check_existing=True)


def separate_geometry(objects: list[bpy.types.Object]) -> list[bpy.types.Object]:
    for obj in list(objects):
        if obj.name not in bpy.data.objects:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.separate(type="MATERIAL")
        bpy.ops.object.mode_set(mode="OBJECT")
    for obj in list(obj for obj in bpy.context.scene.objects if obj.type == "MESH"):
        if obj.name not in bpy.data.objects:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.separate(type="LOOSE")
        bpy.ops.object.mode_set(mode="OBJECT")
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def intersects(lower: float, upper: float, target_lower: float, target_upper: float) -> bool:
    return lower <= target_upper and upper >= target_lower


def keyword_category(obj: bpy.types.Object) -> str | None:
    text = material_text(obj)
    for category, keywords in KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return category
    return None


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
    return wardrobe


def choose_largest(candidates: list[bpy.types.Object], amount: int = 1) -> list[bpy.types.Object]:
    return sorted(candidates, key=lambda obj: len(obj.data.vertices), reverse=True)[:amount]


def extract_vertical_band(source: bpy.types.Object, lower: float, upper: float, label: str) -> bpy.types.Object:
    """Copy selected real donor faces without generating replacement geometry."""
    copy = source.copy()
    copy.data = source.data.copy()
    copy.name = label
    bpy.context.collection.objects.link(copy)
    selected = 0
    for polygon in copy.data.polygons:
        polygon.select = lower <= (copy.matrix_world @ polygon.center).z <= upper
        selected += int(polygon.select)
    if not selected:
        bpy.data.objects.remove(copy, do_unlink=True)
        raise RuntimeError(f"no donor faces in {label} bounds")
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
        raise RuntimeError(f"could not isolate donor faces for {label}")
    parts[0].name = label
    return parts[0]


def split_loose_parts(obj: bpy.types.Object) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return [obj, *(candidate for candidate in bpy.context.scene.objects if candidate not in before)]


def extract_connected_uniform(meshes: list[bpy.types.Object]) -> dict[str, list[bpy.types.Object]]:
    """Use donor face centroids when uniform, trousers, and boots share one mesh."""
    source = max(
        (obj for obj in meshes if "sov_soldier" in material_text(obj)),
        key=lambda obj: len(obj.data.vertices),
        default=None,
    )
    if source is None:
        raise RuntimeError("cannot locate connected donor uniform mesh")
    world_min, world_max = bounds_for(meshes)
    height = world_max.z - world_min.z
    at = lambda ratio: world_min.z + height * ratio
    boots = extract_vertical_band(source, world_min.z, at(.18), "donor_boots")
    trousers = extract_vertical_band(source, at(.18), at(.58), "donor_trousers")
    jacket = extract_vertical_band(source, at(.58), at(.82), "donor_jacket")
    bpy.data.objects.remove(source, do_unlink=True)
    boot_parts = choose_largest(split_loose_parts(boots), 2)
    if len(boot_parts) == 1:
        mirrored = boot_parts[0].copy()
        mirrored.data = boot_parts[0].data.copy()
        bpy.context.collection.objects.link(mirrored)
        mirrored.scale.x *= -1
        mirrored.name = "donor_boot_mirrored"
        boot_parts.append(mirrored)
    if len(boot_parts) != 2:
        raise RuntimeError("unable to resolve two donor boots")
    boot_parts.sort(key=lambda obj: bounds(obj)[0].x)
    return {
        "wardrobe_jacket": [jacket],
        "wardrobe_trousers": [trousers],
        "wardrobe_boot_left": [boot_parts[0]],
        "wardrobe_boot_right": [boot_parts[1]],
    }


def classify(meshes: list[bpy.types.Object], extracted: dict[str, list[bpy.types.Object]]) -> dict[str, list[bpy.types.Object]]:
    world_min, world_max = bounds_for(meshes)
    bottom, top = world_min.z, world_max.z
    height = top - bottom
    if height <= 0:
        raise RuntimeError("donor has zero height")
    at = lambda ratio: bottom + height * ratio
    records = []
    for obj in meshes:
        lower, upper = bounds(obj)
        center = (lower.z + upper.z) / 2
        text = material_text(obj)
        if any(word in text for word in FORBIDDEN):
            print(f"discarded {obj.name}: forbidden donor part ({len(obj.data.vertices)} vertices)")
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        if not obj.data.polygons:
            print(f"discarded {obj.name}: empty donor part ({len(obj.data.vertices)} vertices)")
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        records.append((obj, lower.z, upper.z, center))

    categories = {name: list(extracted.get(name, ())) for name in REQUIRED}
    remaining = {obj for obj, *_ in records}
    # Honor explicit source names/material labels first, then use the required vertical bands.
    for category in REQUIRED:
        direct = [obj for obj, *_ in records if obj in remaining and keyword_category(obj) == category]
        if direct:
            categories[category].extend(direct)
            remaining.difference_update(direct)

    headgear = [obj for obj, low, high, center in records if obj in remaining and center >= at(.82)]
    equipment_headgear = [obj for obj in headgear if "eqipment" in material_text(obj) or "equipment" in material_text(obj)]
    picked = choose_largest(equipment_headgear or headgear)
    categories["wardrobe_headgear"].extend(picked)
    remaining.difference_update(picked)

    belt_band = [obj for obj, low, high, center in records if obj in remaining and intersects(low, high, at(.45), at(.58))]
    belt = choose_largest(belt_band)
    categories["wardrobe_belt"].extend(belt)
    remaining.difference_update(belt)

    kit = [obj for obj, low, high, center in records if obj in remaining and intersects(low, high, at(.45), at(.58)) and len(obj.data.vertices) >= 24]
    categories["wardrobe_role_kit"].extend(kit)
    remaining.difference_update(kit)

    trousers = [obj for obj, low, high, center in records if obj in remaining and intersects(low, high, at(.15), at(.58))]
    if not categories["wardrobe_trousers"]:
        categories["wardrobe_trousers"].extend(choose_largest(trousers, 2))
        remaining.difference_update(categories["wardrobe_trousers"])

    jacket = [obj for obj, low, high, center in records if obj in remaining and at(.42) <= center <= at(.82)]
    categories["wardrobe_jacket"].extend(jacket)
    remaining.difference_update(jacket)

    boots = [obj for obj, low, high, center in records if obj in remaining and high <= at(.18)]
    boots = choose_largest(boots, 2)
    if not categories["wardrobe_boot_left"] and len(boots) == 1:
        source = boots[0]
        mirrored = source.copy()
        mirrored.data = source.data.copy()
        bpy.context.collection.objects.link(mirrored)
        mirrored.scale.x *= -1
        mirrored.name = f"{source.name}_mirrored"
        boots.append(mirrored)
    if not categories["wardrobe_boot_left"] and len(boots) == 2:
        boots.sort(key=lambda obj: bounds(obj)[0].x)
        categories["wardrobe_boot_left"].append(boots[0])
        categories["wardrobe_boot_right"].append(boots[1])

    for category in REQUIRED:
        for obj in categories[category]:
            print(f"classified {obj.name} -> {category} ({len(obj.data.vertices)} vertices)")
        if not categories[category]:
            raise RuntimeError(f"unresolved wardrobe category: {category}")
    return categories


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
    meshes = separate_geometry([obj for obj in bpy.context.scene.objects if obj.type == "MESH"])
    extracted = extract_connected_uniform(meshes)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj not in {part for pieces in extracted.values() for part in pieces}]
    categories = classify(meshes, extracted)
    normalized = [join_as(category, categories[category]) for category in REQUIRED]
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in normalized:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = normalized[0]
    bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format="GLB", use_selection=True, export_materials="EXPORT", export_normals=True)
    print(f"prepare-wwii-wardrobe: exported {TARGET}")


if __name__ == "__main__":
    main()
