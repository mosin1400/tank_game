/* ================= رزم ================= */
function hitMark(kill){
  hitEl.className=kill?'killmark':'on';
  clearTimeout(hitTimer);
  hitTimer=setTimeout(()=>hitEl.className='',kill?280:130);
}
function ammoWarn(){
  const t=performance.now();
  if(t-lastAmmoWarn>2500){
    lastAmmoWarn=t; sClick();
    showMsg('مهمات این سلاح تمام شد!',1400,'kill');
  }
}
function shootWeapon(){
  const w=WEAPONS[curWeapon];
  if(w.ammo<=0){ammoWarn();return;}
  if(w.salvo){salvoLeft=w.salvo;salvoT=0;}
  else shootShell(w);
  w.reloadLeft=w.reload;
}
function shootShell(w){
  if(w.ammo<=0)return;
  w.ammo--;
  player.recoil=w.recoil;
  fovKick=Math.min(6,fovKick+w.kick);
  player.root.updateMatrixWorld(true);
  const pos=new THREE.Vector3(),q=new THREE.Quaternion();
  player.gunTip.getWorldPosition(pos); player.gun.getWorldQuaternion(q);
  const dir=new THREE.Vector3(rand(-1,1)*w.spread,rand(-0.4,0.8)*w.spread,1)
    .applyQuaternion(q).normalize();
  const dmg=w.dmg*(buffPower>0?2:1);
  spawnBullet(pos,dir,w.spd,'player',dmg,w.rocket?'rocket':'shell',
    {splash:w.splash,expl:w.expl,gravity:w.rocket?5:0});
  spawnFlash(pos,w.expl*2);
  flashLight(pos.clone().add(new THREE.Vector3(0,0.6,0)),40+w.expl*20);
  shake=Math.min(2.5,shake+0.5+w.recoil*2.5);
  spawnSmoke(pos,1,{opacity:0.25,vy:1,maxLife:1,color:0xb0a890});
  if(w.rocket)sRocket(0.9);
  else{ sFire(1,w.snd); if(w.snd<0.8)sBoom(0.5,0.9); }
}
function firePlayer(){
  if(player.reload>0||state!=='play'||player.dead)return;
  player.reload=WEAPONS[curWeapon].reload*(buffRapid>0?0.45:1)*TankDamage.modifiers(player).reload;
  shootWeapon();
}
function fireMG(){
  player.root.updateMatrixWorld(true);
  const pos=new THREE.Vector3(),q=new THREE.Quaternion();
  player.mgTip.getWorldPosition(pos); player.gun.getWorldQuaternion(q);
  const dir=new THREE.Vector3(rand(-0.025,0.025),rand(-0.015,0.015),1)
    .applyQuaternion(q).normalize();
  spawnBullet(pos,dir,170,'player',6*(buffPower>0?2:1),'mg',{expl:0.3});
  spawnFlash(pos,0.9);
  shake=Math.min(1.2,shake+0.02);
  sMG(0.8);
}
function applySplash(pos,dmg,rad){
  if(OpeningOperation&&OpeningOperation.isActive())Convoy.damageNear(pos,dmg,rad);
  for(const e of[...enemies]){
    const d=Math.hypot(pos.x-e.root.position.x,pos.z-e.root.position.z);
    if(d<rad)damageEnemy(e,dmg*(1-d/rad*0.55),pos.clone());
  }
}
function damageEnemy(e,dmg,point){
  if(e.dead)return;
  e.hp-=dmg;
  spawnFire(point,10,5,0.45);
  spawnFlash(point,1.4);
  hitMark(false);
  sHit(clamp(1.2/(1+distToPlayer(point)*0.02),0.1,1));
  if(e.hp<=0)killEnemy(e);
}
function killEnemy(e){
  e.dead=true;
  const p=e.root.position.clone(); p.y=1.2;
  const isBoss=e.type==='boss';
  explode(p,isBoss?2.4:1.6,{dist:distToPlayer(p)});
  pendingFx.push({t:0.35,fn:()=>{const q=p.clone();q.y=2.2;
    explode(q,isBoss?1.4:1,{dist:distToPlayer(q),noCrater:true});}});
  e.root.traverse(o=>{if(o.isMesh)o.material=matChar;});
  e.turret.rotation.y+=rand(-0.8,0.8); e.gun.rotation.x=0.22;
  e.hpBg.visible=false; e.hpFill.visible=false;
  wrecks.push({root:e.root,smokeT:11});
  wreckObs.push({x:p.x,z:p.z,r:2.4*ETYPES[e.type].scale});
  if(wrecks.length>12){const old=wrecks.shift();scene.remove(old.root);wreckObs.shift();}
  const idx=enemies.indexOf(e); if(idx>=0)enemies.splice(idx,1);

//  if(curMission&&!e._counted){
//    e._counted=true;
//    if(curMission.t==='destroy') curMission.spawned++;
//    if(curMission.t==='waves'&&curMission.waveActive) curMission.toSpawn=Math.max(0,curMission.toSpawn-1);
//}




  
  if(isBoss){ bossRef=null; document.getElementById('bossbar').classList.remove('on'); }
  comboN=comboT>0?comboN+1:1; comboT=3.5;
  const mult=Math.min(4,1+Math.floor((comboN-1)/2));
  const gain=e.cfg.score*mult;
  score+=gain; kills++;
  console.log('💀 [KILL]',e.type,'| کشته‌های ماموریت:',(curMission?curMission.kills+1:'—'),'| زنده:',enemies.length-1,'| spawned:',curMission?curMission.spawned:'—');
  hitMark(true);
  floatText(`+${faNum(gain)}`,p,isBoss?'#e0a0ff':'#ffe9a8');
  if(mult>1)showMsg(`زنجیره انهدام ×${faNum(mult)}`,900,'kill');
  addFeed(`${e.cfg.name} منهدم شد +${faNum(gain)}`);
  timeScale=Math.min(timeScale,isBoss?0.15:0.28);
  if(Math.random()<0.14)spawnPowerup('ammo');
  else if(Math.random()<0.05)spawnPowerup('repair');
  if(curMission&&!curMission.done){
    curMission.kills++;
    console.log('🎯 [پیشرفت]',curMission.kills,'از',curMission.total);
    if(curMission.t==='destroy'&&curMission.kills>=curMission.total){
      console.log('🏁 [پیروزی] ماموریت تموم شد!');
      missionVictory();
    }    
    if(curMission.t==='boss'&&isBoss)missionVictory();
    if(curMission.t==='assault'&&curMission.kills>=curMission.total)missionVictory();
  }
}
function damagePlayer(d){
  if(player.dead)return;
  if(curMission&&curMission.done)return;
  player.hp-=d; dmgAlpha=0.85;
  shake=Math.min(2,shake+0.5);
  sHit(1);
  if(player.hp<=0){player.hp=0;diePlayer();}
}
function diePlayer(){
  player.dead=true; state='dying'; deathT=2.2;
  const p=player.pos.clone(); p.y=1.4;
  explode(p,2.4,{dist:0});
  player.root.traverse(o=>{if(o.isMesh){o.userData.om=o.material;o.material=matChar;}});
  player.turret.rotation.y+=0.5; player.gun.rotation.x=0.3;
  sBoom(1,1.8);
}

