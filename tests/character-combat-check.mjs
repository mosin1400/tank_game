import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const filename=new URL('../src/entities/character-combat.js',import.meta.url);
const source=fs.existsSync(filename)?fs.readFileSync(filename,'utf8'):'';
const scheduled=[];
const cancelled=[];
const sandbox={
  globalThis:null,
  setTimeout(fn,delay){scheduled.push({fn,delay});return scheduled.length;},
  clearTimeout(id){cancelled.push(id);},
};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'src/entities/character-combat.js'});
const combat=sandbox.CharacterCombat;
assert.ok(combat,'CharacterCombat export missing');

let state='aim';
const coverCalls=[];
const ally={
  position:{x:4,y:0,z:0},
  parent:null,
  userData:{health:100,animation:{state:()=>state,setState:next=>{state=next;return true;}},requestCover:(point,urgency)=>coverCalls.push({point,urgency})}
};
const enemy={position:{x:8,y:0,z:0},parent:null,userData:{health:40}};
combat.register(ally,{faction:'allied',radius:.45,height:1.8});
combat.register(enemy,{faction:'enemy',radius:.45,height:1.8});

const hit=combat.traceSegment({x:0,y:1,z:0},{x:10,y:1,z:0});
assert.equal(hit.actor,ally,'swept hit testing must select the closest human volume');
assert.ok(Math.abs(hit.point.x-3.55)<1e-9,'swept hit testing must resolve the capsule entry point');
assert.equal(combat.traceSegment({x:0,y:2,z:0},{x:10,y:2,z:0}),null,'a segment above a character height must miss');

combat.applyHit(ally,{kind:'shell',point:{x:4,y:1,z:0},damage:90});
assert.equal(ally.userData.health,100,'allied shell hits must never lower health');
assert.equal(ally.userData.animation.state(),'hit-react','allied shell hits must trigger a reaction animation');
assert.ok(ally.userData.suppression>0,'allied shell hits must add suppression');
assert.equal(scheduled[0].delay,550,'hit reaction must persist for .55 seconds');
assert.equal(coverCalls.length,1,'allied shell hits must request cover exactly once');

combat.applyHit(ally,{kind:'shell',point:{x:4,y:1,z:0},damage:90});
assert.deepEqual(cancelled,[1],'a newer allied hit must cancel the previous reaction timer');
assert.equal(scheduled[1].delay,550,'a newer allied hit must receive a fresh .55 second reaction window');
scheduled[0].fn();
assert.equal(state,'hit-react','a cancelled stale reaction callback must not end the newer hit reaction');
scheduled[1].fn();
assert.equal(state,'suppressed','the newest reaction callback must end the active hit reaction');

combat.suppressNear({x:4,y:0,z:0},1,3);
assert.ok(ally.userData.suppression>=3,'nearby fire must add suppression through the public API');
assert.equal(combat.applyHit(enemy,{damage:15}).remaining,25,'enemy hits must expose remaining health');

const root={};ally.parent=root;enemy.parent=root;
assert.equal(combat.removeWithin(root),2,'mission cleanup must remove registered actors below its root');
assert.deepEqual(cancelled,[1],'mission cleanup must cancel a departed actor hit-reaction timer');
assert.equal(combat.traceSegment({x:0,y:1,z:0},{x:10,y:1,z:0}),null,'removed actors must no longer intercept shells');
combat.reset();
console.log('character-combat-check: PASS');
