import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/profile/profile-ui.js',import.meta.url),'utf8');
const context=vm.createContext({
  console,
  document:{getElementById:()=>null},
  addEventListener:()=>{},
  stopMusic:()=>{},
  showMenu:()=>{},
  showMissions:()=>{},
  showScreen:()=>{},
  ProfileViewModel:{},CAMPAIGN_MISSIONS:[],activeProfileSlot:0,state:'menu'
});
vm.runInContext(`${source};globalThis.ProfileUiInitTest={initProfileUI};`,context);
const result=context.ProfileUiInitTest.initProfileUI();
if(result!==false)throw new Error('profile UI must safely decline when its markup is missing');
console.log('PASS: profile UI tolerates stale markup');
