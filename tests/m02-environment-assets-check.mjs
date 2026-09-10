import fs from 'node:fs';

const scene=fs.readFileSync('src/scenes/scene-builder.js','utf8');
for(const asset of ['harbor-industrial-shack.glb','harbor-dock.glb','harbor-watch-stand.glb','ruin-building-01.glb','ruin-wreckage.glb']){
  if(!fs.existsSync(`assets/models/environment/m02/${asset}`))throw new Error(`missing converted environment asset: ${asset}`);
}
if(!scene.includes('loadM02SetDress'))throw new Error('M02 must load its authored environmental set dressing');
if(!scene.includes("assets/models/environment/m02/harbor-industrial-shack.glb"))throw new Error('M02 must use the harbor shack model');
if(!scene.includes("assets/models/environment/m02/ruin-building-01.glb"))throw new Error('M02 must use the ruined-building model');
if(!scene.includes('sourceAsset'))throw new Error('loaded set dressing must remain traceable to its source asset');
if(!scene.includes("addBox(245,.05,235,mud,0,-.08,5,0)"))throw new Error('M02 needs a texture-mapped mud base below its water patches');

console.log('m02-environment-assets-check: PASS');
