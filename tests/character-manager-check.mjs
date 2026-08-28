import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/entities/character-manager.js',import.meta.url),'utf8');
class Group{constructor(){this.children=[];this.userData={};this.position={x:0,y:0,z:0,set:(x,y,z)=>{this.position.x=x;this.position.y=y;this.position.z=z;this.p=[x,y,z];}};this.rotation={y:0};this.scale={set:(...v)=>this.s=v};}add(v){this.children.push(v);}}
class Mixer{clipAction(){return {play(){},reset(){},crossFadeTo(){}};}update(){}}
class Euler{set(){return this;}}
class Quaternion{setFromEuler(){return this;}multiply(){return this;}}
const requestedBones=[];
const baseScene={clone:true,scale:{set(){}},traverse(fn){fn({isMesh:true,material:{clone(){return {};}}});},getObjectByName(name){requestedBones.push(name);return null;}};
const sandbox={globalThis:null,fetch:async()=>({ok:true,json:async()=>({roles:{observer:'scout'},variants:{scout:{albedo:'scout.png'}}})}),console};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox);
assert.ok(sandbox.CharacterManager,'CharacterManager export missing');
let loads=0;
sandbox.CharacterRoster={load:async()=>{},get:id=>({id,defaultState:'idle',appearance:{bodyScale:[1,1,1]}})};
let animationOptions;
sandbox.AnimationManager={create:o=>{animationOptions=o;let state=o.initial;return {state:()=>state,setState(next){state=next;return true;},update(){},dispose(){}};}};
sandbox.CharacterManager.configure({
  THREE:{Group,AnimationMixer:Mixer,Euler,Quaternion,TextureLoader:class{async loadAsync(){return {}}},SRGBColorSpace:'srgb'},
  loadGltf:async path=>{loads++;return path.includes('motion')?{scene:{},animations:[{name:'idle_soldier_mixamo_rig',tracks:[{name:'mixamorig:Spine2.quaternion'},{name:'mixamorig:Hips.position'},{name:'mixamorig:Hips.scale'}]}]}:{scene:baseScene,animations:[]};},
  cloneScene:scene=>scene,
});
await sandbox.CharacterManager.preload();
const actor=sandbox.CharacterManager.spawnCharacter('observer',{x:1,y:2,z:3},{initialState:'walk'});
await actor.ready;
assert.deepEqual(actor.p,[1,2,3]);
assert.equal(actor.userData.characterRole,'observer');
assert.equal(actor.userData.animation.state(),'walk');
assert.equal(animationOptions.initial,'walk','scene placement must override a roster default animation');
assert.equal(animationOptions.clips[0].name,'idle','Mixamo rig suffix must be removed from clip names');
assert.deepEqual(animationOptions.clips[0].tracks.map(track=>track.name),['mixamorig:Spine2.quaternion'],'animation must never overwrite bone position or scale');
assert.ok(requestedBones.includes('mixamorig:Spine2'),'procedural motion must target the Mixamo chest bone');
assert.ok(actor.s.every(value=>Math.abs(value-(1.82/184.094467))<1e-9),'character wrapper must be uniformly scaled to 1.82m');
assert.equal(loads,2,'base and motion GLBs should each load once');
await sandbox.CharacterManager.preload();
assert.equal(loads,2,'preload cache was not reused');
const runner=sandbox.CharacterManager.spawnCharacter('observer',{x:0,y:0,z:0},{
  initialState:'idle',movement:{waypoints:[{x:3,z:4}],speed:2,state:'run'}
});
await runner.ready;
sandbox.CharacterManager.update(1);
assert.ok(Math.abs(runner.position.x-1.2)<1e-9&&Math.abs(runner.position.z-1.6)<1e-9,
  'panic movement must advance the actor toward its waypoint at configured speed');
assert.equal(runner.userData.animation.state(),'run','moving actors must switch to their run animation');
assert.ok(Math.abs(runner.rotation.y-Math.atan2(3,4))<1e-9,'moving actors must face their travel direction');
console.log('character-manager-check: PASS');
