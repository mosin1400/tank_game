import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../src/scenes/scene-builder.js',import.meta.url),'utf8');
for(const token of ['m01-industrial-material-atlas.png','industrialMaterial','buildRailWagon','buildFuelDepotDetails']){
  if(!source.includes(token))throw new Error(`M01 art pass is missing ${token}`);
}
console.log('PASS: M01 industrial art pass contract');
