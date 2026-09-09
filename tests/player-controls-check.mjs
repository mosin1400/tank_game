import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../src/entities/player.js',import.meta.url),'utf8');
const driveBlock=source.slice(source.indexOf('function updatePlayer'),source.indexOf('if(stickMove.id'));

assert.match(driveBlock,/if\(keys\.KeyW\)thr=1;/,'W must be the only keyboard forward control');
assert.match(driveBlock,/if\(keys\.KeyS\)thr=-1;/,'S must be the only keyboard reverse control');
assert.match(driveBlock,/if\(keys\.KeyA\)turn\+=1;/,'A must be the only keyboard left-turn control');
assert.match(driveBlock,/if\(keys\.KeyD\)turn-=1;/,'D must be the only keyboard right-turn control');
assert.doesNotMatch(driveBlock,/ArrowUp|ArrowDown|ArrowLeft|ArrowRight/,
  'direction keys must never drive or steer the tank hull');

console.log('player-controls-check: PASS');
