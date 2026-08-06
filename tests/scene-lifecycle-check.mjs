import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/scenes/scene-builder.js',import.meta.url),'utf8');
const layout={id:'scene-01',colliders:[{type:'circle',x:2,z:3,r:1},{type:'aabb',x:5,z:8,hw:2,hd:1}]};
let added=0,removed=0,colliderAdds=0,colliderRemovals=0,legacyHidden=0,legacyRestored=0;
const context=vm.createContext({
  SceneLibrary:{getScene:id=>id==='scene-01'?layout:null},
  console
});
vm.runInContext(`${source};globalThis.SceneBuilderTest=SceneBuilder;`,context);
const builder=context.SceneBuilderTest;
builder.configure({
  createRoot:()=>({children:[]}),addRoot:()=>{added++;},removeRoot:()=>{removed++;},
  build:(_layout,handle)=>_layout.colliders.forEach(collider=>handle.addCollider(collider)),
  addCollider:()=>{colliderAdds++;},removeCollider:()=>{colliderRemovals++;},
  setLegacyVisible:visible=>{if(visible)legacyRestored++;else legacyHidden++;}
});
const active=builder.loadForMission({sceneId:'scene-01'});
if(!active||active.id!=='scene-01'||added!==1||colliderAdds!==2||legacyHidden!==1)throw new Error('scene-01 must replace the legacy layer');
builder.clearActive(); builder.clearActive();
if(removed!==1||colliderRemovals!==2||legacyRestored!==1||builder.getActive()!==null)throw new Error('scene cleanup must restore the legacy layer exactly once');
console.log('PASS: cinematic scene layer lifecycle');
