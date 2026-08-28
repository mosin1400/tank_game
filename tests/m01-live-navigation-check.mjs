import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const sceneSource=await fs.readFile(new URL('../src/scenes/scene-builder.js',import.meta.url),'utf8');
const navigationSource=await fs.readFile(new URL('../src/entities/character-navigation.js',import.meta.url),'utf8');
const layout={id:'scene-01',landmarks:{fuelYard:[-68,0,78],canalBridge:[12,0,30],watchTower:[126,0,-60],generator:[108,0,-46],exitGate:[118,0,-38]}};
const transform=()=>({x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}});
class Group{constructor(){this.children=[];this.position=transform();this.scale=transform();this.rotation={x:0,y:0,z:0};this.userData={};this.parent=null;}add(...items){for(const item of items)item.parent=this;this.children.push(...items);}}
class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class Sprite extends Mesh{}
class TextureLoader{load(){return {repeat:{set(){}},offset:{set(){}},wrapS:null,wrapT:null,colorSpace:null};}}
const THREE={Group,Mesh,Sprite,TextureLoader,CylinderGeometry:class{},SpriteMaterial:class{constructor(options){Object.assign(this,options);}},RepeatWrapping:1,SRGBColorSpace:2,AdditiveBlending:3};
const staticObs=[],actors=[];
const scene={add(){},remove(){}};
const addPrimitive=(parent)=>{const item=new Group();parent.add(item);return item;};
const context=vm.createContext({THREE,SceneLibrary:{getScene:()=>layout},scene,staticObs,setLegacyWorldVisible(){},mat:o=>o||{},mkBox:addPrimitive,mkCyl:addPrimitive,mkSph:addPrimitive,
  CharacterManager:{spawnCharacter(role,position,options){const actor=new Group();actor.position.set(position.x,position.y,position.z);actor.userData.spawnOptions=options;options.parent.add(actor);actors.push(actor);return actor;},removeWithin(){}},
  matTrunk:{},matRust:{},matDark:{},matRoof:{},matGray:{},matBag:{},matRock:{},matLeaf:{},texGlow:{},console});
vm.runInContext(`${sceneSource};globalThis.SceneBuilderTest=SceneBuilder;`,context);
const active=context.SceneBuilderTest.loadForMission({sceneId:'scene-01'});
vm.runInContext(navigationSource,context);
const obstacles=active.colliders.map(c=>c.type==='aabb'?{kind:'aabb',minX:c.x-c.hw,maxX:c.x+c.hw,minZ:c.z-c.hd,maxZ:c.z+c.hd}:c.type==='obb'?{kind:'obb',center:{x:c.x,z:c.z},halfSize:{x:c.hw,z:c.hd},yaw:c.ry||0}:{kind:'circle',position:{x:c.x,z:c.z},radius:c.r||.5});
context.CharacterNavigation.configure({getObstacles:()=>obstacles,getThreats:()=>[]});
const runners=actors.filter(actor=>actor.userData.spawnOptions.movement);
for(const actor of runners){actor.userData.animation={setState(state){actor.userData.state=state;}};const move=actor.userData.spawnOptions.movement;context.CharacterNavigation.register(actor,{behavior:'run-to-cover',speed:move.speed,startDelay:0});}
const before=runners.map(actor=>({x:actor.position.x,z:actor.position.z}));
context.CharacterNavigation.update(.5);
for(let i=0;i<runners.length;i++){
  const moved=Math.hypot(runners[i].position.x-before[i].x,runners[i].position.z-before[i].z);
  if(moved<=.05){
    const blocking=[];
    for(let j=0;j<obstacles.length;j++){
      context.CharacterNavigation.reset();context.CharacterNavigation.configure({getObstacles:()=>[obstacles[j]],getThreats:()=>[]});
      const probe=new Group();probe.position.set(before[i].x,0,before[i].z);context.CharacterNavigation.register(probe,{behavior:'run-to-cover',speed:3,radius:.42});
      if(!context.CharacterNavigation.chooseStep(probe,'run-to-cover',.5))blocking.push({index:j,obstacle:obstacles[j]});
    }
    assert.fail(`M01 runner ${i+1} at ${JSON.stringify(before[i])} cannot route; single blockers=${JSON.stringify(blocking)}`);
  }
}
assert.ok(runners.every(actor=>actor.userData.state==='run'),'every exposed M01 soldier must enter the run animation');
console.log('m01-live-navigation-check: PASS');
