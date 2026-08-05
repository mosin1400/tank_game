import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/ui/campaign-map.js',import.meta.url),'utf8');
const context=vm.createContext({document:{getElementById:()=>null},clamp:(value)=>value,console});
vm.runInContext(`${source};globalThis.CampaignMapInitTest={initCampaignMapUI,isCampaignMapMarkupAvailable};`,context);
if(context.CampaignMapInitTest.isCampaignMapMarkupAvailable()!==false)throw new Error('missing campaign markup must be detected');
const result=context.CampaignMapInitTest.initCampaignMapUI();
if(result!==false)throw new Error('campaign map must safely decline when its markup is missing');
console.log('PASS: campaign map tolerates stale markup');
