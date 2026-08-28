/* ================= بازیکن ================= */
function updatePlayer(dt){
  if(player.dead||cinematicControlsLocked)return;
  let thr=0,turn=0;
  if(keys.KeyW||keys.ArrowUp)thr=1;
  if(keys.KeyS||keys.ArrowDown)thr=-1;
  if(keys.KeyA||keys.ArrowLeft)turn+=1;
  if(keys.KeyD||keys.ArrowRight)turn-=1;
  if(stickMove.id!==null){thr=-stickMove.vy;turn=-stickMove.vx*1.2;}
  if(typeof TankAiming!=='undefined'){
    const aimingInput={
      shift:!!(keys.ShiftLeft||keys.ShiftRight),up:!!keys.ArrowUp,down:!!keys.ArrowDown,
      left:!!keys.ArrowLeft,right:!!keys.ArrowRight,throttle:thr,turn,traverseScale:TankDamage.modifiers(player).traverse
    };
    if(keys.KeyW||keys.KeyS)aimingInput.wasdThrottle=(keys.KeyW?1:0)-(keys.KeyS?1:0);
    if(keys.KeyA||keys.KeyD)aimingInput.wasdTurn=(keys.KeyA?1:0)-(keys.KeyD?1:0);
    const aiming=TankAiming.update(dt,aimingInput);
    thr=aiming.throttle;turn=aiming.turn;
  }
  player.yaw+=clamp(turn,-1,1)*1.7*dt;
  const moduleMods=TankDamage.modifiers(player);
  if(thr!==0)player.speed=clamp(player.speed+thr*9*dt,-7*moduleMods.speed,13*moduleMods.speed);
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

