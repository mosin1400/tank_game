import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rosterUrl = new URL(
  '../assets/models/characters/manifests/character-roster.json',
  import.meta.url
);
const roster = JSON.parse(await readFile(rosterUrl, 'utf8'));

const expected = {
  named: [
    'player-commander', 'ramin', 'saman', 'nikan', 'arad',
    'major-mehraz', 'shahin-tali', 'general-varen', 'soroush-amani',
    'mehran', 'nader-rostami'
  ],
  soldier: [
    'vardan-rifleman', 'vardan-tanker', 'vardan-engineer',
    'ash-rifleman', 'ash-elite', 'ash-crew'
  ],
  general: ['convoy-driver', 'mechanic', 'rail-worker', 'resistance', 'medic']
};
const clips = [
  'idle', 'walk', 'run', 'crouch-walk', 'talk', 'point', 'radio',
  'binoculars', 'brace', 'driver-sit', 'hatch-idle', 'repair',
  'rifle-aim', 'rifle-reload', 'hit-react', 'fall'
];
const fullFaceRoles = [
  'player-commander', 'ramin', 'saman', 'nikan', 'arad',
  'shahin-tali', 'general-varen'
];
const namedBodies = {
  'player-commander': 'medium',
  ramin: 'lean',
  saman: 'medium',
  nikan: 'medium',
  arad: 'lean',
  'major-mehraz': 'heavy',
  'shahin-tali': 'heavy',
  'general-varen': 'lean',
  'soroush-amani': 'lean',
  mehran: 'heavy',
  'nader-rostami': 'medium'
};
const validBodies = new Set(['lean', 'medium', 'heavy']);
const validFactions = new Set(['vardan', 'ash', 'civilian']);
const validFaceTiers = new Set(['full', 'simple']);

assert.equal(roster.schemaVersion, 1, 'roster schema version must be 1');
assert.deepEqual(roster.motionClips, clips, 'shared motion clip order changed');
assert.ok(Array.isArray(roster.entries), 'roster entries must be an array');

const ids = roster.entries.map((entry) => entry.id);
assert.equal(new Set(ids).size, ids.length, 'character role IDs must be unique');

for (const [kind, expectedIds] of Object.entries(expected)) {
  const actualIds = roster.entries
    .filter((entry) => entry.kind === kind)
    .map((entry) => entry.id)
    .sort();
  assert.deepEqual(actualIds, [...expectedIds].sort(), `${kind} role IDs changed`);
}
assert.deepEqual(
  [...new Set(roster.entries.map((entry) => entry.kind))].sort(),
  Object.keys(expected).sort(),
  'roster contains an unknown role kind'
);

const byId = new Map(roster.entries.map((entry) => [entry.id, entry]));
const isLocalAssetUrl = (value) => (
  typeof value === 'string' &&
  value.startsWith('assets/models/characters/') &&
  !value.startsWith('/') &&
  !value.includes('..') &&
  !/^[a-z][a-z\d+.-]*:/i.test(value) &&
  !value.includes('\\')
);

for (const entry of roster.entries) {
  assert.ok(validBodies.has(entry.body), `${entry.id} has invalid body`);
  assert.ok(validFactions.has(entry.faction), `${entry.id} has invalid faction`);
  assert.ok(validFaceTiers.has(entry.faceTier), `${entry.id} has invalid faceTier`);
  assert.ok(isLocalAssetUrl(entry.geometry), `${entry.id} geometry must be a local relative asset URL`);
  assert.ok(isLocalAssetUrl(entry.motion), `${entry.id} motion must be a local relative asset URL`);
  assert.ok(clips.includes(entry.defaultState), `${entry.id} has invalid defaultState`);
  assert.ok(Array.isArray(entry.gear), `${entry.id} gear must be an array`);

  if (entry.fallback !== null) {
    const fallback = byId.get(entry.fallback);
    assert.ok(fallback, `${entry.id} fallback does not exist`);
    assert.notEqual(entry.fallback, entry.id, `${entry.id} cannot fall back to itself`);
    assert.equal(fallback.kind, entry.kind, `${entry.id} fallback must share its kind`);
    assert.equal(fallback.faction, entry.faction, `${entry.id} fallback must share its faction`);
  }
}

for (const [id, body] of Object.entries(namedBodies)) {
  assert.equal(byId.get(id)?.body, body, `${id} must use its approved body class`);
  assert.equal(byId.get(id)?.fallback, null, `${id} must not use a fallback`);
}

for (const entry of roster.entries.filter((candidate) => candidate.kind !== 'named')) {
  const fallbackRoot = entry.faction === 'vardan'
    ? 'vardan-rifleman'
    : entry.faction === 'ash'
      ? 'ash-rifleman'
      : 'convoy-driver';
  assert.equal(
    entry.fallback,
    entry.id === fallbackRoot ? null : fallbackRoot,
    `${entry.id} must use its faction fallback root`
  );
}

assert.deepEqual(
  roster.entries.filter((entry) => entry.faceTier === 'full').map((entry) => entry.id).sort(),
  [...fullFaceRoles].sort(),
  'full facial animation role set changed'
);

console.log('character-roster-contract-check: PASS');
