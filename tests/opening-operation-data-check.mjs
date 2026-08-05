import fs from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const context=vm.createContext({MISSIONS:[]});
for(const path of ['src/scenes/scene-01.js','src/scenes/scene-library.js']){
  vm.runInContext(await fs.readFile(new URL(path,root),'utf8'),context,{filename:path});
}
const missionSource=await fs.readFile(new URL('src/campaign/mission-data.js',root),'utf8');
vm.runInContext(`${missionSource};globalThis.OpeningOperationDataTest={missions:CAMPAIGN_MISSIONS};`,context,{filename:'src/campaign/mission-data.js'});
const scene=context.SceneLibrary.getScene('scene-01');
if(!scene)throw new Error('scene-01 must exist');
if(scene.zones.map(zone=>zone.id).join(',')!=='yard,broken-road,watch-hill')throw new Error('M01 needs three ordered acts');
if(scene.convoyPath.length!==3||scene.encounters.length!==5)throw new Error('M01 authored counts changed');
if(scene.checkpoints.map(checkpoint=>checkpoint.id).join(',')!=='m01-yard,m01-road,m01-hill')throw new Error('M01 checkpoint layout changed');
if(!Object.isFrozen(scene)||!Object.isFrozen(scene.zones))throw new Error('scene layout must be immutable');
const mission=context.OpeningOperationDataTest.missions[0];
if(mission.title!=='آتش در سرو'||mission.sceneId!=='scene-01'||mission.runtime.operation!=='opening-convoy')throw new Error('M01 must select the opening convoy operation');
console.log('PASS: opening operation scene data');
