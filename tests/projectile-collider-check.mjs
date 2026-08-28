import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/input/controls.js',import.meta.url),'utf8');
const context=vm.createContext({console});
vm.runInContext(`${source};globalThis.pointHitsColliderTest=pointHitsCollider;`,context);
const hit=context.pointHitsColliderTest;
if(!hit({x:1,z:1},{type:'circle',x:0,z:0,r:2}))throw new Error('shell point must hit circular props');
if(!hit({x:1.8,z:0},{type:'aabb',x:0,z:0,hw:2,hd:1}))throw new Error('shell point must hit axis-aligned props');
const yaw=Math.PI/4;
const onRotatedLongAxis={x:Math.cos(yaw)*3,z:-Math.sin(yaw)*3};
if(!hit(onRotatedLongAxis,{type:'obb',x:0,z:0,hw:4,hd:.6,ry:yaw}))throw new Error('shell point must hit rotated wagon footprint');
if(hit({x:0,z:2},{type:'obb',x:0,z:0,hw:4,hd:.6,ry:yaw}))throw new Error('shell point outside rotated wagon must remain clear');
console.log('PASS: projectiles detect circle, AABB and OBB scene props');
