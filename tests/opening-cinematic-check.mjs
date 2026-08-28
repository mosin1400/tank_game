import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/cinematics/opening-cinematic.js',import.meta.url),'utf8');
const context=vm.createContext({console,Math,Object,Array,Number,isFinite});
vm.runInContext(source,context);

const events=[];
const calls={unlock:0,clear:0,unduck:0,complete:0};
const controller=context.OpeningCinematic.configure({
  setSubtitle:(text,speaker)=>events.push({type:'subtitle',text,speaker}),
  clearSubtitle:()=>{calls.clear++;events.push({type:'clear'});},
  lockControls:value=>{if(value===false)calls.unlock++;events.push({type:'lock',value});},
  setMusicDuck:value=>{if(value===1)calls.unduck++;events.push({type:'duck',value});},
  onComplete:()=>{calls.complete++;events.push({type:'complete'});}
});

const layout={
  playerSpawn:[-76,0,92],
  convoyPath:[{start:[-68,0,82]}],
  landmarks:{fuelYard:[-68,0,78],railSiding:[-98,0,40],exitGate:[118,0,-38]}
};

assert.equal(controller.start(layout),true);
assert.equal(controller.isActive(),true);
assert.equal(events[0].type,'lock');
assert.equal(events[0].value,true);
assert.equal(events[2].type,'subtitle','the first beat must start immediately');

const expectedStarts=[0,2.8,5.8,8.6,11.2];
const seen=[0];
for(const delta of [2.8,3,2.8,2.6]){
  controller.update(delta);
  seen.push(controller.snapshot().beatStart);
  const pose=controller.cameraPose();
  assert.ok(Number.isFinite(pose.position.x)&&Number.isFinite(pose.lookAt.z));
}
assert.deepEqual(seen,expectedStarts,'all five cinematic beats must occur at the designed times');

controller.reset();
events.length=0;
Object.keys(calls).forEach(key=>calls[key]=0);
controller.start(layout);
controller.update(3.1);
assert.equal(controller.requestSkip({type:'keydown',key:'Escape'}),true,'Escape must skip an active cinematic');
assert.equal(controller.isActive(),false);
assert.deepEqual(calls,{unlock:1,clear:1,unduck:1,complete:1},'skip must restore runtime exactly once');
assert.equal(controller.requestSkip({type:'keydown',key:'Space'}),false,'a second skip must be inert');
assert.equal(controller.skip(),false,'the skip alias must also be inert after completion');
assert.deepEqual(calls,{unlock:1,clear:1,unduck:1,complete:1});

controller.reset();
controller.start(layout);
assert.equal(controller.requestSkip({type:'keydown',key:'Enter'}),false,'unrelated keys must keep the cinematic active');
assert.equal(controller.requestSkip({type:'click',button:0}),true,'primary click must skip');

controller.reset();
controller.start(layout);
assert.equal(controller.requestSkip({type:'touchstart'}),true,'touch must skip');

console.log('PASS: opening cinematic follows five beats and skips with exactly-once cleanup');
