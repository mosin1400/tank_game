/* ================= جلوه‌ها، دوربین، HUD ================= */
function updateFX(dt,t){
  for(let i=0;i<FIRE_N;i++){
    if(fireLife[i]>0){
      fireLife[i]-=dt;
      firePos[i*3]+=fireVel[i*3]*dt; firePos[i*3+1]+=fireVel[i*3+1]*dt; firePos[i*3+2]+=fireVel[i*3+2]*dt;
      fireVel[i*3+1]+=3.5*dt;
      const l=clamp(fireLife[i]*2.2,0,1);
      fireCol[i*3]=l; fireCol[i*3+1]=l*l*0.55; fireCol[i*3+2]=l*l*l*0.2;
      if(fireLife[i]<=0)firePos[i*3+1]=-999;
    }
  }
  fireGeo.attributes.position.needsUpdate=true;
  fireGeo.attributes.color.needsUpdate=true;
  for(const sm of smokeSprites){
    if(sm.life<=0)continue;
    sm.life-=dt;
    if(sm.life<=0){sm.s.visible=false;continue;}
    sm.s.position.y+=sm.vy*dt;
    sm.s.scale.x+=sm.grow*dt; sm.s.scale.y+=sm.grow*dt;
    sm.s.material.opacity=sm.base*Math.sin(Math.PI*clamp(sm.life/sm.max,0,1));
  }
  for(const f of flashes){
    if(f.life<=0)continue;
    f.life-=dt; f.s.material.opacity=clamp(f.life/0.16,0,1);
    if(f.life<=0)f.s.visible=false;
  }
  for(const r of rings){
    if(r.life<=0)continue;
    r.life-=dt;
    if(r.life<=0){r.m.visible=false;continue;}
    const k=1-r.life/0.38, sc=0.5+k*9*r.size;
    r.m.scale.set(sc,1,sc); r.m.material.opacity=(1-k)*0.75;
  }
  for(const d of debris){
    if(d.life<=0)continue;
    d.life-=dt;
    if(d.life<=0){d.m.visible=false;continue;}
    d.vel.y-=18*dt;
    d.m.position.addScaledVector(d.vel,dt);
    d.m.rotation.x+=d.rot.x*dt; d.m.rotation.y+=d.rot.y*dt; d.m.rotation.z+=d.rot.z*dt;
    if(d.m.position.y<0.08&&d.vel.y<0){
      d.m.position.y=0.08; d.vel.y*=-0.35; d.vel.x*=0.7; d.vel.z*=0.7;
    }
  }
  for(const f of floats){
    if(f.life<=0)continue;
    f.life-=dt;
    if(f.life<=0){f.s.visible=false;continue;}
    f.s.position.y+=1.6*dt;
    f.s.material.opacity=clamp(f.life/1.15,0,1);
  }
  fxLight.intensity*=Math.exp(-10*dt);
  dmgAlpha=Math.max(0,dmgAlpha-dt*1.4);
  dmgEl.style.opacity=dmgAlpha;
  for(const fs of farFires){
    fs.material.opacity=0.55+Math.sin(t*3+fs.position.x)*0.2;
    if(Math.random()<dt*1.2){
      const p=fs.position.clone(); p.y=4; p.x+=rand(-4,4);
      spawnSmoke(p,1,{opacity:0.25,vy:3.5,maxLife:4,color:0x6b655c});
    }
  }
  for(const c of clouds){
    c.position.x+=1.1*dt;
    if(c.position.x>270)c.position.x=-270;
  }
  flare.material.opacity=0.42+Math.sin(t*1.3)*0.1;
  for(let i=0;i<MOTE_N;i++){
    motePos[i*3]+=Math.sin(t*0.4+i)*dt*0.25;
    motePos[i*3+1]+=Math.cos(t*0.3+i*1.7)*dt*0.12;
    if(motePos[i*3]>player.pos.x+35)motePos[i*3]-=70;
    if(motePos[i*3]<player.pos.x-35)motePos[i*3]+=70;
    if(motePos[i*3+2]>player.pos.z+35)motePos[i*3+2]-=70;
    if(motePos[i*3+2]<player.pos.z-35)motePos[i*3+2]+=70;
  }
  moteGeo.attributes.position.needsUpdate=true;
  rumbleT-=dt;
  if(rumbleT<=0){rumbleT=rand(6,13);if(state==='play')sBoom(0.14,0.7);}
}
function updateWrecks(dt){
  for(const w of wrecks){
    if(w.smokeT>0){
      w.smokeT-=dt;
      if(Math.random()<dt*7){
        const p=w.root.position.clone(); p.y=1.6; p.x+=rand(-0.6,0.6); p.z+=rand(-0.6,0.6);
        spawnSmoke(p,1,{opacity:0.42,vy:2.4,maxLife:3});
        if(Math.random()<0.4)spawnFire(p,3,2.5,0.5);
      }
    }
  }
}
function updatePending(dt){
  for(let i=pendingFx.length-1;i>=0;i--){
    pendingFx[i].t-=dt;
    if(pendingFx[i].t<=0){pendingFx[i].fn();pendingFx.splice(i,1);}
  }
}
function updatePowerups(dt){
  puSpawnT-=dt;
  if(puSpawnT<=0&&powerups.length<3){spawnPowerup();puSpawnT=20;}
  for(let i=powerups.length-1;i>=0;i--){
    const pu=powerups[i];
    pu.t+=dt;
    pu.sp.position.y=1.7+Math.sin(pu.t*2)*0.22;
    pu.root.rotation.y+=dt*0.8;
    if(!player.dead&&Math.hypot(pu.x-player.pos.x,pu.z-player.pos.z)<3.6){
      applyBuff(pu);
      scene.remove(pu.root); powerups.splice(i,1);
    }
  }
  if(buffRapid>0)buffRapid-=dt;
  if(buffPower>0)buffPower-=dt;
}
let _lastT=performance.now();
const clock={elapsedTime:0,getDelta(){const n=performance.now(),d=(n-_lastT)/1000;_lastT=n;this.elapsedTime=n/1000;return d;}};
let menuAng=0;
const camLook=vecShim(0,0,0),camIdeal=vecShim(0,0,0);
function updateCamera(dt){
  shake=Math.max(0,shake-dt*2.6);
  fovKick*=Math.exp(-6*dt);
  if(state!=='play'&&state!=='dying'){
    menuAng+=dt*0.15;
    camera.position.set(Math.sin(menuAng)*16,6.5,Math.cos(menuAng)*16);
    camera.lookAt(0,1.6,0);
  }else{
    const fwd=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));
    camIdeal.copy(player.pos).addScaledVector(fwd,-9.5); camIdeal.y=5.6;
    camera.position.lerp(camIdeal,1-Math.exp(-5*dt));
    if(shake>0){
      camera.position.x+=rand(-1,1)*shake*0.35;
      camera.position.y+=rand(-1,1)*shake*0.28;
      camera.rotation.z=rand(-1,1)*shake*0.02;
    }else{
      camera.rotation.z*=0.9;
    }
    camLook.copy(player.pos).addScaledVector(fwd,6); camLook.y=1.7;
    camera.lookAt(camLook);
    sun.position.copy(player.pos).add(new THREE.Vector3(38,52,22));
    sun.target.position.copy(player.pos);
  }
  const targetFov=46+fovKick;
  if(Math.abs(camera.fov-targetFov)>0.01){
    camera.fov=targetFov; camera.updateProjectionMatrix();
  }
}
let dmgdirEl=null,dmgdirT=null;
function showDamageDir(srcPos){
  if(!dmgdirEl)dmgdirEl=document.getElementById('dmgdir');
  if(!dmgdirEl||!srcPos)return;
  const dx=srcPos.x-player.pos.x,dz=srcPos.z-player.pos.z;
  let rel=Math.atan2(dx,dz)-player.yaw;
  while(rel>Math.PI)rel-=Math.PI*2;
  while(rel<-Math.PI)rel+=Math.PI*2;
  const deg=-rel*180/Math.PI;
  dmgdirEl.style.transform=`translate(-50%,-50%) rotate(${deg}deg) translateY(-38vh)`;
  dmgdirEl.style.opacity='1';
  clearTimeout(dmgdirT);
  dmgdirT=setTimeout(()=>{if(dmgdirEl)dmgdirEl.style.opacity='0';},650);
}
function showMsg(text,dur=1800,cls=''){
  msgEl.textContent=text; msgEl.className='show '+cls;
  clearTimeout(msgTimer);
  msgTimer=setTimeout(()=>msgEl.className='',dur);
}
function showBanner(main,sub){
  bannerEl.querySelector('.bmain').textContent=main;
  bannerEl.querySelector('.bsub').textContent=sub||'';
  bannerEl.classList.remove('anim'); void bannerEl.offsetWidth;
  bannerEl.classList.add('anim');
}
function addFeed(text){
  const d=document.createElement('div'); d.className='fd'; d.textContent=text;
  feedEl.appendChild(d);
  while(feedEl.children.length>3)feedEl.removeChild(feedEl.firstChild);
  setTimeout(()=>{d.style.transition='opacity .5s';d.style.opacity='0';},3400);
  setTimeout(()=>{if(d.parentNode)d.remove();},4000);
}
function drawRadar(){
  const S=radar.width,c=S/2,k=(S/2-6)/115;
  rctx.clearRect(0,0,S,S);
  rctx.save();
  rctx.beginPath(); rctx.arc(c,c,S/2-2,0,7); rctx.clip();
  rctx.strokeStyle='rgba(170,182,104,.25)'; rctx.lineWidth=1;
  for(const rr of [S*0.24,S*0.45]){rctx.beginPath();rctx.arc(c,c,rr,0,7);rctx.stroke();}
  rctx.fillStyle='rgba(214,224,178,.08)';
  rctx.beginPath(); rctx.moveTo(c,c);
  rctx.arc(c,c,S/2-4,-Math.PI/2-0.5,-Math.PI/2+0.5); rctx.closePath(); rctx.fill();
  const cw=Math.cos(player.yaw),sw=Math.sin(player.yaw);
  const plot=(wx,wz)=>{
    const dx=wx-player.pos.x,dz=wz-player.pos.z;
    const lx=dx*cw-dz*sw,lz=dx*sw+dz*cw;
    return [c+lx*k,c-lz*k,lx,lz];
  };
  for(const pu of powerups){
    const [px,py,lx,lz]=plot(pu.x,pu.z);
    if(Math.hypot(lx,lz)>115)continue;
    rctx.fillStyle=PU[pu.kind].color; rctx.fillRect(px-2.5,py-2.5,5,5);
  }
  for(const e of enemies){
    const [px,py,lx,lz]=plot(e.root.position.x,e.root.position.z);
    if(Math.hypot(lx,lz)>115)continue;
    drawRadarEnemy(px,py,e.type);
  }
  rctx.fillStyle='#d6e0b2';
  rctx.beginPath(); rctx.moveTo(c,c-6); rctx.lineTo(c-4.5,c+5); rctx.lineTo(c+4.5,c+5);
  rctx.closePath(); rctx.fill();
  rctx.restore();
}
function drawRadarEnemy(px,py,type){
  rctx.save(); rctx.translate(px,py);
  if(type==='boss'){
    rctx.fillStyle='#c04adf'; rctx.beginPath();
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?3:6;rctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
    rctx.closePath(); rctx.fill();
  }else if(type==='heavy'){
    rctx.fillStyle='#c04848'; rctx.fillRect(-4,-4,8,8);
  }else if(type==='light'){
    rctx.fillStyle='#d8a13a';
    rctx.beginPath(); rctx.moveTo(0,-4); rctx.lineTo(3.5,3); rctx.lineTo(-3.5,3); rctx.closePath(); rctx.fill();
  }else{
    rctx.fillStyle='#e05535'; rctx.beginPath(); rctx.arc(0,0,3.5,0,7); rctx.fill();
  }
  rctx.restore();
}
function objText(M){
  if(!M)return '';
  if(M.done)return 'ماموریت انجام شد!';
  if(M.t==='destroy')return `انهدام: ${faNum(M.kills)} از ${faNum(M.total)}`;
  if(M.t==='waves')return `موج ${faNum(Math.min(M.wavesDone+1,M.v))} از ${faNum(M.v)}`;
  if(M.t==='survive')return `بقا: ${faNum(Math.ceil(M.timeLeft))} ثانیه`;
  return `هدف: انهدام ${M.bossName}`;
}
function updateHUD(){
  const M=curMission;
  if(hudCache.s!==score){uiScore.textContent=faNum(score);hudCache.s=score;}
  const mn=M?M.idx+1:1;
  if(hudCache.m!==mn){uiMission.textContent=faNum(mn);hudCache.m=mn;}
  const foes=enemies.length;
  if(hudCache.f!==foes){uiFoes.textContent=faNum(foes);hudCache.f=foes;}
  if(hudCache.k!==kills){uiKills.textContent=faNum(kills);hudCache.k=kills;}
  const ot=objText(M);
  if(hudCache.o!==ot){objEl.textContent=ot;hudCache.o=ot;}
  const pct=clamp(player.hp,0,100);
  hpFill.style.width=pct+'%';
  hpFill.style.background=pct>55?'linear-gradient(90deg,#7fb254,#a4c46a)':
    pct>25?'linear-gradient(90deg,#c9a83c,#d8b23a)':'linear-gradient(90deg,#b03a26,#cf4b32)';
  const w=WEAPONS[curWeapon];
  reloadFill.style.width=(clamp(1-Math.max(0,player.reload)/
    (w.reload*(buffRapid>0?0.45:1)),0,1)*100)+'%';
  WEAPONS.forEach((wp,i)=>{
    wp.elAmmo.textContent=weaponUnlocked(i)?faNum(wp.ammo):'🔒';
    wp.elReload.style.width=(clamp(1-wp.reloadLeft/wp.reload,0,1)*100)+'%';
  });
  if(buffRapid>0){buffRapidEl.classList.add('on');
    buffRapidEl.querySelector('b').textContent=faNum(Math.ceil(buffRapid))+'ث';}
  else buffRapidEl.classList.remove('on');
  if(buffPower>0){buffPowerEl.classList.add('on');
    buffPowerEl.querySelector('b').textContent=faNum(Math.ceil(buffPower))+'ث';}
  else buffPowerEl.classList.remove('on');
  if(bossRef&&!bossRef.dead)
    bossFillEl.style.width=(clamp(bossRef.hp/bossRef.maxHp,0,1)*100)+'%';
    /* نشانگر هدف: جهت و فاصله تا نزدیک‌ترین دشمن یا کمپین */
  const marker=document.getElementById('marker'),
        arrow=document.getElementById('markerArrow'),
        mdist=document.getElementById('markerDist');
  let target=null,minD=Infinity;
  for(const e of enemies){
    const d=Math.hypot(e.root.position.x-player.pos.x,e.root.position.z-player.pos.z);
    if(d<minD){minD=d;target=e.root.position;}
  }
  if(!target&&enemyCamps.length){
    for(const c of enemyCamps){
      const d=Math.hypot(c.x-player.pos.x,c.z-player.pos.z);
      if(d<minD){minD=d;target={x:c.x,y:0,z:c.z};}
    }
  }
  if(target&&minD>25){
    marker.style.display='block';
    const dx=target.x-player.pos.x,dz=target.z-player.pos.z;
    const ang=Math.atan2(dx,dz)-player.yaw;
    arrow.setAttribute('transform',`rotate(${-ang*180/Math.PI} 40 40)`);
    mdist.textContent=faNum(Math.round(minD))+' م';
    /* موقعیت فلش در لبه صفحه بر اساس زاویه */
    const screenAng=-ang;
    const rx=Math.sin(screenAng),ry=-Math.cos(screenAng);
    const edge=Math.min(innerWidth,innerHeight)*0.42;
    marker.style.left=(innerWidth/2+rx*edge)+'px';
    marker.style.top=(innerHeight/2+ry*edge)+'px';
  }else{
    marker.style.display='none';
  }
}

