"""Convert the user-provided CC0 vehicle archives to web-ready GLB files."""
import bpy
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/'tools'/'cache'/'vehicle-import'
OUT=ROOT/'assets'/'models'/'vehicles'
OUT.mkdir(parents=True,exist_ok=True)

ASSETS=[
 *((f'truck-pack/dist/fbx/truck_{n:02d}.fbx',f'truck-{n:02d}.glb') for n in range(1,6)),
 ('uaz/uaz_452.fbx','uaz-452.glb'),
 ('uaz/uaz_destroyed.fbx','uaz-452-destroyed.glb'),
 ('jeep/soviet military off-road vehicle.fbx','soviet-offroad.glb'),
]

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.materials,bpy.data.meshes,bpy.data.images,bpy.data.cameras,bpy.data.lights):
        for item in list(collection):
            if item.users==0: collection.remove(item)

for source,name in ASSETS:
    clear()
    bpy.ops.import_scene.fbx(filepath=str(STAGE/source),use_image_search=True)
    bpy.ops.object.select_all(action='SELECT')
    for obj in bpy.context.selected_objects:
        if obj.type=='MESH':
            obj.name='Vehicle_'+name.replace('.glb','')
            obj.data.name=obj.name+'_mesh'
    bpy.ops.export_scene.gltf(filepath=str(OUT/name),export_format='GLB',export_apply=True,export_materials='EXPORT',export_animations=False)
    print('WROTE',OUT/name)
