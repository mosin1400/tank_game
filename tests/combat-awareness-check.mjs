import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/combat/combat-awareness.js',import.meta.url),'utf8').catch(error=>{
  if(error&&error.code==='ENOENT')return '';
  throw error;
});
const suppressionCalls=[];
const sandbox={globalThis:null,CharacterCombat:{
  suppressNear(point,radius,amount){
    suppressionCalls.push({point,radius,amount});
    return 3;
  }
}};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'src/combat/combat-awareness.js'});
const awareness=sandbox.CombatAwareness;
assert.ok(awareness,'CombatAwareness export missing');

awareness.registerSmoke({position:{x:5,y:0,z:0},radius:2,density:1,life:2});
assert.ok(awareness.visibilityBetween({x:0,y:0,z:0},{x:10,y:0,z:0})<.35,
  'dense smoke centered on sight line must substantially hide the target');
assert.equal(awareness.visibilityBetween({x:0,y:0,z:5},{x:10,y:0,z:5}),1,
  'smoke outside the sight line must not reduce visibility');

assert.equal(awareness.suppressNear({x:2,y:0,z:3},3.5,4),3,
  'suppression facade must return the affected-character count');
assert.deepEqual(suppressionCalls,[{point:{x:2,y:0,z:3},radius:3.5,amount:4}],
  'suppression facade must forward the real point, radius and amount');

awareness.update(2.1);
assert.equal(awareness.visibilityBetween({x:0,y:0,z:0},{x:10,y:0,z:0}),1,
  'expired smoke must stop affecting visibility');
assert.equal(awareness.reset(),0,'reset after expiry must report no remaining smoke volumes');

console.log('combat-awareness-check: PASS');
