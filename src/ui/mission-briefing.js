/* ================= بریفینگ پایین نقشه ================= */
let selectedCampaignMissionId='M01';
function renderMissionBriefing(id){
  const mission=getCampaignMission(id); if(!mission)return;
  selectedCampaignMissionId=id; briefIdx=CAMPAIGN_MISSIONS.indexOf(mission);
  const view=CampaignMapModel.buildMissionBriefingView(mission,activeProfile);
  document.getElementById('mapBriefAct').textContent=`پرده ${faNum(view.act)} · مأموریت ${faNum(briefIdx+1)} از ${faNum(CAMPAIGN_MISSIONS.length)}`;
  document.getElementById('mapBriefTitle').textContent=view.title;
  document.getElementById('mapBriefStory').textContent=view.story;
  document.getElementById('mapBriefPrimary').textContent=view.primary;
  document.getElementById('mapBriefOptional').textContent=view.optional;
  document.getElementById('mapBriefEnemies').textContent=view.enemies;
  document.getElementById('mapBriefWeather').textContent=view.weather;
  document.getElementById('mapBriefAir').textContent=view.airWarning;
  document.getElementById('mapBriefReward').textContent=view.reward;
  document.getElementById('mapBriefStars').textContent=`${'★'.repeat(view.bestStars)}${'☆'.repeat(3-view.bestStars)}`;
  const launch=document.getElementById('btnMapLaunch');
  launch.disabled=getMissionStatus(id,activeProfile)==='locked';
}
function launchSelectedCampaignMission(){
  const mission=getCampaignMission(selectedCampaignMissionId); if(!mission)return;
  if(getMissionStatus(mission.id,activeProfile)==='locked')return;
  initAudio(); startEngine(); startMission(CAMPAIGN_MISSIONS.indexOf(mission));
}
