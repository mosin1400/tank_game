import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/ui/screens.js',import.meta.url),'utf8');
const calls=[];
const context=vm.createContext({
  document:{body:{dataset:{},classList:{remove:()=>{}}},getElementById:()=>null},
  stopMusic:()=>{},faNum:value=>String(value),MISSIONS:[],prog:{s:[],u:1},
  renderCampaignMap:()=>false,addEventListener:()=>{},console,
  state:'menu',paused:false
});
vm.runInContext(`${source};globalThis.ScreenMarkupTest={showScreen,showMissions};`,context);
context.ScreenMarkupTest.showScreen('menu');
context.ScreenMarkupTest.showMissions();
console.log('PASS: screens tolerate stale campaign markup');
