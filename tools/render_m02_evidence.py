import bpy
import math
from mathutils import Vector
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'m02-evidence'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.world=bpy.data.worlds.new('M02 overcast world')
scene.world.use_nodes=True
background=scene.world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value=(0.34,0.42,0.35,1)
background.inputs['Strength'].default_value=1.15
scene.render.engine='CYCLES'
scene.cycles.samples=8
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.look='AgX - Medium Low Contrast'
scene.view_settings.exposure=2.0

def material(name,color,rough=.7,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    return m
mud=material('Wet marsh mud',(0.12,0.11,0.055),.95)
mud_image=bpy.data.images.load(str(ROOT/'assets'/'images'/'m02-marsh-mud.png'))
mud_tex=mud.node_tree.nodes.new('ShaderNodeTexImage');mud_tex.image=mud_image
mud.node_tree.links.new(mud_tex.outputs['Color'],mud.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
water=material('Standing water',(0.045,0.11,0.09),.22,.15)
wood=material('Wet wood',(0.16,0.11,0.055),.9)
brick=material('Pump house brick',(0.19,0.15,0.09),.82)
reed=material('Reeds',(0.22,0.3,0.09),1)
steel=material('Rusty steel',(0.16,0.12,0.08),.45,.55)

def cube(name,loc,scale,mat,rot=0):
    bpy.ops.mesh.primitive_cube_add(location=loc,rotation=(0,0,rot));o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);return o
def cyl(name,loc,rad,depth,mat,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=rad,depth=depth,location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o

cube('marsh water',(0,-.1,5),(125,.08,118),water)
cube('mud causeway',(7,.03,37),(83,.11,5),mud,math.radians(-31))
cube('pump house',(-45,2.8,48),(6.5,2.8,5),brick);cube('pump roof',(-45,5.8,48),(7.5,.22,6),steel)
for x,z in [(-53,42),(-37,56),(-34,42)]: cyl('pump pipe',(x,1,z),.36,5,steel,(0,math.pi/2,0))
cube('timber crossing',(14,.35,30),(5,0.25,11),wood)
for z in range(21,41,2): cube('cross plank',(14,.62,z),(5.6,.09,.22),steel)
cube('broken lock',(61,1.5,-4),(8,1.5,2.3),brick,math.radians(-11));cube('lock roof',(61,3.1,-4),(10,.18,2.8),steel,math.radians(-11))
for base_x,base_z in [(-87,22),(-68,-22),(-15,-20),(35,34),(92,20),(116,-30)]:
    for i in range(20):
        x=base_x+(i%5)*1.1;z=base_z+(i//5)*1.2;cyl('reed',(x,.9,z),.055,1.8+(i%3)*.3,reed,(.1,0,i*.4))
for x,z in [(-24,46),(2,30),(42,7),(83,-27)]:
    cube('sandbag cover',(x,.35,z),(2.5,.35,.45),wood,math.radians(12))
for x,z in [(-70,78),(-79,70),(-87,63)]:
    cube('convoy truck',(x,.7,z),(1.2,.7,2.2),steel);cube('truck cabin',(x,1.45,z-1),(1.05,.7,.7),wood)
for x,z in [(104,-48),(96,-40)]: cube('exit post',(x,1.6,z),(.25,1.6,.25),wood)

bpy.ops.object.light_add(type='SUN',location=(-30,40,20));sun=bpy.context.object;sun.data.energy=6.0;sun.rotation_euler=(math.radians(25),math.radians(-18),math.radians(-28))
bpy.ops.object.light_add(type='AREA',location=(-40,22,50));bpy.context.object.data.energy=4500;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=28
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam
def aim(pos,target):
    cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
def render(name,pos,target):
    aim(pos,target);scene.render.filepath=str(OUT/f'{name}.png');bpy.ops.render.render(write_still=True)
render('establishing',(-108,17,106),(-38,1,48))
render('pump-house',(-74,9,79),(-45,2,48))
render('timber-crossing',(-6,7,58),(14,.4,30))
render('broken-lock',(37,8,31),(61,1,-4))
render('exit-consequence',(82,7,-13),(104,1,-48))
print(f'M02 evidence written to {OUT}')
