import assert from 'node:assert/strict';
import fs from 'node:fs';

const director=fs.readFileSync(new URL('../src/missions/director.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../src/core/runtime.js',import.meta.url),'utf8');

assert.match(runtime,/ImpactSystem\.configure\(\{targets:projectileImpactTargets,onImpact:resolveProjectileImpact\}\)/,
  'runtime must connect the impact system to live projectile targets');
assert.match(director,/const previous=p\.clone\(\)/,
  'bullet update must retain its pre-integration position');
assert.match(director,/ImpactSystem\.trace\(previous,p,b\)/,
  'every live bullet must sweep its travelled segment');
assert.match(director,/CharacterCombat\.traceSegment\(previous,p\)/,
  'projectiles must include human hit volumes in the closest-hit decision');
assert.doesNotMatch(director,/if\(!dead\)for\(const obstacle of staticObs\)/,
  'legacy point obstacle loop must be removed after swept collision integration');

console.log('projectile-sweep-runtime-check: PASS');
