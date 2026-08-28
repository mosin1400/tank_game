import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const moduleUrl=new URL('../src/combat/destructible-registry.js',import.meta.url);
const source=await fs.readFile(moduleUrl,'utf8').catch(function(error){
  if(error&&error.code==='ENOENT')return '';
  throw error;
});
const context=vm.createContext({console});
vm.runInContext(`${source};globalThis.DestructibleRegistryTest=DestructibleRegistry;`,context,
  {filename:'src/combat/destructible-registry.js'});
const registry=context.DestructibleRegistryTest;

const dents=[];
const breaks=[];
const craters=[];
const removed=[];
registry.configure({
  random:function(){return .5;},
  maxFragments:7,
  onDent:function(target,impact){dents.push({target,impact});},
  onBreak:function(target,impact,count){breaks.push({target,impact,count});},
  onGroundImpact:function(impact,profile){craters.push({impact,profile});},
  removeCollider:function(collider){removed.push(collider);}
});

const steel=registry.register({
  object:{name:'armor-plate'},collider:{id:'steel-collider'},material:'steel',durability:100,breakable:false
});
const steelResult=registry.handleImpact(steel,{damage:6,kind:'mg',incidence:.2,point:{x:1,y:1,z:1}});
assert.equal(steelResult.result,'dent','steel must dent rather than break under machine-gun fire');
assert.equal(steelResult.remaining,94);
assert.equal(dents.length,1,'a visible dent callback must be emitted once');
assert.equal(removed.length,0,'resistant steel must retain collision');

const wood=registry.register({
  object:{name:'wood-crate',visible:true},collider:{id:'wood-collider'},material:'wood',durability:35,breakable:true
});
const woodResult=registry.handleImpact(wood,{damage:60,kind:'shell',incidence:.8,point:{x:2,y:.5,z:3}});
assert.equal(woodResult.result,'break','a shell exceeding wood durability must break it');
assert.equal(woodResult.remaining,0);
assert.equal(wood.object.visible,false,'the source mesh must be hidden after breaking');
assert.deepEqual(removed,[wood.collider],'breaking a prop must remove its collision');
assert.equal(breaks[0].count,6,'deterministic debris count must remain in the four-to-eight range');

const glass=registry.register({
  object:{name:'window',visible:true},collider:{id:'glass-collider'},material:'glass',durability:1,breakable:true
});
assert.equal(registry.handleImpact(glass,{damage:4,kind:'mg',point:{x:0,y:1,z:0}}).result,'break');
assert.equal(breaks[1].count,1,'the shared fragment budget must cap later break callbacks');

const groundResult=registry.handleImpact(null,{
  kind:'ground',projectileKind:'shell',damage:50,point:{x:4,y:.06,z:-2},normal:{x:0,y:1,z:0}
});
assert.equal(groundResult.result,'crater');
assert.equal(craters.length,1);
assert.deepEqual({...craters[0].profile},{explosionSize:.45,craterSize:.7,dustCount:8},
  'a normal shell ground hit must emit the literal small-impact profile');

assert.equal(registry.unregister(steel),true);
assert.equal(registry.unregister(steel),false,'unregister must be idempotent');
assert.equal(registry.handleImpact(wood,{damage:10,kind:'mg'}).result,'ignored',
  'a broken target must not emit duplicate debris or collision removal');
assert.equal(registry.reset(),2,'reset must report and remove both broken records retained for lifecycle cleanup');

console.log('PASS: destructible registry applies dents, bounded weak-prop breaks, collision removal and ground craters');
