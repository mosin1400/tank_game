import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const filename=new URL('../src/entities/character-navigation.js',import.meta.url);
const source=fs.existsSync(filename)?fs.readFileSync(filename,'utf8'):'';
const sandbox={globalThis:null};sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'src/entities/character-navigation.js'});
const navigation=sandbox.CharacterNavigation;
assert.ok(navigation,'CharacterNavigation export missing');

const actors=[];
const threat={position:{x:10,y:0,z:0}};
let obstacles=[];
navigation.configure({getObstacles:()=>obstacles,getThreats:()=>[threat],getAllies:()=>actors});

const scout={position:{x:0,y:0,z:0},rotation:{y:0},userData:{}};
actors.push(scout);
navigation.register(scout,{behavior:'run-to-cover',speed:3,radius:.4});
const retreat=navigation.chooseStep(scout,'run-to-cover',1);
assert.ok(retreat.x<0,'a soldier must choose a destination away from a threat on positive X');
assert.ok(Math.hypot(retreat.x-10,retreat.z)>=10,
  'a navigation choice must never move the soldier closer to the enemy');

obstacles=[{kind:'aabb',minX:-4,maxX:-.6,minZ:-1,maxZ:1}];
const aroundWall=navigation.chooseStep(scout,'run-to-cover',1);
assert.ok(Math.abs(aroundWall.z)>1,
  'a wall blocking the direct retreat must force a non-colliding side route');
assert.ok(!(aroundWall.x>=-4.4&&aroundWall.x<=-.2&&aroundWall.z>=-1.4&&aroundWall.z<=1.4),
  'the chosen destination must stay outside an actor-radius-expanded AABB');

obstacles=[];
navigation.reset();actors.length=0;
const alpha={position:{x:0,y:0,z:0},rotation:{y:0},userData:{}};
const bravo={position:{x:0,y:0,z:0},rotation:{y:0},userData:{}};
actors.push(alpha,bravo);
navigation.register(alpha,{behavior:'run-to-cover',speed:3,radius:.4});
navigation.register(bravo,{behavior:'run-to-cover',speed:3,radius:.4});
const alphaStep=navigation.chooseStep(alpha,'run-to-cover',1);
const bravoStep=navigation.chooseStep(bravo,'run-to-cover',1);
assert.ok(Math.hypot(alphaStep.x-bravoStep.x,alphaStep.z-bravoStep.z)>=1.2,
  'soldiers sharing a start point must choose separated destinations');

const circle={kind:'circle',position:{x:-2,z:0},radius:.8};
const obb={kind:'obb',center:{x:-1.8,z:1.8},halfSize:{x:.7,z:.3},yaw:Math.PI/4};
obstacles=[circle,obb];
const safe=navigation.chooseStep(alpha,'run-to-cover',1);
assert.ok(Number.isFinite(safe.x)&&Number.isFinite(safe.z)&&Number.isFinite(safe.yaw),
  'circle and oriented-box avoidance must still yield a finite safe step');

navigation.requestCover(alpha,{x:8,z:0},2);
assert.equal(alpha.userData.navigation.behavior,'run-to-cover',
  'a cover request must switch only that actor into cover-seeking behavior');
navigation.setCommand(alpha,'retreat',{x:10,z:0});
assert.equal(alpha.userData.navigation.command,'retreat','retreat orders must be stored on the requested actor');

const before={x:alpha.position.x,z:alpha.position.z};
obstacles=[];
navigation.update(.25);
assert.ok(Math.hypot(alpha.position.x-before.x,alpha.position.z-before.z)<=.75+1e-9,
  'update steering must remain bounded by speed times delta time');

const root={};alpha.parent=root;bravo.parent=root;
assert.equal(navigation.removeWithin(root),2,'mission cleanup must unregister actors beneath its root');
assert.equal(navigation.reset(),0,'reset after cleanup must report no remaining actors');
console.log('character-navigation-check: PASS');
