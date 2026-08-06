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

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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

function assertInvalidRoster(mutator, expectedError, message) {
  const candidate = structuredClone(manifest);
  mutator(candidate);
  assert.throws(() => CharacterRoster.validate(candidate), expectedError, message);
  assert.equal(
    CharacterRoster.get('player-commander'),
    player,
    `${message}: validation must remain atomic`
  );
}

assertInvalidRoster(
  (candidate) => { candidate.entries = []; },
  /approved character roster/,
  'an empty roster must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries = candidate.entries.filter((entry) => entry.id !== 'ramin'); },
  /approved character roster/,
  'a missing approved role must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.push({ ...candidate.entries[0], id: 'extra-role' }); },
  /approved character roster/,
  'an extra role must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.find((entry) => entry.id === 'ramin').kind = 'soldier'; },
  /approved character roster/,
  'a role in the wrong kind must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.find((entry) => entry.id === 'player-commander').body = 'heavy'; },
  /approved character roster/,
  'a role with the wrong approved body must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.find((entry) => entry.id === 'player-commander').faction = 'ash'; },
  /approved character roster/,
  'a role with the wrong approved faction must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.find((entry) => entry.id === 'player-commander').defaultState = 'walk'; },
  /approved character roster/,
  'a role with the wrong approved default state must be rejected'
);
assertInvalidRoster(
  (candidate) => {
    candidate.entries.find((entry) => entry.id === 'player-commander').faceTier = 'simple';
    candidate.entries.find((entry) => entry.id === 'major-mehraz').faceTier = 'full';
  },
  /approved character roster/,
  'the exact seven full-face roles must be enforced'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.find((entry) => entry.id === 'vardan-tanker').fallback = 'missing-role'; },
  /Unknown character fallback/,
  'a missing fallback must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.find((entry) => entry.id === 'vardan-tanker').fallback = 'vardan-tanker'; },
  /cannot fall back to itself/,
  'a self fallback must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.find((entry) => entry.id === 'vardan-tanker').fallback = 'player-commander'; },
  /share kind and faction/,
  'a fallback with the wrong kind must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.find((entry) => entry.id === 'vardan-tanker').fallback = 'ash-rifleman'; },
  /share kind and faction/,
  'a fallback with the wrong faction must be rejected'
);
assertInvalidRoster(
  (candidate) => { candidate.entries.find((entry) => entry.id === 'vardan-tanker').fallback = 'vardan-engineer'; },
  /approved fallback root/,
  'a secondary role must use its approved fallback root'
);
assertInvalidRoster(
  (candidate) => {
    candidate.entries.find((entry) => entry.id === 'vardan-rifleman').fallback = 'vardan-tanker';
  },
  /approved fallback root/,
  'a fallback root must remain a root and cannot form a cycle'
);

for (const unsafeGeometry of [
  'assets/models/characters/%2e%2e/outside.glb',
  'assets/models/characters/core%2f%2e%2e%2foutside.glb',
  'assets/models/characters/core%5c%2e%2e%5coutside.glb',
  'assets/models/characters/%252e%252e/outside.glb',
  'assets/models/characters/core/./commander.glb'
]) {
  assertInvalidRoster(
    (candidate) => { candidate.entries[0].geometry = unsafeGeometry; },
    /Invalid character geometry URL/,
    `unsafe geometry path must be rejected: ${unsafeGeometry}`
  );
}
assertInvalidRoster(
  (candidate) => {
    candidate.entries[0].motion = 'assets/models/characters/animation%5c%2e%2e%5coutside.glb';
  },
  /Invalid character motion URL/,
  'encoded traversal in a motion path must be rejected'
);

response = structuredClone(manifest);
CharacterRoster.reset();
const reload = CharacterRoster.load('fresh-roster.json');
await Promise.resolve();
assert.equal(fetchCount, 2, 'reset() must permit a fresh fetch');
releaseFetch();
await reload;
assert.equal(CharacterRoster.get('player-commander').id, 'player-commander');

const staleResolveRequest = deferred();
const freshResolveRequest = deferred();
const resolveRequests = [staleResolveRequest, freshResolveRequest];
CharacterRoster.reset();
CharacterRoster.configure({ fetchJson: () => resolveRequests.shift().promise });

const staleResolveLoad = CharacterRoster.load('stale-generation.json');
await Promise.resolve();
CharacterRoster.reset();
const freshResolveLoad = CharacterRoster.load('fresh-generation.json');
await Promise.resolve();

const freshResolveRoster = structuredClone(manifest);
freshResolveRoster.entries[0].gear = ['fresh-generation'];
freshResolveRequest.resolve(freshResolveRoster);
await freshResolveLoad;

const staleResolveRoster = structuredClone(manifest);
staleResolveRoster.entries[0].gear = ['stale-generation'];
staleResolveRequest.resolve(staleResolveRoster);
await staleResolveLoad;
assert.deepEqual(
  [...CharacterRoster.get('player-commander').gear],
  ['fresh-generation'],
  'a pre-reset resolve must not overwrite the fresh roster'
);

const staleRejectRequest = deferred();
const freshAfterRejectRequest = deferred();
const rejectRequests = [staleRejectRequest, freshAfterRejectRequest];
let resetRaceFetchCount = 0;
CharacterRoster.reset();
CharacterRoster.configure({
  fetchJson() {
    resetRaceFetchCount += 1;
    return rejectRequests.shift().promise;
  }
});

const staleRejectLoad = CharacterRoster.load('stale-rejection.json');
await Promise.resolve();
CharacterRoster.reset();
const freshAfterRejectLoad = CharacterRoster.load('fresh-after-rejection.json');
await Promise.resolve();

const staleRejection = assert.rejects(staleRejectLoad, /stale request failed/);
staleRejectRequest.reject(new Error('stale request failed'));
await staleRejection;
const deduplicatedFreshLoad = CharacterRoster.load('must-deduplicate.json');
assert.equal(
  deduplicatedFreshLoad,
  freshAfterRejectLoad,
  'a pre-reset rejection must not clear the fresh in-flight promise'
);
assert.equal(resetRaceFetchCount, 2, 'the fresh load must remain deduplicated');

freshAfterRejectRequest.resolve(structuredClone(manifest));
await Promise.all([freshAfterRejectLoad, deduplicatedFreshLoad]);
assert.equal(CharacterRoster.get('player-commander').id, 'player-commander');

console.log('character-roster-module-check: PASS');
