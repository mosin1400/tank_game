/* ================= صفحه‌ها ================= */
const SCREENS=['profileSelect','menu','missions','brief','over','victory'];
function showScreen(id){
  SCREENS.forEach(s=>{
    const screen=document.getElementById(s);
    if(screen)screen.classList.toggle('on',s===id);
  });
}
function totalStars(){
  let n=0; for(let i=0;i<MISSIONS.length;i++)n+=prog.s[i]||0; return n;
}
function showMenu(){
  state='menu'; paused=false; document.body.dataset.state='menu';
  stopMusic();
  document.body.classList.remove('paused');
  const menuStars=document.getElementById('menuStars');
  if(menuStars)menuStars.textContent=`مجموع ستاره‌ها: ${faNum(totalStars())} از ${faNum(MISSIONS.length*3)}`;
  showScreen('menu');
}
function showMissions(){
  state='menu'; document.body.dataset.state='menu';
  const listStars=document.getElementById('listStars');
  if(listStars)listStars.textContent=
    `ستاره‌ها: ${faNum(totalStars())} از ${faNum(MISSIONS.length*3)} · ماموریت‌های باز: ${faNum(prog.u)} از ${faNum(MISSIONS.length)}`;
  if(!listStars||!renderCampaignMap()){
    console.warn('نقشهٔ کمپین در صفحهٔ بارگذاری‌شده موجود نیست.');
    showMenu(); return;
  }
  showScreen('missions');
}
let briefIdx=0;
function showBrief(i){
  briefIdx=i;
  const m=MISSIONS[i];
  document.getElementById('briefCamp').textContent=
    `کمپین ${faNum(m.c)} — ${CAMPS[m.c-1]} · ماموریت ${faNum(i+1)} از ${faNum(MISSIONS.length)}`;
  document.getElementById('briefName').textContent=m.n;
  document.getElementById('briefDesc').textContent=m.d;
  document.getElementById('briefObj').textContent='هدف: '+objectiveText(m);
  const wl=document.getElementById('briefW');
  wl.innerHTML='';
  const cleared=prog.u-1;
  WEAPONS.forEach((w,wi)=>{
    const ul=w.unlock<=cleared;
    const d=document.createElement('div');
    d.className='witem'+(ul?'':' lk');
    d.innerHTML=`<b>${w.name}</b>${ul?
      `آسیب ${faNum(w.dmg)} · خشاب ${faNum(w.max)}`:
      `<span class="ul">🔒 آزادسازی با فتح ماموریت ${faNum(w.unlock)}</span>`}`;
    wl.appendChild(d);
  });
  showScreen('brief');
}
function clearWorld(){
  for(const e of[...enemies])scene.remove(e.root);
  enemies.length=0; bossRef=null;
  document.getElementById('bossbar').classList.remove('on');
  for(const w of wrecks)scene.remove(w.root);
  wrecks.length=0; wreckObs.length=0;
  for(const b of bullets){b.active=false;b.mesh.visible=false;}
  for(const pu of powerups)scene.remove(pu.root);
  powerups.length=0;
  pendingFx.length=0;
  for(const sm of smokeSprites){sm.life=0;sm.s.visible=false;}
  for(const f of flashes){f.life=0;f.s.visible=false;}
  for(const r of rings){r.life=0;r.m.visible=false;}
  for(const d of debris){d.life=0;d.m.visible=false;}
  for(const f of floats){f.life=0;f.s.visible=false;}
  for(const c of craters)c.visible=false;
  for(const tr of trees){tr.alive=true;tr.root.visible=true;}
}
function startMission(i){
  startMusic(i);
  clearWorld();
  curMission=makeMission(i);
  applyPalette(MISSIONS[i].p);
  player.pos.set(0,0,0); player.yaw=0; player.speed=0; player.hp=100;
  player.reload=0; player.dead=false; player.mgT=0;
  player.turret.rotation.y=0; player.gun.rotation.x=0; player.gun.position.z=1.35;
  player.root.position.set(0,0,0); player.root.rotation.y=0;
  player.root.traverse(o=>{if(o.isMesh&&o.userData.om)o.material=o.userData.om;});
  WEAPONS.forEach(w=>{w.ammo=w.max;w.reloadLeft=0;});
  curWeapon=0; salvoLeft=0;
  score=0; kills=0; comboN=0; comboT=0;
  buffRapid=0; buffPower=0; puSpawnT=12;
  timeScale=1; shake=0; fovKick=0; dmgAlpha=0;
  for(const k in hudCache)delete hudCache[k];
  feedEl.innerHTML='';
  aimPoint.set(0,0,40);
  paused=false; document.body.classList.remove('paused');
  state='play'; document.body.dataset.state='play';
  refreshWeaponSlots();
  showBanner(`ماموریت ${faNum(i+1)} — ${MISSIONS[i].n}`,objectiveText(MISSIONS[i]));
  showScreen(null);
}
function togglePause(){
  if(state!=='play')return;
  paused=!paused;
  setMusicPaused(paused);
  document.body.classList.toggle('paused',paused);
}
function toggleMute(){
  muted=!muted;
  syncMusicMute();
  if(!muted&&curMission)startMusic(curMission.idx);
  document.getElementById('btnMute').textContent=muted?'🔇':'🔊';
}
// 🔓 رمز تقلب: Ctrl+Shift+Alt+E = باز کردن همه مراحل
addEventListener('keydown',function(e){
  if(e.ctrlKey&&e.shiftKey&&e.altKey&&(e.key==='e'||e.key==='E')){
    unlockAllMissionsForActiveProfile();
    showMsg('🔓 تمام مراحل باز شد!',2500);
    console.log('🔓 Cheat: all missions unlocked');
  }
});
// 🔒 بازگردانی پیشرفت: Ctrl+Shift+Alt+Q = فقط مأموریت اول باز است
addEventListener('keydown',function(e){
  if(e.ctrlKey&&e.shiftKey&&e.altKey&&(e.key==='q'||e.key==='Q'||e.code==='KeyQ')){
    resetMissionLocksForActiveProfile();
    showMsg('🔒 پیشرفت بازی به حالت اولیه برگشت!',2500);
    console.log('🔒 Cheat reset: normal mission locks restored');
  }
});
/* ================= حلقه اصلی ================= */
function animate(){
  requestAnimationFrame(animate);
  try{
    const dt=Math.min(clock.getDelta(),0.05);
    const t=clock.elapsedTime;
    if(!paused){
      timeScale+=(1-timeScale)*(1-Math.exp(-2.2*dt));
      const wdt=dt*timeScale;
      if(state==='play'){
        comboT=Math.max(0,comboT-wdt);
        if(comboT<=0)comboN=0;
        updatePlayer(wdt); updateEnemies(wdt,t); updateBullets(wdt);
        updateDirector(wdt); updateWrecks(wdt); updatePending(wdt);
        updatePowerups(wdt); updateFX(wdt,t); updateHUD(); drawRadar();
        if(curMission&&curMission.done){
          curMission.victoryT-=dt;
          if(curMission.victoryT<=0)openVictory();
        }
      }else if(state==='dying'){
        deathT-=dt;
        updateWrecks(wdt); updatePending(wdt); updateBullets(wdt);
        updateFX(wdt,t); drawRadar();
        if(Math.random()<dt*8){
          const p=player.pos.clone(); p.y=2;
          spawnSmoke(p,1,{opacity:0.5,vy:3,maxLife:3.5});
        }
        if(deathT<=0)openDefeat();
      }else{
        updateFX(wdt,t);
      }
    }
    updateCamera(dt);
    updateEngine();
    if(composer)composer.render(); else renderer.render(scene,camera);
  }catch(err){
    console.error(err);
    window.__showError('خطا در حین اجرای بازی: '+((err&&err.message)||err),
      (err&&err.stack)?String(err.stack).split('\n')[0].slice(0,180):'');
  }
}
