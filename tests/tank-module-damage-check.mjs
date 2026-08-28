import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/combat/tank-damage.js',import.meta.url),'utf8').catch(error=>{
  if(error&&error.code==='ENOENT')return '';
  throw error;
});
const sandbox={globalThis:null};sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'src/combat/tank-damage.js'});
const damage=sandbox.TankDamage;
assert.ok(damage,'TankDamage export missing');

const tank={position:{x:10,y:0,z:20},rotation:{y:0},userData:{
  moduleBounds:{halfWidth:1.5,halfLength:3,trackHeight:.8,turretHeight:1.2}
}};
damage.initialize(tank);
assert.deepEqual({...tank.modules},{tracks:1,engine:1,turret:1},'initial module health must be full');
assert.equal(damage.classifyHit(tank,{x:10,y:.5,z:17.5}),'engine','rear-third hits must reach the engine');
assert.equal(damage.classifyHit(tank,{x:11.2,y:.4,z:20}),'tracks','low side hits must reach the tracks');
assert.equal(damage.classifyHit(tank,{x:10,y:1.7,z:20}),'turret','upper-center hits must reach the turret');
assert.equal(damage.classifyHit(tank,{x:10,y:.9,z:20}),'hull','other hits must remain hull hits');

damage.apply(tank,'tracks',.7);
assert.equal(tank.modules.tracks,.3);
assert.equal(tank.moduleModifiers.speed,.45,'critical tracks must cap speed at 45 percent');
damage.apply(tank,'engine',.7);
assert.equal(tank.moduleModifiers.speed,.45,'the strongest active speed penalty must win');
assert.equal(tank.moduleModifiers.reload,1.35,'critical engine damage must slow reload');
damage.apply(tank,'turret',.7);
assert.equal(tank.moduleModifiers.traverse,.4,'critical turret damage must cap traverse at 40 percent');
assert.equal(damage.apply(tank,'hull',.8).module,'hull','hull damage must be classified without corrupting module health');
assert.deepEqual({...tank.modules},{tracks:.3,engine:.3,turret:.3});

console.log('tank-module-damage-check: PASS');
