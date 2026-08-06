/* ================= عملیات افتتاحیهٔ کاروان ================= */
(function(root){
  let deps=null,active=null;
  function defaults(){return {loadScene:mission=>SceneBuilder.loadForMission(mission),clearScene:()=>SceneBuilder.clearActive(),createConvoy:path=>Convoy.create(path),updateConvoy:(trucks,dt,act)=>Convoy.update(trucks,dt,act),spawnEncounter:enc=>{
    const enemy=spawnEnemy(enc.type,{stationary:enc.stationary,hp:enc.hp});if(enemy){enemy.root.position.set(...enc.position);enemy.root.rotation.y=Math.PI;}return enemy;
  },encounterAlive:()=>active.enemies.some(enemy=>enemy&&!enemy.dead&&enemies.includes(enemy)),showObjective:(title,text)=>showBanner(title,text),missionVictory};}
  function configure(next){deps=next||null;}
  function start(mission){
    dispose();const layout=SceneLibrary.getScene(mission.def.sceneId);if(!layout)return null;
    const api=deps||defaults();if(api.loadScene)api.loadScene(mission);active={layout,api,actIndex:0,trucks:api.createConvoy(layout.convoyPath),enemies:[],started:false};spawnAct();return active;
  }
  function spawnAct(){const act=active.layout.zones[active.actIndex];active.enemies=active.layout.encounters.filter(enc=>enc.zone===act.id).map(active.api.spawnEncounter);active.api.showObjective(act.title,act.objective);}
  function update(dt){
    if(!active||!curMission||curMission.def.operation!=='opening-convoy')return {handled:false};
    active.api.updateConvoy(active.trucks,dt,active.actIndex);
    if(!active.trucks.some(truck=>truck.alive))return {handled:true,failed:true,completed:false};
    if(active.api.encounterAlive())return {handled:true,failed:false,completed:false};
    if(active.actIndex<active.layout.zones.length-1){active.actIndex++;spawnAct();return {handled:true,failed:false,completed:false};}
    if(active.trucks.some(truck=>truck.alive&&truck.reachedExit)){active.api.missionVictory();return {handled:true,failed:false,completed:true};}
    return {handled:true,failed:false,completed:false};
  }
  function dispose(){if(active&&active.api&&active.api.disposeConvoy)active.api.disposeConvoy(active.trucks);if(active&&active.api&&active.api.clearScene)active.api.clearScene();if(root.Convoy)Convoy.dispose();active=null;}
  function snapshot(){return active?{act:active.layout.zones[active.actIndex].id,trucks:active.trucks}:null;}
  root.OpeningOperation=Object.freeze({configure,start,update,dispose,isActive:()=>!!active,snapshot});
})(globalThis);
