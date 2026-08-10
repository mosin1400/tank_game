import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('../assets/licenses/character-wardrobe.json', import.meta.url), 'utf8'));
const donor = manifest.assets.find((asset) => asset.id === 'russian-soldier-16037daadcfe4715a4ebce0f2fc6f675');
assert.equal(donor.author, 'Chernov-Egor');
assert.equal(donor.license, 'CC-BY-4.0');
assert.match(donor.sourceUrl, /sketchfab\.com\/3d-models\/russian-soldier-16037da/);
assert.match(donor.attribution, /Chernov-Egor/);
const files = await readdir(`${root}/tools/raw-character/donor/russian-soldier`, { recursive: true });
assert.ok(files.some((name) => /\.(?:glb|gltf|fbx|obj)$/i.test(name)), 'download must include an importable model');
console.log('character-wardrobe-license-check: PASS');
