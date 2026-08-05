/* ================= وضعیت کمپین ================= */
function getMissionStatus(id,profile){
  const index=CAMPAIGN_MISSIONS.findIndex(m=>m.id===id);
  if(index<0)return 'locked';
  const completed=profile&&profile.completed&&profile.completed[id];
  if(completed&&completed.stars===3)return 'perfected';
  if(completed)return 'completed';
  return profile&&index===profile.unlockedIndex?'available':'locked';
}
function getCampaignEffect(profile,effectId){return Boolean(profile&&profile.effects&&profile.effects[effectId]);}
function getCampaignMissionByIndex(index){return CAMPAIGN_MISSIONS[index]||null;}
