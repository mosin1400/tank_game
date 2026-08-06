import fs from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const context=vm.createContext({console,curMission:{def:{operation:'opening-convoy'}}});
for(const path of ['src/scenes/scene-01.js','src/scenes/scene-library.js','src/missions/operation-controller.js']){
  vm.runInContext(await fs.readFile(new URL(path,root),'utf8'),context,{filename:path});
}
let spawns=0,victories=0;
const trucks=[{alive:true,reachedExit:false},{alive:true,reachedExit:false},{alive:true,reachedExit:false}];
const operation=context.OpeningOperation;
operation.configure({
  createConvoy:()=>trucks,updateConvoy:()=>{},spawnEncounter:()=>{spawns++;},
  encounterAlive:()=>false,showObjective:()=>{},missionVictory:()=>{victories++;}
});
operation.start({idx:0,def:{sceneId:'scene-01'}});
if(operation.snapshot().act!=='yard'||spawns!==2)throw new Error('opening must start with exactly the yard encounter');
operation.update(.1);
if(operation.snapshot().act!=='broken-road'||spawns!==4)throw new Error('road must follow a cleared yard');
operation.update(.1);
if(operation.snapshot().act!=='watch-hill'||spawns!==5)throw new Error('hill must follow a cleared road');
trucks.forEach(truck=>truck.alive=false);
if(!operation.update(.1).failed)throw new Error('all trucks lost must fail');
operation.dispose(); trucks.forEach(truck=>{truck.alive=true;truck.reachedExit=false;}); spawns=0;
operation.start({idx:0,def:{sceneId:'scene-01'}});
operation.update(.1); operation.update(.1); trucks[0].reachedExit=true;
const result=operation.update(.1);
if(!result.completed||victories!==1)throw new Error('only a cleared hill with one surviving truck may complete');
console.log('PASS: opening operation controller behavior');
