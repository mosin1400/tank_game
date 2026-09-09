import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/combat/projectiles.js',import.meta.url),'utf8');
const effects=fs.readFileSync(new URL('../src/combat/effects.js',import.meta.url),'utf8');

assert.match(source,/new THREE\.Group\(\)/,
  'every projectile must use a real 3D group, not only a flat visual');
assert.match(source,/shellCore|tracerTail/,
  'projectiles need a distinct visible shell core and tracer tail');
assert.match(source,/PointLight/,
  'large projectiles need a short-lived 3D light source');
assert.match(effects,/flameSprites/,
  'fire effects need layered flame sprites in addition to point embers');
assert.match(effects,/flicker/,
  'fire effects need flickering local light for cinematic depth');
console.log('projectile-visual-check: PASS');
