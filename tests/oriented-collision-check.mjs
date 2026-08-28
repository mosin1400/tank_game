import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/input/controls.js',import.meta.url),'utf8');
const angle=Math.PI/4;
const context=vm.createContext({
  staticObs:[{type:'obb',x:0,z:0,hw:5,hd:1,ry:angle}],
  wreckObs:[],trees:[],enemies:[],player:{pos:{x:99,z:99}},BOUND:500,
  clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
  console
});
vm.runInContext(`${source};globalThis.resolveForTest=resolveCollisions;`,context);

// Local point (0, 1.45) is half a radius inside the long rotated obstacle.
// Three.js Y rotation maps local Z to world (sin(a), cos(a)).
const pos={x:Math.sin(angle)*1.45,z:Math.cos(angle)*1.45};
context.resolveForTest(pos,1,true,null);

const dx=pos.x, dz=pos.z;
const localX=Math.cos(angle)*dx-Math.sin(angle)*dz;
const localZ=Math.sin(angle)*dx+Math.cos(angle)*dz;
const closestX=Math.max(-5,Math.min(5,localX));
const closestZ=Math.max(-1,Math.min(1,localZ));
const clearance=Math.hypot(localX-closestX,localZ-closestZ);
if(clearance<.999)throw new Error(`rotated obstacle still overlaps tank circle: ${clearance}`);
if(Math.abs(localX)>.05)throw new Error('OBB correction must preserve the rail-local lateral axis');
console.log('PASS: oriented box collision resolves in local space');
