/* ================= عملیات افتتاحیهٔ کاروان ================= */
(function(root){
  let deps=null,active=null;
  function defaults(){return {loadScene:mission=>SceneBuilder.loadForMission(mission),clearScene:()=>SceneBuilder.clearActive(),setScenePhase:phase=>SceneBuilder.setPhase(phase),createConvoy:path=>Convoy.create(path),updateConvoy:(trucks,dt,act)=>Convoy.update(trucks,dt,act),spawnEncounter:enc=>{
    const enemy=spawnEnemy(enc.type,{stationary:enc.stationary,hp:enc.hp});if(enemy){enemy.root.position.set(...enc.position);enemy.root.rotation.y=Math.PI;}return enemy;
  },encounterAlive:()=>active.enemies.some(enemy=>enemy&&!enemy.dead&&enemies.includes(enemy)),showObjective:(title,text)=>showBanner(title,text),showMessage:text=>showMsg(text,3600),missionVictory};}
  function configure(next){deps=next||null;}
  function start(mission){
    dispose();const layout=SceneLibrary.getScene(mission.def.sceneId);if(!layout)return null;
    if(typeof player!=='undefined'&&player){
      player.pos.set(...layout.playerSpawn); player.root.position.copy(player.pos); player.yaw=Math.PI; player.root.rotation.y=Math.PI;
    }
    const api=deps||defaults();if(api.loadScene)api.loadScene(mission);
    active={layout,api,actIndex:0,trucks:api.createConvoy(layout.convoyPath),enemies:[],introT:8,spawnedAct:false};
    if(api.setScenePhase)api.setScenePhase(0);
    api.showObjective('آتش در سرو','سارا: دیده‌بان دشمن هنوز ما را ندیده؛ کاروان را آماده کن.');
    if(api.showMessage)api.showMessage('رامین: مسیر خروج از حیاط سوخت شروع می‌شود.');
    return active;
  }
  function spawnAct(){const act=active.layout.zones[active.actIndex];active.enemies=active.layout.encounters.filter(enc=>enc.zone===act.id).map(active.api.spawnEncounter);active.spawnedAct=true;if(active.api.setScenePhase&&active.actIndex>0)active.api.setScenePhase(active.actIndex);active.api.showObjective(act.title,act.objective);if(active.api.showMessage)active.api.showMessage(['گروهبان سارا: از انبار سوخت عبور می‌کنیم؛ کنار زره بمانید.','دیده‌بان: کمین از جادهٔ شکسته نزدیک می‌شود؛ ستون را از کانال رد کن.','گروهبان رامین: چشم روی تپه فعال است؛ برج را خاموش کن و راه خروج را نگه دار.'][active.actIndex]||'ستون را حفظ کن.');}
  function update(dt){
    if(!active||!curMission||curMission.def.operation!=='opening-convoy')return {handled:false};
    active.api.updateConvoy(active.trucks,dt,active.actIndex);
    if(!active.trucks.some(truck=>truck.alive))return {handled:true,failed:true,completed:false};
    if(!active.spawnedAct){
      active.introT-=dt;
      if(active.introT<=0)spawnAct();
      return {handled:true,failed:false,completed:false};
    }
    if(active.api.encounterAlive())return {handled:true,failed:false,completed:false};
    if(active.actIndex<active.layout.zones.length-1){active.actIndex++;spawnAct();return {handled:true,failed:false,completed:false};}
    if(active.trucks.some(truck=>truck.alive&&truck.reachedExit)){active.api.missionVictory();return {handled:true,failed:false,completed:true};}
    return {handled:true,failed:false,completed:false};
  }
  function dispose(){if(active&&active.api&&active.api.disposeConvoy)active.api.disposeConvoy(active.trucks);if(active&&active.api&&active.api.clearScene)active.api.clearScene();if(root.Convoy)Convoy.dispose();active=null;}
  function snapshot(){return active?{act:active.layout.zones[active.actIndex].id,trucks:active.trucks}:null;}
  root.OpeningOperation=Object.freeze({configure,start,update,dispose,isActive:()=>!!active,snapshot});
})(globalThis);
