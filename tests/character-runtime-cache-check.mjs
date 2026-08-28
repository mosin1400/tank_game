import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../game.html',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../src/boot.js',import.meta.url),'utf8');
const manager=fs.readFileSync(new URL('../src/entities/character-manager.js',import.meta.url),'utf8');
assert.match(html,/src\/boot\.js\?v=[a-z0-9-]+/i,'game.html must invalidate a cached boot.js');
assert.match(boot,/GAME_SCRIPTS\[i\]\+'\?v='\+BUILD_VERSION/,'boot must invalidate cached runtime scripts');
assert.match(boot,/character-manager\.js/,'CharacterManager must be in the shipped script chain');
assert.match(manager,/CharacterRoster\.load\('assets\/models\/characters\/manifests\/character-roster\.json\?v=20260828-combat-v3'\)/,
  'the character manifest must share the combat cache version with its validator');
console.log('character-runtime-cache-check: PASS');
