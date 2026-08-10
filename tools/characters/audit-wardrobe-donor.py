"""Inventory the licensed WWII wardrobe donor before normalization."""

from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
DONOR_ROOT = ROOT / "tools/raw-character/donor/russian-soldier"
SUPPORTED = {".glb", ".gltf", ".fbx", ".obj"}


def source_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.suffix.lower() in SUPPORTED)


def inventory_scene() -> list[dict]:
    return [{
        "name": obj.name,
        "type": obj.type,
        "vertices": len(obj.data.vertices) if obj.type == "MESH" else 0,
        "materials": [material.name for material in obj.data.materials] if obj.type == "MESH" else [],
    } for obj in bpy.context.scene.objects]


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_source(source: Path) -> None:
    suffix = source.suffix.lower()
    if suffix == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(source))
    elif suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(source))
    elif suffix == ".obj":
        bpy.ops.wm.obj_import(filepath=str(source))
    else:
        raise RuntimeError(f"unsupported source: {source}")


def triangle_count() -> int:
    return sum(len(obj.data.polygons) for obj in bpy.context.scene.objects if obj.type == "MESH") * 2


def main() -> None:
    candidates = source_files(DONOR_ROOT)
    if not candidates:
        raise RuntimeError(f"no supported donor source under {DONOR_ROOT}")
    source = max(candidates, key=lambda path: path.stat().st_size)
    clear_scene()
    import_source(source)
    inventory = inventory_scene()
    print(json.dumps(inventory, indent=2))
    (source.parent / "inventory.json").write_text(json.dumps(inventory, indent=2) + "\n", encoding="utf-8")

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("donor has no mesh")
    if not any(obj.data.materials for obj in meshes):
        raise RuntimeError("donor has no material")
    triangles = triangle_count()
    if triangles > 80_000:
        raise RuntimeError(f"donor exceeds audit triangle ceiling: {triangles}")
    print(f"audit-wardrobe-donor: PASS ({source.name}, {triangles} estimated triangles)")


if __name__ == "__main__":
    main()
