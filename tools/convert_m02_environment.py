"""Convert the user-supplied M02 environment packs to browser-ready GLB files."""
import bpy
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/'tools'/'cache'/'m02-import'
OUT=ROOT/'assets'/'models'/'environment'/'m02'
OUT.mkdir(parents=True,exist_ok=True)

ASSETS=[
 ('harbor/3td_Harbor_Pack_Ready/game/art/shapes/FreeHarborProps/IndustrialShack_01/IndstrialShack_01.DAE','harbor-industrial-shack.glb','dae'),
 ('harbor/3td_Harbor_Pack_Ready/game/art/shapes/FreeHarborProps/Dock_01/Dock_01.DAE','harbor-dock.glb','dae'),
 ('harbor/3td_Harbor_Pack_Ready/game/art/shapes/FreeHarborProps/WarfStand_01/WarfStand_01.DAE','harbor-watch-stand.glb','dae'),
 ('ruins/LowPoly-Apocalyptic-Buildings-By-Majadroid/fbx files/building-01.fbx','ruin-building-01.glb','fbx'),
 ('ruins/LowPoly-Apocalyptic-Buildings-By-Majadroid/fbx files/wreckage-3-types.fbx','ruin-wreckage.glb','fbx'),
]

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.materials,bpy.data.meshes,bpy.data.images,bpy.data.cameras,bpy.data.lights):
        for item in list(collection):
            if item.users==0: collection.remove(item)

for source,name,kind in ASSETS:
    clear()
    source_path=STAGE/source
    if kind=='dae': bpy.ops.wm.collada_import(filepath=str(source_path))
    else: bpy.ops.import_scene.fbx(filepath=str(source_path),use_image_search=True)
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH':
            obj.select_set(True)
            obj.name='M02_'+name.replace('.glb','')
            obj.data.name=obj.name+'_mesh'
            obj.visible_shadow=True
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/name),export_format='GLB',export_apply=True,export_materials='EXPORT',export_animations=False)
    print('WROTE',OUT/name)
