import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const generator = await readFile(new URL('../tools/characters/generate-makehuman-models.html', import.meta.url), 'utf8');
const server = await readFile(new URL('../tools/characters/makehuman-export-server.py', import.meta.url), 'utf8');

for (const id of ['player-commander', 'ramin', 'saman', 'nikan', 'shahin-tali', 'general-varen']) {
  assert.match(generator, new RegExp(`id:'${id}'`), `missing ${id} batch preset`);
  assert.match(server, new RegExp(`"${id}"`), `server must whitelist ${id}`);
}
assert.match(generator, /setGender\(1\)/, 'batch must generate only male characters');
const runBody = generator.slice(generator.indexOf('async function run'));
assert.ok(
  runBody.indexOf('setGender(1)') >= 0 &&
    runBody.indexOf('setGender(1)') < runBody.indexOf('baseVertices=human.geometry.vertices'),
  'male target must be baked before the stable base vertices are captured',
);
assert.ok(
  runBody.indexOf('geometry._bufferGeometry') >= 0 &&
    runBody.indexOf('geometry._bufferGeometry') < runBody.indexOf('targets.applyTargets()'),
  'headless generation must mark the geometry render-ready before applying targets',
);
assert.match(generator, /bakePresetGeometry/, 'batch must bake each preset into distinct OBJ geometry');
assert.match(generator, /baseVertices/, 'batch must reset from a stable MakeHuman base mesh per preset');
assert.match(generator, /jaw:/, 'main character presets must include face variation');
assert.match(generator, /method:'PUT'/, 'batch must save generated OBJ data automatically');
assert.match(server, /MAX_BYTES/, 'server must enforce an export size limit');
assert.match(server, /Unsafe export target/, 'server must guard the raw export root');

console.log('makehuman-js-batch-contract-check: PASS');
