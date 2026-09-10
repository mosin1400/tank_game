import assert from 'node:assert/strict';
import fs from 'node:fs';

const settings=fs.readFileSync(new URL('../src/ui/settings.js',import.meta.url),'utf8');
const controls=fs.readFileSync(new URL('../src/input/controls.js',import.meta.url),'utf8');
const player=fs.readFileSync(new URL('../src/entities/player.js',import.meta.url),'utf8');

assert.match(settings,/presets/,'settings must expose graphics quality presets');
assert.match(settings,/low:\{pixelRatio:1,shadows:false,bloom:false,effects:\.02/,
  'low quality must aggressively suppress fire and smoke');
assert.match(settings,/sampleFrame/,'settings must track frame performance for automatic quality');
assert.match(settings,/localStorage/,'settings must persist the chosen configuration');
assert.match(controls,/KeyG/,'controls must bind a smoke-screen key');
assert.match(controls,/KeyZ/,'controls must bind target marking');
assert.match(controls,/KeyC/,'controls must bind camera mode changes');
assert.match(controls,/altKey/,'Alt must enable free-look without changing the gun aim');
assert.match(player,/ControlLeft\|\|keys\.ControlRight/,'Ctrl must enable precision driving');
console.log('settings-controls-check: PASS');
