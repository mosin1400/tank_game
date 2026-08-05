import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/campaign/mission-data.js',import.meta.url),'utf8');
const context=vm.createContext({MISSIONS:[]});
vm.runInContext(`${source};globalThis.OpeningRuntimeCompat={missions:MISSIONS,data:CAMPAIGN_MISSIONS};`,context);
if(context.OpeningRuntimeCompat.data[0].runtime.operation!=='opening-convoy')throw new Error('M01 authored operation metadata is missing');
if(context.OpeningRuntimeCompat.missions[0].t!=='survive')throw new Error('M01 needs a safe legacy runtime until the operation controller loads');
console.log('PASS: opening operation has a safe interim runtime');
