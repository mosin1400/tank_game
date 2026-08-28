"""Render three runtime texture variants on the intact shared soldier."""

from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'assets/models/characters/core/soldier-base.glb'
VARIANT_DIR=ROOT/'assets/models/characters/textures/variants'
OUTPUT=ROOT/'tools/previews/wardrobe/soldier-variant-lineup.png'
VARIANTS=('commander-olive','ash-field','civilian-earth')


def import_variant(variant_id,offset):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(BASE))
    imported=[o for o in bpy.context.scene.objects if o not in before]
    image=bpy.data.images.load(str(VARIANT_DIR/f'{variant_id}.png'),check_existing=False)
    for obj in imported:
        if obj.parent is None: obj.location.x+=offset
        if obj.type!='MESH': continue
        for index,material in enumerate(obj.data.materials):
            if not material or not material.use_nodes: continue
            material=material.copy();obj.data.materials[index]=material
            for node in material.node_tree.nodes:
                if node.type=='TEX_IMAGE' and node.image and 'sov_soldier_0_co' in node.image.name:
                    node.image=image
    return imported


def main():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    objects=[]
    for variant,offset in zip(VARIANTS,(-1.45,0,1.45)):objects.extend(import_variant(variant,offset))
    meshes=[o for o in objects if o.type=='MESH']
    points=[o.matrix_world@Vector(corner) for o in meshes for corner in o.bound_box]
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center=(low+high)*.5;span=high.z-low.z
    bpy.ops.object.camera_add(location=center+Vector((4.8,-7.2,.35)))
    camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=span*1.28
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.scene.camera=camera
    for offset,energy in (((3,-4,5),1500),((-4,-1,3),850)):
        bpy.ops.object.light_add(type='AREA',location=center+Vector(offset));light=bpy.context.object
        light.data.energy=energy;light.data.size=5;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    world=bpy.data.worlds.new('variant-world');world.color=(.18,.2,.15);bpy.context.scene.world=world
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=2;scene.cycles.use_denoising=False
    scene.render.resolution_x=960;scene.render.resolution_y=480;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUTPUT)
    bpy.ops.render.render(write_still=True)
    print(f'Rendered variant lineup: {OUTPUT}')


if __name__=='__main__':main()
