"""Build the textured Russian soldier on its native Mixamo 65-bone rig."""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "tools/raw-character/mixamo/soldierA.fbx"
TEXTURES = ROOT / "tools/raw-character/donor/russian-soldier/package/source/soldier"
OUTPUT = ROOT / "assets/models/characters/core/soldier-base.glb"
TEXTURE_FILES = {
    "hhl_01_co": "hhl_01_co.png",
    "mouth_co": "mouth_co.png",
    "sov_eqipment_0_co": "sov_eqipment_0_co.png",
    "sov_eqipment_1_co": "sov_eqipment_1_co.png",
    "sov_soldier_0_co": "sov_soldier_0_co.png",
}
MATERIAL_TEXTURES = {
    "Default OBJ": "hhl_01_co",
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
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def reconnect_textures():
    loaded = {key: bpy.data.images.load(str(TEXTURES / filename), check_existing=True)
              for key, filename in TEXTURE_FILES.items()}
    replaced = 0
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        material_key = MATERIAL_TEXTURES.get(material.name)
        for node in material.node_tree.nodes:
            if node.type != "TEX_IMAGE" or node.image is None:
                continue
            image_name = node.image.name.lower()
            match = material_key or next((key for key in loaded if key in image_name), None)
            if match:
                node.image = loaded[match]
                replaced += 1
    if replaced < 11:
        raise RuntimeError(f"expected texture nodes were not reconnected: {replaced}")


def main():
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)
    clear_scene()
    bpy.ops.import_scene.fbx(filepath=str(SOURCE), use_anim=False)
    rigs = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(rigs) != 1 or len(rigs[0].data.bones) != 65:
        raise RuntimeError("soldierA must contain one 65-bone Mixamo armature")
    if len(meshes) != 16:
        raise RuntimeError(f"expected 16 body/clothing/equipment meshes, got {len(meshes)}")
    rig = rigs[0]
    if rig.data.bones.get("mixamorig:Hips") is None:
        raise RuntimeError("soldierA does not use Mixamo bone names")
    rig.name = "soldier_mixamo_rig"
    rig.data.name = "soldier_mixamo_skeleton"
    rig["mixamo_skeleton"] = True
    rig["source_model"] = "Russian soldier by Chernov-Egor, Mixamo auto-rig"
    reconnect_textures()
    rig.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT), export_format="GLB", use_selection=True,
        export_skins=True, export_animations=False, export_extras=True,
        export_apply=False, export_image_format="AUTO",
    )
    print(f"build-shared-soldier: PASS meshes={len(meshes)} bones=65 output={OUTPUT}")


if __name__ == "__main__":
    main()
