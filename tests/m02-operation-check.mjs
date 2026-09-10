import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const missionData=read('src/campaign/mission-data.js');
const registry=read('src/scenes/scene-library.js');
const layout=read('src/scenes/scene-02.js');
const controller=read('src/missions/soft-ground-operation.js');
const builder=read('src/scenes/scene-builder.js');
const director=read('src/missions/director.js');

assert.match(missionData,/M02[\s\S]{0,520}operation:'soft-ground'/,'M02 must select its dedicated operation');
assert.match(registry,/'scene-02':root\.SoftGroundScene02/,'scene 02 must be registered exactly once');
assert.match(layout,/id:'scene-02'/,'scene 02 layout must exist');
assert.match(layout,/zones:\[/,'scene 02 needs named playable zones');
assert.match(layout,/encounters:\[/,'scene 02 needs staged encounters');
assert.match(builder,/buildSoftGroundScene/,'scene builder needs dedicated M02 art');
assert.match(builder,/m02-marsh-mud\.png/,'M02 must use the generated marsh texture');
assert.match(controller,/const STATES=/,'operation must use named states');
assert.match(controller,/terminal/,'operation must guard terminal spawning');
assert.match(director,/SoftGroundOperation/,'director must route M02 to its controller');
assert.match(director,/M\.def\.persistentEffect/,'operation reward must persist exactly through mission victory');

console.log('m02 operation structure checks passed');
