import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/scenes/scene-builder.js',import.meta.url),'utf8');
const context=vm.createContext({SceneLibrary:{getScene:()=>null},console});
vm.runInContext(`${source};globalThis.SceneBuilderTest=SceneBuilder;`,context);

const yaw=-.12;
const rail=context.SceneBuilderTest.computeRailLayout({
  x:-78,z:46,yaw,length:82,gauge:4,wagonOffsets:[-22,0,22]
});
if(rail.rails.length!==2||rail.wagons.length!==3)throw new Error('rail frame must create two rails and three wagons');
for(const wagon of rail.wagons){
  const dx=wagon.x+78,dz=wagon.z-46;
  const localLateral=Math.sin(yaw)*dx+Math.cos(yaw)*dz;
  if(Math.abs(localLateral)>.000001)throw new Error(`wagon is off centerline by ${localLateral}`);
  if(wagon.ry!==yaw)throw new Error('wagon yaw must equal rail yaw');
}
for(const line of rail.rails){
  const dx=line.x+78,dz=line.z-46;
  const lateral=Math.sin(yaw)*dx+Math.cos(yaw)*dz;
  if(Math.abs(Math.abs(lateral)-2)>.000001)throw new Error('rails must share the configured gauge');
}
if(rail.sleepers.length<20)throw new Error('rail needs a continuous sleeper bed');
console.log('PASS: M01 rails and wagons share one authored frame');
