import fs from 'node:fs';

for(const name of ['truck-01.glb','truck-02.glb','truck-03.glb','truck-04.glb','truck-05.glb','uaz-452.glb','uaz-452-destroyed.glb','soviet-offroad.glb']){
  if(!fs.existsSync(`assets/models/vehicles/${name}`))throw new Error(`missing vehicle asset: ${name}`);
}
const convoy=fs.readFileSync('src/entities/convoy.js','utf8');
const scene=fs.readFileSync('src/scenes/scene-builder.js','utf8');
if(!convoy.includes('attachVehicleModel'))throw new Error('convoy must replace the temporary cube with a loaded vehicle model');
if(!convoy.includes("assets/models/vehicles/truck-01.glb"))throw new Error('convoy must use the first real truck');
if(!convoy.includes('placeholder.visible=false'))throw new Error('convoy must hide its temporary cube once the vehicle loads');
if(!scene.includes("assets/models/vehicles/uaz-452.glb"))throw new Error('M02 must place the UAZ model in its environment');
if(!scene.includes("assets/models/vehicles/soviet-offroad.glb"))throw new Error('M02 must place the Soviet off-road model in its environment');

console.log('vehicle-model-integration-check: PASS');
