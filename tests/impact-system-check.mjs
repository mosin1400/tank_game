import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const moduleUrl=new URL('../src/combat/impact-system.js',import.meta.url);
const source=await fs.readFile(moduleUrl,'utf8').catch(function(error){
  if(error&&error.code==='ENOENT')return '';
  throw error;
});
const context=vm.createContext({console});
vm.runInContext(`${source};globalThis.ImpactSystemTest=ImpactSystem;`,context,{filename:'src/combat/impact-system.js'});
const ImpactSystem=context.ImpactSystemTest;

// These literals catch tunnelling, an ignored height check, and slab-boundary mistakes.
const wall={type:'aabb',x:5,z:0,hw:.25,hd:2,h:3};
const hit=ImpactSystem.segmentCollider({x:0,y:1,z:0},{x:10,y:1,z:0},wall);
assert.ok(hit,'a fast shell must hit the thin wall');
assert.ok(Math.abs(hit.point.x-4.75)<1e-6);
assert.equal(ImpactSystem.segmentCollider({x:0,y:4,z:0},{x:10,y:4,z:0},wall),null);

// Circle and rotated-box fixtures use hand-derived entry points, not the system's math.
const circleHit=ImpactSystem.segmentCollider({x:-4,y:1,z:0},{x:4,y:1,z:0},
  {type:'circle',x:0,z:0,r:1,h:2});
assert.ok(circleHit,'a segment through a circular collider must hit');
assert.ok(Math.abs(circleHit.point.x+1)<1e-6);
assert.equal(ImpactSystem.segmentCollider({x:-4,y:3,z:0},{x:4,y:3,z:0},
  {type:'circle',x:0,z:0,r:1,h:2}),null);

const obbHit=ImpactSystem.segmentCollider({x:0,y:1,z:-4},{x:0,y:1,z:4},
  {type:'obb',x:0,z:0,hw:2,hd:.25,ry:Math.PI/2,h:2});
assert.ok(obbHit,'a segment must respect an OBB rotation');
assert.ok(Math.abs(obbHit.point.z+2)<1e-6);

const farWall={type:'aabb',x:8,z:0,hw:.25,hd:1,h:3};
const character={id:'character-at-four'};
const characterCollider={type:'circle',x:4,z:0,r:.8,h:2,target:character};
ImpactSystem.configure({targets:function(){return [farWall,characterCollider];}});
const closest=ImpactSystem.trace({x:0,y:1,z:0},{x:10,y:1,z:0},{kind:'shell'});
assert.equal(closest.target,character,'trace must return the closest character before a farther wall');
assert.equal(closest.collider,characterCollider);

ImpactSystem.configure({targets:function(){return [];}});
const ground=ImpactSystem.trace({x:0,y:.5,z:0},{x:0,y:-.5,z:0},{kind:'shell'});
assert.ok(ground,'a descending projectile must hit ground continuously');
assert.equal(ground.kind,'ground');
assert.ok(Math.abs(ground.point.y-.06)<1e-6);

const impactResult={resolved:true};
ImpactSystem.configure({
  targets:function(){return [];},
  onImpact:function(projectile,impact){
    assert.equal(projectile.kind,'shell');
    assert.equal(impact.kind,'ground');
    return impactResult;
  }
});
assert.equal(ImpactSystem.resolve({kind:'shell'},ground),impactResult,'resolve must return the impact callback result');
ImpactSystem.reset();
assert.equal(ImpactSystem.trace({x:0,y:1,z:0},{x:1,y:1,z:0},{kind:'shell'}),null,
  'reset must clear registered collider dependencies');
assert.equal(ImpactSystem.resolve({kind:'shell'},ground),ground,
  'resolve without an impact callback must return the hit');

console.log('PASS: impact system sweeps circle/AABB/OBB, height, ground, closest trace, resolve and reset');
