import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/scenes/scene-builder.js',import.meta.url),'utf8');
const layout=fs.readFileSync(new URL('../src/scenes/scene-02.js',import.meta.url),'utf8');
assert.match(layout,/convoyPath:\[/,'M02 needs a convoy route');
assert.match(source,/behavior:'follow-player'/,'M02 actors must use live player-follow navigation');
assert.match(source,/followDistance:5\.5/,'M02 actors require a recovery distance around the tank');
assert.match(source,/CharacterManager\.removeWithin\(active\.root\)/,'scene cleanup must remove only scoped actors');
assert.match(source,/m02-marsh-mud\.png/,'M02 material must be local and offline');
console.log('m02-live-navigation-check: PASS');
