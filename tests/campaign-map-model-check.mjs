import '../src/ui/campaign-map-model.js';

const {buildCampaignMapNodes,buildMissionBriefingView}=globalThis.CampaignMapModel;
function assert(condition,message){if(!condition)throw new Error(message);}

const missions=Array.from({length:40},(_,index)=>({
  id:`M${String(index+1).padStart(2,'0')}`,mapNode:`M${String(index+1).padStart(2,'0')}`,
  act:Math.floor(index/10)+1,title:`مرحله ${index+1}`,briefing:`روایت ${index+1}`,
  primaryObjective:{label:`هدف ${index+1}`},optionalObjective:{label:`فرعی ${index+1}`},
  enemyRoster:['light','medium'],weather:'rain',airProfile:index===13?'strike':'none',reward:{label:`پاداش ${index+1}`}
}));
const positions=Object.fromEntries(missions.map((mission,index)=>[mission.id,[10+index*2,90-index*2]]));
const profile={unlockedIndex:0,completed:{},effects:{}};
const status=(id,current)=>id==='M01'?'available':current.completed[id]?'completed':'locked';
const nodes=buildCampaignMapNodes(missions,positions,profile,status);
assert(nodes.length===40,'map must expose forty live nodes');
assert(nodes[0].status==='available'&&nodes[1].status==='locked','map lock states are incorrect');
assert(nodes.every(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)),'map positions must be numeric');

const briefing=buildMissionBriefingView(missions[13],{completed:{M14:{stars:2}}});
assert(briefing.title==='مرحله 14'&&briefing.airWarning.includes('حمله')&&briefing.bestStars===2,'briefing view is incomplete');
console.log('PASS: campaign map model behavior');
