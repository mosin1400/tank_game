/* ================= عملیات ۰۲: خاک نرم ================= */
(function(root){
  const STATES=Object.freeze({INTRO:'intro',ACT_1:'act-1',ACT_2:'act-2',ACT_3:'act-3',VICTORY:'victory',FAILURE:'failure'});
  let active=null,deps=null;
  const inside=(position,bounds)=>position.x>=bounds[0]&&position.x<=bounds[1]&&position.z>=bounds[2]&&position.z<=bounds[3];
  function defaults(){return {loadScene:mission=>SceneBuilder.loadForMission(mission),clearScene:()=>SceneBuilder.clearActive(),setScenePhase:phase=>SceneBuilder.setPhase(phase),createConvoy:path=>Convoy.create(path),updateConvoy:(trucks,dt,act)=>Convoy.update(trucks,dt,act),spawnEncounter:enc=>{const enemy=spawnEnemy(enc.type,{stationary:enc.stationary,hp:enc.hp});if(enemy){enemy.root.position.set(...enc.position);enemy.root.rotation.y=Math.PI;}return enemy;},alive:entries=>entries.some(enemy=>enemy&&!enemy.dead&&enemies.includes(enemy)),showObjective:(title,text)=>showBanner(title,text),showMessage:text=>showMsg(text,3600),victory:missionVictory};}
  function configure(next){deps=next||null;}
  function phaseState(index){return [STATES.ACT_1,STATES.ACT_2,STATES.ACT_3][index]||STATES.VICTORY;}
  function spawnAct(){
    if(!active||active.terminal||active.spawned)return;
    const zone=active.layout.zones[active.actIndex];
    active.enemies=active.layout.encounters.filter(entry=>entry.zone===zone.id).map(active.api.spawnEncounter).filter(Boolean);
    active.spawned=true;active.state=phaseState(active.actIndex);active.api.setScenePhase(active.actIndex);
    active.api.showObjective(zone.title,zone.objective);
    const lines=['سارا: پمپ‌خانه را پاک کن؛ کامیون‌ها پشت خاکریز می‌مانند.','رامین: روی الوارها آرام برو؛ دشمن پشت نی‌زار ضدزره دارد.','سارا: آب‌بند شکسته، خروجی را نگه دار تا ستون عبور کند.'];
    active.api.showMessage(lines[active.actIndex]);
  }
  function start(mission){
    dispose();const layout=SceneLibrary.getScene(mission.def.sceneId);if(!layout)return null;
    const api=deps||defaults();api.loadScene(mission);
    if(player){player.pos.set(...layout.playerSpawn);player.root.position.copy(player.pos);player.yaw=Math.PI;player.root.rotation.y=Math.PI;}
    active={layout,api,state:STATES.INTRO,actIndex:0,trucks:api.createConvoy(layout.convoyPath),enemies:[],spawned:false,terminal:false,previousFog:typeof scene!=='undefined'&&scene.fog?scene.fog.far:null};
    if(typeof scene!=='undefined'&&scene.fog)scene.fog.far=Math.min(scene.fog.far,138);
    api.setScenePhase(0);api.showObjective('خاک نرم','به خاکریز پمپ‌خانه برس و راه کاروان را باز کن.');return active;
  }
  function update(dt){
    if(!active||!curMission||curMission.def.operation!=='soft-ground')return {handled:false};
    if(active.terminal)return {handled:true,completed:active.state===STATES.VICTORY,failed:active.state===STATES.FAILURE};
    active.api.updateConvoy(active.trucks,dt,active.actIndex);
    if(!active.trucks.some(truck=>truck.alive)){active.terminal=true;active.state=STATES.FAILURE;return {handled:true,failed:true};}
    const zone=active.layout.zones[active.actIndex];
    if(!active.spawned&&inside(player.pos,zone.bounds))spawnAct();
    if(!active.spawned)return {handled:true,completed:false,failed:false};
    if(active.api.alive(active.enemies))return {handled:true,completed:false,failed:false};
    if(active.actIndex<active.layout.zones.length-1){active.actIndex++;active.spawned=false;active.enemies=[];active.api.setScenePhase(active.actIndex);active.api.showMessage('مسیر بعدی باز شد؛ کاروان را جلو ببر.');return {handled:true,completed:false,failed:false};}
    if(active.trucks.some(truck=>truck.alive&&truck.reachedExit)){active.terminal=true;active.state=STATES.VICTORY;active.api.victory();return {handled:true,completed:true,failed:false};}
    return {handled:true,completed:false,failed:false};
  }
  function dispose(){if(active&&active.previousFog!==null&&typeof scene!=='undefined'&&scene.fog)scene.fog.far=active.previousFog;if(active&&active.api&&active.api.clearScene)active.api.clearScene();if(root.Convoy)Convoy.dispose();active=null;}
  function snapshot(){return active?{state:active.state,act:active.layout.zones[active.actIndex].id,terminal:active.terminal,trucks:active.trucks}:null;}
  root.SoftGroundOperation=Object.freeze({STATES,configure,start,update,dispose,isActive:()=>!!active,snapshot});
})(globalThis);
