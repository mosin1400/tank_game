import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/ui/screens.js',import.meta.url),'utf8');
const screen=()=>({classList:{items:new Set(),toggle(name,on){on?this.items.add(name):this.items.delete(name);}}});
const screens={profileSelect:screen(),missions:screen(),brief:screen(),over:screen(),victory:screen(),listStars:{textContent:''}};
let mapRenders=0;
const context=vm.createContext({
  document:{body:{dataset:{},classList:{remove:()=>{}}},getElementById:id=>screens[id]||null},
  addEventListener:()=>{},stopMusic:()=>{},faNum:value=>String(value),MISSIONS:[{}],prog:{s:[0],u:1},
  renderCampaignMap:()=>{mapRenders++;return true;},console,state:'menu',paused:false
});
vm.runInContext(`${source};globalThis.ProfileToMapFlowTest={showCampaignMap};`,context);
if(context.ProfileToMapFlowTest.showCampaignMap()!==true)throw new Error('campaign map hub must render');
if(!screens.missions.classList.items.has('on'))throw new Error('campaign map must be active');
if(screens.profileSelect.classList.items.has('on'))throw new Error('profile screen must close when map opens');
if(mapRenders!==1)throw new Error('campaign map must render exactly once');
if(source.includes('showMenu(')||source.includes("'profileSelect','menu','missions'"))throw new Error('legacy menu path remains');
console.log('PASS: profile continues directly to campaign map');
