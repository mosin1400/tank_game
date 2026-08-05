/* ================= پروفایل‌های محلی ================= */
const PROFILE_STORAGE_KEY='t34war_profiles_v1';
let activeProfile=null,activeProfileSlot=-1;

function createProfile(name){
  return {version:1,name:ProfileViewModel.normalizeProfileName(name),
    unlockedIndex:0,completed:{},effects:{},lastMissionId:'M01',stars:0,score:0,
    playSeconds:0,difficulty:'standard',midpointSeen:false};
}
function normalizeProfile(profile){
  const safe=Object.assign(createProfile(profile&&profile.name),profile||{});
  safe.unlockedIndex=Math.max(0,Math.min(CAMPAIGN_MISSIONS.length-1,Number(safe.unlockedIndex)||0));
  safe.completed=safe.completed&&typeof safe.completed==='object'?safe.completed:{};
  safe.effects=safe.effects&&typeof safe.effects==='object'?safe.effects:{};
  safe.lastMissionId=getCampaignMission(safe.lastMissionId)?safe.lastMissionId:'M01';
  return safe;
}
function readProfileSlots(){
  try{
    const stored=JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY)||'null');
    if(Array.isArray(stored)&&stored.length===3)return stored.map(p=>p?normalizeProfile(p):null);
  }catch(e){}
  return [null,null,null];
}
function writeProfileSlots(slots){
  try{localStorage.setItem(PROFILE_STORAGE_KEY,JSON.stringify(slots));}catch(e){}
}
function migrateLegacyProgress(){
  try{
    const raw=localStorage.getItem('t34war_v2'); if(!raw)return null;
    const old=JSON.parse(raw),profile=createProfile('فرمانده');
    profile.unlockedIndex=Math.max(0,Math.min(CAMPAIGN_MISSIONS.length-1,(Number(old.u)||1)-1));
    Object.keys(old.s||{}).forEach(i=>{
      const mission=CAMPAIGN_MISSIONS[Number(i)];
      if(mission)profile.completed[mission.id]={stars:Math.max(0,Math.min(3,Number(old.s[i])||0))};
    });
    profile.stars=Object.values(profile.completed).reduce((sum,entry)=>sum+(entry.stars||0),0);
    profile.lastMissionId=CAMPAIGN_MISSIONS[profile.unlockedIndex].id;
    return profile;
  }catch(e){return null;}
}
let profileSlots=readProfileSlots();
if(!profileSlots.some(Boolean)){
  profileSlots[0]=migrateLegacyProgress()||createProfile('فرمانده');
  writeProfileSlots(profileSlots);
}
function listProfiles(){return profileSlots.slice();}
function syncLegacyProgress(){
  if(!activeProfile)return;
  prog={u:activeProfile.unlockedIndex+1,s:{}};
  Object.keys(activeProfile.completed).forEach(id=>{
    const index=CAMPAIGN_MISSIONS.findIndex(m=>m.id===id);
    if(index>=0)prog.s[index]=activeProfile.completed[id].stars||0;
  });
}
function loadProfile(slot){
  if(!Number.isInteger(slot)||slot<0||slot>2||!profileSlots[slot])return null;
  activeProfile=normalizeProfile(profileSlots[slot]); activeProfileSlot=slot;
  profileSlots[slot]=activeProfile; syncLegacyProgress(); return activeProfile;
}
function saveActiveProfile(){
  if(!activeProfile)return;
  activeProfile.unlockedIndex=Math.max(activeProfile.unlockedIndex,Math.min(CAMPAIGN_MISSIONS.length-1,(prog.u||1)-1));
  Object.keys(prog.s||{}).forEach(i=>{
    const mission=CAMPAIGN_MISSIONS[Number(i)];
    if(mission)activeProfile.completed[mission.id]={stars:Math.max(0,Math.min(3,Number(prog.s[i])||0))};
  });
  activeProfile.stars=Object.values(activeProfile.completed).reduce((sum,entry)=>sum+(entry.stars||0),0);
  activeProfile.lastMissionId=CAMPAIGN_MISSIONS[activeProfile.unlockedIndex].id;
  profileSlots[activeProfileSlot]=activeProfile; writeProfileSlots(profileSlots);
}
function replaceProfile(slot,name){
  if(!Number.isInteger(slot)||slot<0||slot>2)return null;
  profileSlots[slot]=createProfile(name); writeProfileSlots(profileSlots); return loadProfile(slot);
}
function resetActiveProgress(){
  if(!activeProfile)return;
  const clean=createProfile(activeProfile.name); profileSlots[activeProfileSlot]=clean;
  loadProfile(activeProfileSlot); saveActiveProfile();
}
function unlockAllMissionsForActiveProfile(){
  if(!activeProfile)return;
  activeProfile.unlockedIndex=CAMPAIGN_MISSIONS.length-1;
  CAMPAIGN_MISSIONS.forEach(mission=>{activeProfile.completed[mission.id]={stars:3};});
  syncLegacyProgress(); saveActiveProfile();
}
function resetMissionLocksForActiveProfile(){resetActiveProgress();}
loadProfile(profileSlots.findIndex(Boolean));
