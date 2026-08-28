import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/scenes/scene-builder.js',import.meta.url),'utf8');
assert.match(source,/spawnCharacter\(role,\{x,y:0,z\},\{[^}]*initialState:animationState/,
  'scene character placement must pass its animation state to CharacterManager');
assert.doesNotMatch(source,/\['marium'/,
  'the redundant tank driver must be absent from operation one');
assert.doesNotMatch(source,/civilian/,
  'operation one must not spawn civilian actors');
console.log('m01-character-animation-check: PASS');
