import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const moduleUrl = new URL('../src/assets/character-roster.js', import.meta.url);
const manifestUrl = new URL(
  '../assets/models/characters/manifests/character-roster.json',
  import.meta.url
);
const source = await readFile(moduleUrl, 'utf8');
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

const context = vm.createContext({ console });
vm.runInContext(source, context, { filename: 'src/assets/character-roster.js' });
const { CharacterRoster } = context;

assert.ok(CharacterRoster, 'CharacterRoster must be attached to globalThis');
assert.throws(
  () => CharacterRoster.get('player-commander'),
  /Character roster is not loaded/
);

let fetchCount = 0;
let releaseFetch;
let response = structuredClone(manifest);
CharacterRoster.configure({
  fetchJson() {
    fetchCount += 1;
    return new Promise((resolve) => {
      releaseFetch = () => resolve(response);
    });
  }
});

const firstLoad = CharacterRoster.load();
const concurrentLoad = CharacterRoster.load();
assert.equal(fetchCount, 0, 'fetch begins asynchronously after load returns');
await Promise.resolve();
assert.equal(fetchCount, 1, 'concurrent loads must fetch once');
releaseFetch();
const [firstData, concurrentData] = await Promise.all([firstLoad, concurrentLoad]);

assert.equal(firstData, concurrentData, 'concurrent loads share one resolved roster');
assert.ok(Object.isFrozen(firstData), 'loaded roster must be frozen');
assert.ok(Object.isFrozen(firstData.entries), 'loaded entries array must be frozen');
assert.ok(Object.isFrozen(firstData.entries[0]), 'loaded entries must be frozen');
assert.ok(Object.isFrozen(firstData.entries[0].gear), 'nested gear arrays must be frozen');

response.entries[0].body = 'heavy';
response.entries[0].gear.push('mutable-source-change');
assert.equal(CharacterRoster.get('player-commander').body, 'medium');
assert.deepEqual(
  [...CharacterRoster.get('player-commander').gear],
  ['commander-coat', 'commander-cap'],
  'mutating fetched JSON must not affect the loaded index'
);

const player = CharacterRoster.get('player-commander');
const named = CharacterRoster.list('named');
assert.ok(Object.isFrozen(player), 'get() must return a frozen entry');
assert.ok(Object.isFrozen(named), 'list() must return a frozen array');
assert.equal(named.length, 11);
assert.ok(named.every(Object.isFrozen), 'list() entries must be frozen');
assert.ok(Object.isFrozen(CharacterRoster.motionClips()), 'motionClips() must be frozen');
assert.deepEqual(
  [...CharacterRoster.motionClips()],
  ['idle', 'walk', 'run', 'crouch-walk', 'talk', 'point', 'radio',
    'binoculars', 'brace', 'driver-sit', 'hatch-idle', 'repair',
    'rifle-aim', 'rifle-reload', 'hit-react', 'fall']
);

assert.throws(
  () => CharacterRoster.get('missing-role'),
  /Unknown character role: missing-role/
);

const invalid = structuredClone(manifest);
invalid.entries[1].id = invalid.entries[0].id;
assert.throws(() => CharacterRoster.validate(invalid), /Duplicate character role/);
assert.equal(
  CharacterRoster.get('player-commander'),
  player,
  'failed validation must not replace the last valid index'
);

response = structuredClone(manifest);
CharacterRoster.reset();
const reload = CharacterRoster.load('fresh-roster.json');
await Promise.resolve();
assert.equal(fetchCount, 2, 'reset() must permit a fresh fetch');
releaseFetch();
await reload;
assert.equal(CharacterRoster.get('player-commander').id, 'player-commander');

console.log('character-roster-module-check: PASS');
