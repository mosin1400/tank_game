import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/entities/tank-aiming.js',import.meta.url),'utf8');
const context=vm.createContext({console,Math});
vm.runInContext(source,context);

const player={
  turret:{rotation:{y:0}},
  gun:{rotation:{x:0}}
};
const controller=context.TankAiming.configure({
  getPlayer:()=>player,
  getAimPoint:()=>({x:0,y:0,z:100})
});

controller.setAngles(Math.PI,1);
assert.ok(Math.abs(controller.yaw()-145*Math.PI/180)<1e-9,'yaw must clamp at +145 degrees');
assert.ok(Math.abs(controller.pitch()-22*Math.PI/180)<1e-9,'pitch must clamp at +22 degrees');
controller.setAngles(-Math.PI,-1);
assert.ok(Math.abs(controller.yaw()+145*Math.PI/180)<1e-9,'yaw must clamp at -145 degrees');
assert.ok(Math.abs(controller.pitch()+8*Math.PI/180)<1e-9,'pitch must clamp at -8 degrees');

controller.reset();
const beforePrecisionPitch=controller.pitch();
const precision=controller.update(0.25,{shift:true,up:true,throttle:1,turn:1});
assert.equal(precision.precision,true,'Shift must enable precision mode');
assert.ok(controller.pitch()>beforePrecisionPitch,'Shift+Up must elevate the gun');
assert.equal(precision.throttle,0,'Shift+Arrow must not throttle the tank');

controller.reset();
const beforeDrivePitch=controller.pitch();
const driving=controller.update(0.25,{shift:false,up:true,throttle:1,turn:0});
assert.equal(driving.precision,false,'releasing Shift must return to third-person mode');
assert.equal(driving.throttle,1,'Up without Shift must continue to throttle the tank');
assert.equal(controller.pitch(),beforeDrivePitch,'Up without Shift must not change gun elevation');

console.log('PASS: tank aiming clamps gun limits and reserves arrows for precision aiming');
