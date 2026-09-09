import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/scenes/scene-builder.js',import.meta.url),'utf8');
const layout={
  id:'scene-01',
  landmarks:{fuelYard:[-68,0,78],canalBridge:[12,0,30],watchTower:[126,0,-60],generator:[108,0,-46],exitGate:[118,0,-38]}
};
const transform=()=>({x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}});
class Group{constructor(){this.children=[];this.position=transform();this.scale=transform();this.rotation={x:0,y:0,z:0};this.userData={};}add(...items){for(const item of items)item.parent=this;this.children.push(...items);}}
class Mesh extends Group{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class Sprite extends Mesh{}
class TextureLoader{load(path){return {path,repeat:{set(){}},offset:{set(){}},wrapS:null,wrapT:null,colorSpace:null};}}
const THREE={
  Group,Mesh,Sprite,TextureLoader,
  CylinderGeometry:class{},SpriteMaterial:class{constructor(options){Object.assign(this,options);}},
  RepeatWrapping:1,SRGBColorSpace:2,AdditiveBlending:3
};
const staticObs=[];
const spawnedCharacters=[];
const scene={children:[],add(item){this.children.push(item);},remove(item){this.children=this.children.filter(x=>x!==item);}};
const addPrimitive=(parent,kind,args)=>{const item=new Group();item.kind=kind;item.args=args;parent.add(item);return item;};
const context=vm.createContext({
  THREE,SceneLibrary:{getScene:id=>id==='scene-01'?layout:null},scene,staticObs,
  setLegacyWorldVisible(){},
  mat:options=>Object.assign({color:options&&options.color},options),
  mkBox:(parent,...args)=>addPrimitive(parent,'box',args),
  mkCyl:(parent,...args)=>addPrimitive(parent,'cylinder',args),
  mkSph:(parent,...args)=>addPrimitive(parent,'sphere',args),
  CharacterManager:{
    spawnCharacter(role,position,options){
      const actor=new Group();actor.position.set(position.x,position.y,position.z);actor.userData.spawnOptions=options;
      options.parent.add(actor);spawnedCharacters.push(actor);return actor;
    },
    removeWithin(){}
  },
  matTrunk:{},matRust:{},matDark:{},matRoof:{},matGray:{},matBag:{},matRock:{},matLeaf:{},
  texGlow:{},console
});
vm.runInContext(`${source};globalThis.SceneBuilderTest=SceneBuilder;`,context);
const active=context.SceneBuilderTest.loadForMission({sceneId:'scene-01'});
if(!active)throw new Error('M01 scene did not build');
if(typeof context.SceneBuilderTest.setPhase!=='function')throw new Error('M01 needs phase-controlled visual escalation');
const all=[];
(function walk(node){all.push(node);for(const child of node.children||[])walk(child);})(active.root);
const actors=all.filter(node=>node.userData&&node.userData.actorRole);
const props=all.filter(node=>node.userData&&node.userData.sceneProp);
const wagons=all.filter(node=>node.userData&&node.userData.railWagon);
if(active.colliders.length<24)throw new Error(`M01 needs dense major-object collisions; got ${active.colliders.length}`);
if(actors.length!==5)throw new Error(`M01 must contain exactly five military story/observer actors; got ${actors.length}`);
if(actors.some(actor=>actor.userData.actorRole==='marium'))throw new Error('the redundant tank driver must not spawn');
if(props.length<75)throw new Error(`M01 dressing is too sparse; got ${props.length} props`);
if(wagons.length!==3)throw new Error('M01 must build three aligned rail wagons');
const runners=spawnedCharacters.filter(actor=>actor.userData.spawnOptions.movement);
if(runners.length!==4)throw new Error(`four exposed yard actors must flee the bombardment; got ${runners.length}`);
if(runners.some(actor=>actor.userData.spawnOptions.movement.state!=='run'))throw new Error('bombardment movement must use the run animation');
console.log('PASS: M01 dense art, actor and collider contract');
