/* ================= بازیکن ================= */
function updatePlayer(dt){
  if(player.dead)return;
  let thr=0,turn=0;
  if(keys.KeyW||keys.ArrowUp)thr=1;
  if(keys.KeyS||keys.ArrowDown)thr=-1;
  if(keys.KeyA||keys.ArrowLeft)turn+=1;
  if(keys.KeyD||keys.ArrowRight)turn-=1;
  if(stickMove.id!==null){thr=-stickMove.vy;turn=-stickMove.vx*1.2;}
  player.yaw+=clamp(turn,-1,1)*1.7*dt;
  if(thr!==0)player.speed=clamp(player.speed+thr*9*dt,-7,13);
  else player.speed*=Math.exp(-2.2*dt);
  const fwd=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));
  player.pos.addScaledVector(fwd,player.speed*dt);
  resolveCollisions(player.pos,2.2,true,null);
  player.root.position.copy(player.pos);
  player.root.rotation.y=player.yaw;
  player.vel.copy(fwd).multiplyScalar(player.speed);
  player.wheelSpin+=player.speed*dt/0.42;
  const wi=player.wheelInfo;
  if(wi.ready&&wi.steel){
    const dm=new THREE.Object3D();
    const qYaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),player.yaw);
    const qSpin=new THREE.Quaternion();
    wi.wheelPos.forEach((lp,i)=>{
      qSpin.setFromAxisAngle(new THREE.Vector3(1,0,0),player.wheelSpin);
      dm.position.copy(lp);
      dm.quaternion.copy(qSpin);
      dm.updateMatrix();
      wi.steel.setMatrixAt(i,dm.matrix); wi.rubber.setMatrixAt(i,dm.matrix);
    });
    wi.steel.instanceMatrix.needsUpdate=true;
    wi.rubber.instanceMatrix.needsUpdate=true;
  }
  if(Math.abs(player.speed)>4&&Math.random()<dt*7){
    const back=player.pos.clone().addScaledVector(fwd,-3.2); back.y=0.3;
    spawnSmoke(back,1,{opacity:0.28,vy:1.2,color:0x9a8f74,maxLife:1.4});
  }
  let desiredWorld;
  if(stickAim.id!==null&&Math.hypot(stickAim.vx,stickAim.vy)>0.2)
    desiredWorld=player.yaw+Math.atan2(stickAim.vx,stickAim.vy);
  else desiredWorld=Math.atan2(aimPoint.x-player.pos.x,aimPoint.z-player.pos.z);
  let local=desiredWorld-player.yaw-player.turret.rotation.y;
  while(local>Math.PI)local-=Math.PI*2; while(local<-Math.PI)local+=Math.PI*2;
  player.turret.rotation.y+=clamp(local,-2.4*dt,2.4*dt);
  player.gun.rotation.x=-0.01;
  player.recoil*=Math.exp(-9*dt);
  player.gun.position.z=1.35-player.recoil;
  player.reload-=dt;
  WEAPONS.forEach(w=>w.reloadLeft=Math.max(0,w.reloadLeft-dt));
  if(salvoLeft>0){
    salvoT-=dt;
    if(salvoT<=0){
      salvoT=0.1;
      const w=WEAPONS[curWeapon];
      if(w.ammo>0)shootShell(w); else salvoLeft=0;
      salvoLeft--;
    }
  }
  if(fireHeld&&player.reload<=0)firePlayer();
  player.mgT-=dt;
  if(mgHeld&&player.mgT<=0){player.mgT=0.085;fireMG();}
}

