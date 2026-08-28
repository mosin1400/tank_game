import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const filename=new URL('../src/entities/tactical-command.js',import.meta.url);
const source=fs.existsSync(filename)?fs.readFileSync(filename,'utf8'):'';
const sandbox={globalThis:null};sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox,{filename:'src/entities/tactical-command.js'});
const commands=sandbox.TacticalCommand;
assert.ok(commands,'TacticalCommand export missing');

const calls=[];
const navigation={
  requestCover(actor,source,urgency){
    actor.userData.navigation={behavior:'run-to-cover',source,urgency};
    calls.push({method:'requestCover',actor,source,urgency});
  },
  setCommand(actor,command,target){
    actor.userData.navigation={command,target};
    calls.push({method:'setCommand',actor,command,target});
  }
};
commands.configure({navigation});

const alpha={position:{x:0,z:0},userData:{faction:'vardan'}};
const bravo={position:{x:2,z:0},userData:{faction:'allied'}};
const charlie={position:{x:4,z:0},userData:{}};
const enemy={position:{x:12,z:0},userData:{faction:'ash'}};
commands.register(alpha);
commands.register(bravo);
commands.register(charlie,{allied:true});
commands.register(enemy);

assert.equal(commands.issue('cover',{x:10,z:1}),3,'cover must command allied actors only');
assert.equal(alpha.userData.navigation.behavior,'run-to-cover','cover must delegate to cover navigation');
assert.equal(enemy.userData.navigation,undefined,'enemy actors must never receive allied commands');
assert.ok(calls.filter(call=>call.method==='requestCover').every(call=>call.urgency===2),
  'tactical cover orders must request urgent cover');

const attackTarget={position:{x:20,z:-3}};
assert.equal(commands.issue('attack',attackTarget),3,'attack must report the allied unit count');
assert.equal(bravo.userData.navigation.command,'attack','attack must delegate the attack state');
assert.equal(bravo.userData.navigation.target,attackTarget,'attack must preserve the supplied target identity');

const threat={position:{x:9,z:0}};
assert.equal(commands.issue('retreat',threat),3,'retreat must command every ally');
assert.equal(alpha.userData.navigation.command,'retreat','retreat must delegate a retreat state');
assert.equal(alpha.userData.navigation.target,threat,
  'retreat must preserve the threat so navigation can choose a vector away from it');

commands.register(alpha,{allied:true});
const replacementTarget={position:{x:25,z:5}};
assert.equal(commands.issue('attack',replacementTarget),3,
  'registering an existing actor again must not duplicate the command recipient');
assert.equal(alpha.userData.navigation.target,replacementTarget,
  'repeating a command must update its target');

assert.equal(commands.unregister(bravo),true,'unregister must remove an existing ally');
assert.equal(commands.unregister(bravo),false,'unregister must be idempotent');
assert.equal(commands.issue('cover',null),2,'removed allies must no longer receive commands');
assert.equal(commands.reset(),3,'reset must report and clear all registered actors including enemies');
assert.equal(commands.issue('cover',null),0,'reset must leave no command recipients');
assert.throws(()=>commands.issue('dance',null),/Unsupported tactical command/,
  'unknown commands must be rejected instead of silently changing actor state');

console.log('tactical-command-check: PASS');
