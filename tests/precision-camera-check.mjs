import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

class Vector3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
  clone(){return new Vector3(this.x,this.y,this.z);}
  lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this;}
  normalize(){const length=Math.hypot(this.x,this.y,this.z)||1;this.x/=length;this.y/=length;this.z/=length;return this;}
  applyQuaternion(q){
    const x=this.x,y=this.y,z=this.z,qx=q.x,qy=q.y,qz=q.z,qw=q.w;
    const ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;
    this.x=ix*qw+iw*-qx+iy*-qz-iz*-qy;
    this.y=iy*qw+iw*-qy+iz*-qx-ix*-qz;
    this.z=iz*qw+iw*-qz+ix*-qy-iy*-qx;
    return this;
  }
}
class Quaternion{
  constructor(x=0,y=0,z=0,w=1){this.x=x;this.y=y;this.z=z;this.w=w;}
  copy(q){this.x=q.x;this.y=q.y;this.z=q.z;this.w=q.w;return this;}
}
function approximately(actual,expected,message){assert.ok(Math.abs(actual-expected)<1e-9,`${message}: expected ${expected}, got ${actual}`);}
function approximatelyVector(actual,expected,message){
  approximately(actual.x,expected.x,`${message}.x`);
  approximately(actual.y,expected.y,`${message}.y`);
  approximately(actual.z,expected.z,`${message}.z`);
}

const source=await fs.readFile(new URL('../src/entities/tank-aiming.js',import.meta.url),'utf8');
const context=vm.createContext({console,Math});
vm.runInContext(source,context);
const gunPose={
  position:new Vector3(10,2,3),
  quaternion:new Quaternion(0,Math.SQRT1_2,0,Math.SQRT1_2)
};
const gun={
  getWorldPosition(out){return out.copy(gunPose.position);},
  getWorldQuaternion(out){return out.copy(gunPose.quaternion);}
};
const controller=context.TankAiming.configure({
  THREE:{Vector3,Quaternion},
  getPlayer:()=>({gun,turret:{rotation:{y:0}}}),
  getAimPoint:()=>({x:10,y:2,z:83})
});

controller.update(10,{shift:true});
const precision=controller.cameraPose();
approximatelyVector(precision.position,{x:9.35,y:2.38,z:3},'precision camera must sit above and behind the rotated mantlet');
approximatelyVector(precision.lookAt,{x:90,y:2,z:3},'precision camera must look 80m down the rotated barrel axis');
assert.equal(precision.fov,24,'precision camera must use a 24 degree FOV');
assert.equal(precision.shakeScale,0.2,'precision camera must reduce shake to 20 percent');

controller.reset();
const thirdPerson=controller.cameraPose();
assert.equal(thirdPerson.fov,46,'reset must restore third-person FOV');

gunPose.position.set(20,4,6);
gunPose.quaternion=new Quaternion();
controller.update(0.01,{shift:true});
const blended=controller.cameraPose();
const targetPosition={x:20,y:4.38,z:5.35};
const targetLookAt={x:20,y:4,z:86};
assert.ok(blended.position.x>thirdPerson.position.x && blended.position.x<targetPosition.x,'small-dt camera position must blend between old and target pose');
assert.ok(blended.lookAt.x>targetLookAt.x && blended.lookAt.x<thirdPerson.lookAt.x,'small-dt look target must blend between old and target pose');
assert.ok(blended.fov>24 && blended.fov<46,'small-dt FOV must blend between third-person and precision targets');

console.log('PASS: precision camera follows a rotated barrel and smoothly transitions poses');
