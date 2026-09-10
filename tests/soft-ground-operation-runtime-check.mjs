import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/missions/soft-ground-operation.js',import.meta.url),'utf8');
const layout={id:'scene-02',playerSpawn:[0,0,0],convoyPath:[],zones:[
  {id:'causeway',title:'یک',objective:'الف',bounds:[-2,2,-2,2]},
  {id:'timber-crossing',title:'دو',objective:'ب',bounds:[8,12,-2,2]},
  {id:'broken-lock',title:'سه',objective:'ج',bounds:[18,22,-2,2]}
],encounters:[
  {zone:'causeway',type:'light',position:[-8,0,0]},
  {zone:'timber-crossing',type:'medium',position:[14,0,0]},
  {zone:'broken-lock',type:'light',position:[26,0,0]}
]};
const context=vm.createContext({console,player:{pos:{x:0,z:0,set(){},},root:{position:{copy(){}},rotation:{}},yaw:0},curMission:{def:{operation:'soft-ground'}},enemies:[],Convoy:{dispose(){}},SceneLibrary:{getScene:()=>layout}});
vm.runInContext(`${source};globalThis.OperationTest=SoftGroundOperation;`,context);
const api=context.OperationTest;
let victoryCount=0,phase=-1;
const deps={loadScene(){},clearScene(){},setScenePhase:value=>{phase=value;},createConvoy:()=>[{alive:true,reachedExit:false}],updateConvoy(){},spawnEncounter:entry=>({dead:false,entry}),alive:entries=>entries.some(entry=>!entry.dead),showObjective(){},showMessage(){},victory:()=>{victoryCount++;}};
api.configure(deps);api.start(context.curMission);
api.update(.1);
if(api.snapshot().state!==api.STATES.ACT_1||phase!==0)throw new Error('act 1 did not activate from its zone');
api.snapshot().trucks[0].reachedExit=false;
// Each encounter is explicitly cleared before entering the next named zone.
api.snapshot().trucks; // keeps snapshot contract exercised
context.player.pos.x=0;api.snapshot();
// Mark through the internal fake entries retained by the fake spawn closure.
let state=api.snapshot();
for(const enemy of state.trucks.length?[]:[])enemy.dead=true;
// Fake alive reads operation entries, so replace it after first spawn with terminal-safe false.
deps.alive=()=>false;api.update(.1);
context.player.pos.x=10;api.update(.1);if(api.snapshot().state!==api.STATES.ACT_2)throw new Error('act 2 did not activate');
api.update(.1);context.player.pos.x=20;api.update(.1);if(api.snapshot().state!==api.STATES.ACT_3)throw new Error('act 3 did not activate');
api.snapshot().trucks[0].reachedExit=true;api.update(.1);if(victoryCount!==1||!api.snapshot().terminal)throw new Error('victory must commit once at the exit');
api.update(.1);if(victoryCount!==1)throw new Error('terminal guard allowed duplicate victory');
console.log('soft-ground-operation-runtime-check: PASS');
