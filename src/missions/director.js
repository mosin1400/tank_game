/* ================= دشمنان و ماموریت ================= */
function pickTypeFor(idx){
  const r=Math.random();
  const heavyC=Math.min(0.3,0.04+idx*0.014);
  if(idx>=2&&r<heavyC)return 'heavy';
  if(idx>=1&&r<heavyC+0.35)return 'light';
  return 'medium';
}
function spawnEnemy(typeKey,opts={}){
  if(!curMission||curMission.done||state!=='play')return null;
  const tk=typeKey||pickTypeFor(curMission?curMission.idx:0);
  const cfg=ETYPES[tk];
  const diff=opts.diff||1;
  const e=buildPanzer(tk);
  let x,z,ok=false,tries=0;
  while(!ok&&tries++<25){
    const a=Math.random()*Math.PI*2,d=rand(70,105);
    x=clamp(player.pos.x+Math.cos(a)*d,-BOUND+6,BOUND-6);
    z=clamp(player.pos.z+Math.sin(a)*d,-BOUND+6,BOUND-6);
    ok=true;
    for(const o of staticObs)
      if(o.type==='aabb'&&Math.abs(x-o.x)<o.hw+3&&Math.abs(z-o.z)<o.hd+3)ok=false;
  }
  e.root.position.set(x,0,z);
  e.root.rotation.y=Math.atan2(player.pos.x-x,player.pos.z-z);
  e.cfg=cfg; e.type=tk;
  e.hp=e.maxHp=opts.hp||cfg.hp*diff;
  e.cooldown=rand(1.4,2.8)+Math.max(0,1.2-(curMission?curMission.idx:0)*0.15);
  e.speed=rand(cfg.spd[0],cfg.spd[1])*Math.min(1.25,1+(curMission?curMission.idx*0.008:0));
  if(e.type==='light') e.speed*=rand(1.1,1.3);
  if(e.type==='heavy') e.speed*=rand(0.8,0.95);
  e.stopRange=rand(cfg.stop[0],cfg.stop[1]);
  e.wander=rand(0,6.28); e.dead=false;
  e.stationary=!!opts.stationary;
  e.radius=2.3*cfg.scale*(opts.scale||1);
  e.flank=Math.random()<0.5?1:-1;
    const camp=(curMission?curMission.def.c:1);
  const variant=['pz1','pz2','panther','tiger'][camp-1]||'pz4';
  /* بازسازی با مدل انتخابی */
  scene.remove(e.root);
  const rebuilt=buildPanzer(tk,variant);
  rebuilt.root.position.copy(e.root.position);
  rebuilt.root.rotation.copy(e.root.rotation);
  rebuilt.root.scale.copy(e.root.scale);
  Object.assign(e,rebuilt);
  TankDamage.initialize(e);
  scene.add(e.root);
  e.mgLeft=0; e.mgT=0;
  e.dmg=cfg.dmg+Math.floor((curMission?curMission.idx:0)*0.3);
  if(opts.scale)e.root.scale.setScalar(cfg.scale*opts.scale);
  const bg=new THREE.Sprite(new THREE.SpriteMaterial({color:0x14160f,transparent:true,opacity:0.85,depthWrite:false}));
  bg.scale.set(2.5,0.24,1); bg.position.y=3.6; e.root.add(bg);
  const barCol=tk==='boss'?0xc04adf:(tk==='heavy'?0xc04848:(tk==='light'?0xd8a13a:0xd86633));
  const fl=new THREE.Sprite(new THREE.SpriteMaterial({color:barCol,transparent:true,opacity:0.95,depthWrite:false}));
  fl.scale.set(2.3,0.16,1); fl.position.y=3.6; e.root.add(fl);
  e.hpBg=bg; e.hpFill=fl;
  scene.add(e.root); enemies.push(e);
  spawnSmoke(new THREE.Vector3(x,0.5,z),3,{opacity:0.35});
  if(tk==='boss'){
    bossRef=e;
    document.getElementById('bossname').textContent=opts.name||'ببر آهنی';
    document.getElementById('bossbar').classList.add('on');
  }
  return e;
}
function updateEnemies(dt,t){
  if(curMission&&curMission.done)return;
  for(const e of enemies){
    const ep=e.root.position,cfg=e.cfg;
    const dx=player.pos.x-ep.x,dz=player.pos.z-ep.z,dist=Math.hypot(dx,dz);
    const visibility=CombatAwareness.visibilityBetween(ep,player.pos);
    const moduleMods=TankDamage.modifiers(e);
    const toP=Math.atan2(dx,dz);
    let hull=e.root.rotation.y;
    const wander=Math.sin(t*0.5+e.wander)*0.5;
    let desired=toP;
    if(e.type==='light'&&dist>45)desired=toP+e.flank*0.95+wander*0.2;
    else if(e.type==='medium'&&dist>e.stopRange)desired=toP+wander*0.4;
    let hd=desired-hull;
    while(hd>Math.PI)hd-=Math.PI*2; while(hd<-Math.PI)hd+=Math.PI*2;
    hull+=clamp(hd,-1.1*dt,1.1*dt);
    e.root.rotation.y=hull;
    if(!e.pauseT) e.pauseT=0;
    if(!e.strafePhase) e.strafePhase=rand(0,6.28);
    if(e.pauseT>0){ e.pauseT-=dt; }
    else if(dist>e.stopRange&&!player.dead){
      if(Math.random()<0.003) e.pauseT=rand(0.8,2.2); // گاهی بایست
      const strafe=Math.sin(t*0.7+e.strafePhase)*0.35;
      const moveDir=hull+strafe;
      const f=new THREE.Vector3(Math.sin(moveDir),0,Math.cos(moveDir));
      ep.addScaledVector(f,e.speed*moduleMods.speed*dt);
      for(const w of e.wheels)w.rotation.x+=e.speed*moduleMods.speed*dt/0.36;
      if(Math.random()<dt*3){
        const b=ep.clone().addScaledVector(f,-2.8); b.y=0.3;
        spawnSmoke(b,1,{opacity:0.22,vy:1,color:0x8f8672,maxLife:1.2});
      }
    }
    if(dist<14&&!player.dead&&e.type!=='boss'){
      const back=new THREE.Vector3(-Math.sin(hull),0,-Math.cos(hull));
      ep.addScaledVector(back,e.speed*0.5*dt);
    }
    resolveCollisions(ep,e.radius,false,e);
    let aimYaw=toP;
    if(dist>50&&e.type!=='boss') aimYaw=hull+(toP-hull)*0.4; // دور: ترکیب جهت حرکت + بازیکن
    let tl=aimYaw-hull-e.turret.rotation.y;
    while(tl>Math.PI)tl-=Math.PI*2; while(tl<-Math.PI)tl+=Math.PI*2;
    const hullDelta=Math.abs(hull-(e._prevHull||hull));
    e._prevHull=hull;
    const turretLag=Math.max(0.3,1-hullDelta*2); // چرخش بدنه → برجک کندتر
    e.turret.rotation.y+=clamp(tl,-cfg.tSpd*moduleMods.traverse*dt*turretLag,cfg.tSpd*moduleMods.traverse*dt*turretLag);
    e.cooldown-=dt;
    const acc=e.type==='boss'?0.16:(e.type==='heavy'?0.1:0.12);
    if(e.mgLeft>0){
      e.mgT-=dt;
      if(e.mgT<=0&&!player.dead){
        e.mgT=0.13; e.mgLeft--;
        e.root.updateMatrixWorld(true);
        const mp=new THREE.Vector3();
        e.gunTip.getWorldPosition(mp);
        const dir=player.pos.clone().add(new THREE.Vector3(0,1.4,0)).sub(mp).normalize();
        dir.x+=rand(-0.05,0.05); dir.z+=rand(-0.05,0.05); dir.normalize();
        spawnBullet(mp,dir,160,'enemy',Math.max(2,e.dmg*0.3),'mg',{expl:0.25});
        spawnFlash(mp,0.8);
        sMG(clamp(1.2/(1+dist*0.02),0.05,0.8));
      }
    }
    else if(!player.dead&&dist<85*Math.max(.25,visibility)&&Math.abs(tl)<acc&&e.cooldown<=0){
      e.cooldown=rand(cfg.cd[0],cfg.cd[1]);
      if(dist<45&&Math.random()<(e.type==='light'?0.35:0.18)){
        e.mgLeft=3+(Math.random()*3|0); e.mgT=0;
      }
      else{
        e.root.updateMatrixWorld(true);
        const lead=dist/55*0.65;
        const aim=player.pos.clone().addScaledVector(player.vel,lead);
        const err=(1.4+Math.max(0,1.4-(curMission?curMission.idx:0)*0.2))/Math.max(.2,visibility);
        aim.x+=rand(-err,err); aim.z+=rand(-err,err); aim.y=1.9;
        const mp=new THREE.Vector3(),mq=new THREE.Quaternion();
        e.gunTip.getWorldPosition(mp); e.gun.getWorldQuaternion(mq);
        const dir=aim.sub(mp).normalize();
        dir.x+=rand(-0.02,0.02); dir.z+=rand(-0.02,0.02); dir.normalize();
        spawnBullet(mp,dir,e.type==='boss'?62:55,'enemy',e.dmg,'shell',{expl:0.7});
        spawnFlash(mp,1.6);
        sFire(clamp(1.1/(1+dist*0.015),0.08,0.9));
      }
    }
    e.hpFill.scale.x=2.3*Math.max(0,e.hp/e.maxHp);
  }
}
function projectileImpactTargets(projectile){
  const targets=staticObs.slice();
  if(projectile&&projectile.kind!=='mg')for(const tr of trees)if(tr.alive){
    targets.push({type:'circle',x:tr.x,z:tr.z,r:.55,h:3.6,target:{kind:'tree',value:tr},material:'wood'});
  }
  if(projectile&&projectile.owner==='player')for(const e of enemies)if(!e.dead){
    targets.push({type:'circle',x:e.root.position.x,z:e.root.position.z,r:e.radius+.2,h:3.6,target:{kind:'enemy',value:e},material:'steel'});
  }
  if(projectile&&projectile.owner==='enemy'&&player&&!player.dead){
    targets.push({type:'circle',x:player.pos.x,z:player.pos.z,r:2.4,h:3.4,target:{kind:'player',value:player},material:'steel'});
  }
  return targets;
}
function resolveProjectileImpact(b,hit){
  const p=new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z),target=hit.target;
  const hitMaterial=hit.collider&&hit.collider.material;
  const ricochet=CombatAwareness.resolveRicochet({material:hitMaterial,ricocheted:b.ricocheted,velocity:b.vel,normal:hit.normal,damage:b.dmg,life:b.life});
  if(ricochet){b.vel.set(ricochet.velocity.x,ricochet.velocity.y,ricochet.velocity.z);b.dmg=ricochet.damage;b.life=ricochet.life;b.ricocheted=true;p.addScaledVector(new THREE.Vector3(hit.normal.x,hit.normal.y,hit.normal.z),.08);b.mesh.position.copy(p);spawnDebris(p,3);return {ricochet:true};}
  if(hit.kind==='character'&&hit.actor){
    CharacterCombat.applyHit(hit.actor,{kind:b.kind,damage:b.dmg,suppression:b.kind==='mg'?2:8,point:p});
    explode(p,.28,{dist:distToPlayer(p),noCrater:true,smoke:0x6f6a5d});
  }else if(target&&target.kind==='enemy'){
    const module=TankDamage.classifyHit(target.value,p);TankDamage.apply(target.value,module,Math.min(.8,b.dmg/120));
    damageEnemy(target.value,b.dmg,p.clone());
    explode(p,b.expl*.7,{dist:distToPlayer(p),noCrater:true});
  }else if(target&&target.kind==='player'){
    const module=TankDamage.classifyHit(player,p);TankDamage.apply(player,module,Math.min(.7,b.dmg/140));
    if(module!=='hull')showMsg(`آسیب به ${module==='tracks'?'زنجیر':module==='engine'?'موتور':'برجک'} تانک`,1800);
    explode(p,.6,{dist:0,noCrater:true});
    if(b.srcPos)showDamageDir(b.srcPos);
    damagePlayer(b.dmg);
  }else if(target&&target.kind==='tree'){
    target.value.alive=false;target.value.root.visible=false;
    spawnSmoke(new THREE.Vector3(target.value.x,2,target.value.z),4,{opacity:.4,color:0x55603a});
    spawnFire(new THREE.Vector3(target.value.x,1.6,target.value.z),10,4,.6);sHit(.7);
  }else{
    if(hit.kind==='ground')DestructibleRegistry.handleImpact(null,{kind:'ground',projectileKind:b.kind,damage:b.dmg,point:hit.point,normal:hit.normal});
    else if(hit.collider){
      if(!hit.collider.__destructibleEntry){
        const object=hit.collider.targetObject||(hit.collider.__impactObject={visible:true});
        hit.collider.__destructibleEntry=DestructibleRegistry.register({object,collider:hit.collider,material:hit.collider.material||'concrete',durability:hit.collider.durability||80});
      }
      DestructibleRegistry.handleImpact(hit.collider.__destructibleEntry,{kind:b.kind,damage:b.dmg,point:hit.point,normal:hit.normal});
    }
    explode(p,b.expl*(hit.kind==='ground'?1:.8),{dist:distToPlayer(p),noCrater:hit.kind!=='ground'||b.expl<.9,smoke:hit.kind==='ground'?0x8f8268:0x77736a});
  }
  if(b.owner==='player'&&b.splash)applySplash(p,b.dmg*.6,b.splash);
  return hit;
}
function updateBullets(dt){
  for(const b of bullets){
    if(!b.active)continue;
    b.life-=dt;
    const p=b.mesh.position;
    const previous=p.clone();
    if(b.gravity)b.vel.y-=b.gravity*dt;
    p.addScaledVector(b.vel,dt);
    if(b.kind==='rocket'){
      b.trailT-=dt;
      if(b.trailT<=0){b.trailT=.035;spawnSmoke(p,1,{opacity:.3,vy:.6,maxLife:.9,color:0x999088});}
    }
    let dead=b.life<=0||Math.abs(p.x)>260||Math.abs(p.z)>260;
    if(!dead){
      let hit=ImpactSystem.trace(previous,p,b);
      const humanHit=typeof CharacterCombat!=='undefined'?CharacterCombat.traceSegment(previous,p):null;
      if(humanHit&&(!hit||humanHit.distance<hit.distance))hit=humanHit;
      CombatAwareness.suppressNear(p,3.5,b.kind==='mg'?.7:2.5);
      if(hit){const outcome=ImpactSystem.resolve(b,hit);dead=!(outcome&&outcome.ricochet);}
    }
    if(dead){b.active=false;b.mesh.visible=false;}
  }
}
function makeMission(idx){
  const def=MISSIONS[idx];
  const M={idx,def,diff:mDiff(idx),t:def.t,v:def.v,done:false,kills:0,
    spawned:0,total:0,spawnT:1.5,wavesDone:0,waveNum:0,waveActive:false,toSpawn:0,nextT:2,
    timeLeft:def.v,minE:3+Math.floor(idx/4),bossSpawned:false,escorts:0,escortT:5,
    victoryT:0,spawnInt:clamp(3.4-idx*0.09,1.2,3.4),
    maxAlive:clamp(2+Math.floor(idx/2),2,isCoarse?6:8),
    bossName:def.bossName||'ببر آهنی'};
  if(def.t==='destroy')M.total=def.v;
  return M;
}
function updateDirector(dt){
  const M=curMission;
  if(!M||M.done)return;
  if(M.def.operation==='opening-convoy'){
    if(OpeningCinematic.isActive()){OpeningCinematic.update(dt);return;}
    if(!OpeningOperation.isActive())OpeningOperation.start(M);
    const result=OpeningOperation.update(dt);
    if(result.failed)openDefeat();
    return;
  }
  if(M.def.operation==='soft-ground'){
    if(OpeningCinematic.isActive()){OpeningCinematic.update(dt);return;}
    if(!SoftGroundOperation.isActive())SoftGroundOperation.start(M);
    const result=SoftGroundOperation.update(dt);
    if(result.failed)openDefeat();
    return;
  }
  if(M.t==='destroy'){
    if(M.spawned>M.total){
      console.error('🚨 اسپاون اضافه! spawned:',M.spawned,'total:',M.total);
      M.spawned=M.total;
    }
    if(M.spawned<M.total){
      M.spawnT-=dt;
      if(M.spawnT<=0&&enemies.length<M.maxAlive){
        console.log('🟢 [SPAWN] شماره',M.spawned+1,'از',M.total,'| زنده:',enemies.length,'| کشته‌ها:',M.kills);
        spawnEnemy(pickTypeFor(M.idx),{diff:M.diff});
        M.spawned++; M.spawnT=M.spawnInt;
      }
    }else if(enemies.length===0&&M.kills<M.total){
      console.warn('⚠️ دشمنی نیست ولی پیروز نشدی! kills:',M.kills,'/',M.total);
    }
  }else if(M.t==='waves'){
    if(M.waveActive){
      if(M.toSpawn>0){
        M.spawnT-=dt;
        if(M.spawnT<=0&&enemies.length<M.maxAlive){
          spawnEnemy(pickTypeFor(M.idx),{diff:M.diff});
          M.toSpawn--; M.spawnT=2.0;
        }
      }else if(enemies.length===0){
        M.waveActive=false; M.wavesDone++; M.nextT=3.2;
        player.hp=Math.min(100,player.hp+12);
        if(M.wavesDone>=M.v)missionVictory();
        else showMsg(`موج ${faNum(M.wavesDone)} دفع شد`,1500,'kill');
      }
    }else{
      M.nextT-=dt;
      if(M.nextT<=0){
        M.waveNum++; M.waveActive=true;
        M.toSpawn=2+M.waveNum+Math.floor(M.idx/3);
        M.spawnT=0.8;
        showBanner(`موج ${faNum(M.waveNum)} از ${faNum(M.v)}`,'دشمنان در راه‌اند…');
      }
    }
  }else if(M.t==='survive'){
    M.timeLeft-=dt;
    if(M.timeLeft<=0){missionVictory();return;}
    M.spawnT-=dt;
    if(enemies.length<M.minE&&M.spawnT<=0){
      spawnEnemy(pickTypeFor(M.idx),{diff:M.diff});
      M.spawnT=clamp(2.2-M.idx*0.05,1.2,2.2);
    }
  }else if(M.t==='assault'){
    if(M.spawned<M.total){
      M.spawnT-=dt;
      if(M.spawnT<=0&&enemies.length<M.maxAlive){
        spawnEnemy(pickTypeFor(M.idx),{diff:M.diff,stationary:Math.random()<0.5});
        M.spawned++; M.spawnT=M.spawnInt;
      }
    }
  }else if(M.t==='boss'){
    if(!M.bossSpawned){
      M.spawnT-=dt;
      if(M.spawnT<=0){
        M.bossSpawned=true;
        spawnEnemy('boss',{hp:M.def.bossHp,scale:M.def.bossScale||1.38,name:M.bossName});
        showBanner(M.bossName,'هدف را منهدم کن!');
      }
    }else if(bossRef){
      M.escortT-=dt;
      const escortMax=4+Math.floor(M.idx/5);
      if(M.escortT<=0&&M.escorts<escortMax&&enemies.length<M.maxAlive){
        spawnEnemy(pickTypeFor(M.idx),{diff:M.diff});
        M.escorts++; M.escortT=6;
      }
    }
  }
}
function missionVictory(){
  const M=curMission;
  if(!M||M.done)return;
  M.done=true; M.victoryT=2.4;
  showBanner('ماموریت انجام شد!','در حال تهیه گزارش…');
  sVictory();
  timeScale=0.3;
}
function openVictory(){
  state='menu'; document.body.dataset.state='menu';
  const M=curMission;
  const stars=player.hp>=70?3:(player.hp>=35?2:1);
  prog.u=Math.max(prog.u,Math.min(MISSIONS.length,M.idx+2));
  prog.s[M.idx]=Math.max(prog.s[M.idx]||0,stars);
  if(M.def.persistentEffect&&activeProfile){activeProfile.effects[M.def.persistentEffect]=true;}
  saveProg();
  score+=500*(M.idx+1);
  document.getElementById('vicScore').textContent=faNum(score);
  document.getElementById('vicKills').textContent=faNum(kills);
  [1,2,3].forEach(s=>{
    const el=document.getElementById('vs'+s);
    el.classList.remove('fill');
    if(s<=stars){ void el.offsetWidth; el.style.animationDelay=(s*0.25)+'s'; el.classList.add('fill'); }
  });
  const unlockedNow=WEAPONS.find(w=>w.unlock===M.idx+1);
  document.getElementById('vicNote').textContent=
    M.idx===MISSIONS.length-1?'تمام ماموریت‌ها فتح شد! تو افسانه جنگ زرهی هستی.':
    (unlockedNow?`سلاح جدید آزاد شد: ${unlockedNow.name}`:'');
  document.getElementById('btnNext').style.display=M.idx<MISSIONS.length-1?'':'none';
  buildWeaponSlots();
  showScreen('victory');
}
function openDefeat(){
  state='menu'; document.body.dataset.state='menu';
  document.getElementById('ovScore').textContent=faNum(score);
  document.getElementById('ovKills').textContent=faNum(kills);
  showScreen('over');
}

