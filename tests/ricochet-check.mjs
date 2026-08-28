import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/combat/combat-awareness.js',import.meta.url),'utf8').catch(error=>{
  if(error&&error.code==='ENOENT')return '';
  throw error;
});
const sandbox={globalThis:null};sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'src/combat/combat-awareness.js'});
const awareness=sandbox.CombatAwareness;
assert.ok(awareness,'CombatAwareness export missing');

const result=awareness.resolveRicochet({
  material:'steel',incidence:.1,velocity:{x:10,y:-1,z:0},normal:{x:0,y:1,z:0},
  damage:40,life:2,ricocheted:false
},()=>0);
assert.equal(result.kind,'ricochet','a deterministic shallow steel hit must ricochet');
assert.ok(result.velocity.y>0,'reflected velocity must point away from the surface');
assert.ok(Math.abs(Math.hypot(result.velocity.x,result.velocity.y,result.velocity.z)-Math.hypot(10,1)*.45)<1e-9,
  'ricochet speed must fall to 45 percent');
assert.equal(result.damage,12,'ricochet damage must fall to 30 percent');
assert.equal(result.life,.8,'ricochet life must be capped at .8 seconds');
assert.equal(result.ricocheted,true,'the projectile must be marked to prevent a second ricochet');

assert.equal(awareness.resolveRicochet({
  material:'wood',incidence:.1,velocity:{x:10,y:-1,z:0},normal:{x:0,y:1,z:0},damage:40,life:2
},()=>0),null,'weak materials must not use the steel ricochet branch');
assert.equal(awareness.resolveRicochet({
  material:'steel',incidence:.1,velocity:{x:10,y:-1,z:0},normal:{x:0,y:1,z:0},damage:40,life:2,ricocheted:true
},()=>0),null,'a projectile must ricochet at most once');

console.log('ricochet-check: PASS');
