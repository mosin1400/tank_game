import fs from 'node:fs/promises';
import vm from 'node:vm';

const memory={};
const localStorage={getItem:key=>memory[key]??null,setItem:(key,value)=>{memory[key]=String(value);}};
const missions=Array.from({length:40},(_,index)=>({id:`M${String(index+1).padStart(2,'0')}`}));
const context=vm.createContext({
  console,localStorage,CAMPAIGN_MISSIONS:missions,prog:{u:1,s:{}},
  getCampaignMission:id=>missions.find(mission=>mission.id===id)||null,
  ProfileViewModel:{normalizeProfileName:name=>String(name||'').trim().slice(0,20)||'فرمانده'}
});
const source=await fs.readFile(new URL('../src/profile/profile-store.js',import.meta.url),'utf8');
vm.runInContext(`${source};globalThis.ProfileStoreTest={
  listProfiles,loadProfile,saveActiveProfile,unlockAllMissionsForActiveProfile,resetMissionLocksForActiveProfile,
  getActive:()=>activeProfile,getProgress:()=>prog
};`,context);

const api=context.ProfileStoreTest;
api.unlockAllMissionsForActiveProfile();
if(api.getActive().unlockedIndex!==39||Object.keys(api.getActive().completed).length!==40)
  throw new Error('unlock-all did not update the active profile');
api.resetMissionLocksForActiveProfile();
if(api.getActive().unlockedIndex!==0||Object.keys(api.getActive().completed).length!==0||api.getProgress().u!==1)
  throw new Error('reset-lock did not restore the active profile');

console.log('PASS: profile cheat state transitions');
