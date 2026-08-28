import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const filename=new URL('../src/entities/weapon-models.js',import.meta.url);
const source=fs.existsSync(filename)?fs.readFileSync(filename,'utf8'):'';
const managerFilename=new URL('../src/entities/character-manager.js',import.meta.url);
const managerSource=fs.readFileSync(managerFilename,'utf8');

class Node {
  constructor(){
    this.children=[];this.parent=null;this.name='';this.userData={};
    this.position={set:(x,y,z)=>{this.position.x=x;this.position.y=y;this.position.z=z;}};
    this.rotation={set:(x,y,z)=>{this.rotation.x=x;this.rotation.y=y;this.rotation.z=z;}};
    this.scale={set:(x,y,z)=>{this.scale.x=x;this.scale.y=y;this.scale.z=z;}};
    this.quaternion={multiply(){return this;}};
  }
  add(child){child.parent=this;this.children.push(child);}
  traverse(fn){fn(this);this.children.forEach(child=>child.traverse(fn));}
}
class Group extends Node {}
class Mesh extends Node {
  constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}
}
class BoxGeometry { constructor(...args){this.args=args;} }
class CylinderGeometry { constructor(...args){this.args=args;} }
class SphereGeometry { constructor(...args){this.args=args;} }
class TorusGeometry { constructor(...args){this.args=args;} }
class MeshStandardMaterial { constructor(options){Object.assign(this,options);} }
const THREE={Group,Mesh,BoxGeometry,CylinderGeometry,SphereGeometry,TorusGeometry,MeshStandardMaterial};
const sandbox={globalThis:null};sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'src/entities/weapon-models.js'});

assert.ok(sandbox.WeaponModels,'WeaponModels export missing');
const ppSh=sandbox.WeaponModels.create('ppsh41',THREE);
const mosin=sandbox.WeaponModels.create('mosin',THREE);
assert.equal(ppSh.name,'weapon-ppsh41');
assert.equal(mosin.name,'weapon-mosin');
assert.equal(sandbox.WeaponModels.create(null,THREE),null,'unarmed characters must not receive a placeholder weapon');

function meshNames(root){const names=[];root.traverse(node=>{if(node.isMesh)names.push(node.name);});return names;}
function assertDetailedWeapon(root,required){
  const names=meshNames(root);
  required.forEach(name=>assert.ok(names.includes(name),`${root.name} missing ${name}`));
  assert.ok(names.length<30,`${root.name} has too many mesh nodes for a handheld weapon`);
  root.traverse(node=>{if(node.isMesh){assert.equal(node.castShadow,true,`${node.name} must cast shadows`);assert.equal(node.receiveShadow,true,`${node.name} must receive shadows`);}});
}
assertDetailedWeapon(ppSh,[
  'weapon-ppsh41-stock','weapon-ppsh41-receiver','weapon-ppsh41-shroud',
  'weapon-ppsh41-barrel',
  'weapon-ppsh41-muzzle','weapon-ppsh41-rear-sight','weapon-ppsh41-front-sight',
  'weapon-ppsh41-trigger-guard','weapon-ppsh41-drum'
]);
assertDetailedWeapon(mosin,[
  'weapon-mosin-stock','weapon-mosin-receiver','weapon-mosin-bolt-handle',
  'weapon-mosin-barrel','weapon-mosin-rear-sight','weapon-mosin-front-sight',
  'weapon-mosin-sling-front','weapon-mosin-sling-rear'
]);

const hand=new Node();hand.name='mixamorig:RightHand';hand.add(ppSh);
assert.equal(ppSh.parent,hand,'a generated weapon must remain attachable to the real right-hand bone');

function rig(){
  const model=new Group();
  const rightHand=new Node();rightHand.name='mixamorig:RightHand';
  model.add(rightHand);
  model.getObjectByName=name=>{
    let found=null;model.traverse(node=>{if(!found&&node.name===name)found=node;});return found;
  };
  return model;
}
class Mixer { clipAction(){return {play(){},reset(){},crossFadeTo(){}};} update(){} }
class Euler { set(){return this;} }
class Quaternion { setFromEuler(){return this;} multiply(){return this;} }
const managerSandbox={globalThis:null,console,fetch:async()=>({ok:true,json:async()=>({roles:{rifleman:'rifle'},variants:{}})})};
managerSandbox.globalThis=managerSandbox;
vm.runInNewContext(source,managerSandbox,{filename:'src/entities/weapon-models.js'});
vm.runInNewContext(managerSource,managerSandbox,{filename:'src/entities/character-manager.js'});
managerSandbox.CharacterRoster={load:async()=>{},get:()=>({defaultState:'idle',appearance:{bodyScale:[1,1,1]}})};
managerSandbox.AnimationManager={create:()=>({setState(){return true;},update(){},dispose(){}})};
managerSandbox.CharacterManager.configure({
  THREE:{...THREE,AnimationMixer:Mixer,Euler,Quaternion,TextureLoader:class{async loadAsync(){return {};}}},
  loadGltf:async path=>path.includes('motion')?{animations:[{name:'idle_soldier_mixamo_rig',tracks:[]}]}:{scene:rig()},
  cloneScene:()=>rig()
});
const armed=managerSandbox.CharacterManager.spawnCharacter('rifleman',{x:0,y:0,z:0},{weapon:'ppsh41'});
await armed.ready;
const armedHand=armed.userData.model.getObjectByName('mixamorig:RightHand');
const attached=armedHand.children.find(child=>child.name==='weapon-ppsh41');
assert.ok(attached,'spawnCharacter weapon option must attach a PPSh to the real Mixamo right hand');
assert.deepEqual([attached.position.x,attached.position.y,attached.position.z],[.02,.04,.08],
  'the attached weapon must use the specified palm-local position');
assert.deepEqual([attached.rotation.x,attached.rotation.y,attached.rotation.z],[-Math.PI/2,0,Math.PI/2],
  'the attached weapon must use the specified palm-local rotation');
console.log('weapon-attachment-check: PASS');
