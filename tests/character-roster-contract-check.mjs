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
  'player-commander', 'ramin', 'saman', 'nikan', 'shahin-tali', 'general-varen'
];
const mainRoles = [
  'player-commander', 'ramin', 'saman', 'nikan', 'shahin-tali', 'general-varen'
];
const secondaryRoles = [
  'arad', 'major-mehraz', 'soroush-amani', 'mehran', 'nader-rostami',
  'vardan-rifleman', 'vardan-tanker', 'vardan-engineer',
  'ash-rifleman', 'ash-elite', 'ash-crew',
  'convoy-driver', 'mechanic', 'rail-worker', 'resistance', 'medic'
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
const validTiers = new Set(['main', 'secondary']);
const validFaceModes = new Set(['cinematic', 'ambient']);

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
const isLocalAssetUrl = (value) => {
  if (typeof value !== 'string' || value.length === 0) return false;
  let decoded = value;
  for (let index = 0; index <= value.length; index += 1) {
    if (/%(?:2e|2f|5c)/i.test(decoded)) return false;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return false;
    }
  }
  const parts = decoded.split('/');
  return decoded === decoded.trim() &&
    decoded.startsWith('assets/models/characters/') &&
    !decoded.includes('\\') &&
    !decoded.includes('?') &&
    !decoded.includes('#') &&
    !/[\u0000-\u001f\u007f]/.test(decoded) &&
    parts.length >= 4 &&
    parts.every((part) => part !== '' && part !== '.' && part !== '..') &&
    parts[0] === 'assets' && parts[1] === 'models' && parts[2] === 'characters';
};

for (const entry of roster.entries) {
  assert.ok(validBodies.has(entry.body), `${entry.id} has invalid body`);
  assert.ok(validFactions.has(entry.faction), `${entry.id} has invalid faction`);
  assert.ok(validFaceTiers.has(entry.faceTier), `${entry.id} has invalid faceTier`);
  assert.ok(validTiers.has(entry.tier), `${entry.id} has invalid tier`);
  assert.ok(entry.appearance && typeof entry.appearance === 'object', `${entry.id} needs appearance`);
  assert.ok(Array.isArray(entry.appearance.bodyScale) && entry.appearance.bodyScale.length === 3,
    `${entry.id} needs a three-axis bodyScale`);
  assert.ok(entry.appearance.bodyScale.every((value) => Number.isFinite(value) && value >= 0.85 && value <= 1.15),
    `${entry.id} bodyScale must stay in safe range`);
  assert.match(entry.appearance.skinTone, /^#[0-9a-f]{6}$/i, `${entry.id} needs hex skinTone`);
  assert.ok(entry.appearance.faceMorph && typeof entry.appearance.faceMorph === 'object',
    `${entry.id} needs faceMorph`);
  assert.ok(Object.values(entry.appearance.faceMorph).every((value) => Number.isFinite(value) && value >= -1 && value <= 1),
    `${entry.id} faceMorph values must be normalized`);
  assert.ok(typeof entry.appearance.outfit === 'string' && entry.appearance.outfit.length > 0,
    `${entry.id} needs outfit preset`);
  assert.match(entry.appearance.accentColor, /^#[0-9a-f]{6}$/i, `${entry.id} needs accentColor`);
  assert.ok(validFaceModes.has(entry.appearance.faceMode), `${entry.id} has invalid faceMode`);
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

for (const id of mainRoles) {
  assert.equal(
    byId.get(id)?.geometry,
    `assets/models/characters/core/${id}.glb`,
    `${id} must load his authored rigged GLB rather than the generic template`
  );
}
for (const id of secondaryRoles) {
  assert.equal(
    byId.get(id)?.geometry,
    'assets/models/characters/core/player-commander.glb',
    `${id} must reuse the real shared rigged base until its outfit is generated at runtime`
  );
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
assert.deepEqual(
  roster.entries.filter((entry) => entry.tier === 'main').map((entry) => entry.id).sort(),
  [...mainRoles].sort(),
  'main character role set changed'
);
assert.deepEqual(
  roster.entries.filter((entry) => entry.tier === 'secondary').map((entry) => entry.id).sort(),
  [...secondaryRoles].sort(),
  'secondary character role set changed'
);
for (const entry of roster.entries) {
  assert.equal(entry.faceTier === 'full', entry.tier === 'main',
    `${entry.id} face tier must match runtime tier`);
  assert.equal(entry.appearance.faceMode, entry.tier === 'main' ? 'cinematic' : 'ambient',
    `${entry.id} face mode must match runtime tier`);
}

console.log('character-roster-contract-check: PASS');
