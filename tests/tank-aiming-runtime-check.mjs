import assert from 'node:assert/strict';
import fs from 'node:fs';

const player=fs.readFileSync(new URL('../src/entities/player.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../src/core/runtime.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../src/ui/game-ui.js',import.meta.url),'utf8');
const screens=fs.readFileSync(new URL('../src/ui/screens.js',import.meta.url),'utf8');

assert.match(runtime,/TankAiming\.configure\(\{[\s\S]*THREE[\s\S]*getPlayer:[\s\S]*getAimPoint:/,
  'runtime must configure aiming against the live player and aim point');
assert.match(player,/TankAiming\.update\(dt,/,
  'player update must consume the aiming controller every frame');
assert.doesNotMatch(player,/player\.gun\.rotation\.x=-0\.01/,
  'legacy gun pitch overwrite must be removed');
assert.match(ui,/TankAiming\.cameraPose\(\)/,
  'live camera must consume the precision barrel pose');
assert.match(screens,/TankAiming\.reset\(\)/,
  'mission lifecycle must reset the aiming controller');

console.log('tank-aiming-runtime-check: PASS');
