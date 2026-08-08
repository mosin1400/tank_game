import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const moduleUrl = new URL('../src/entities/character-wardrobe.js', import.meta.url);
const source = await readFile(moduleUrl, 'utf8').catch(() => '');
const context = vm.createContext({ globalThis: {}, console });
vm.runInContext(source, context, { filename: 'src/entities/character-wardrobe.js' });
const { CharacterWardrobe } = context.globalThis;

class Node {
  constructor() { this.children = []; this.parent = null; this.name = ''; }
  add(child) { child.parent = this; this.children.push(child); }
}
class Group extends Node {}
class Mesh extends Node {
  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; }
}
class BoxGeometry { constructor(...args) { this.args = args; } }
class MeshStandardMaterial { constructor(options) { Object.assign(this, options); } }

const spine = new Node(); spine.name = 'mixamorig:Spine2';
const rightHand = new Node(); rightHand.name = 'mixamorig:RightHand';
const armature = {
  getObjectByName(name) { return { 'mixamorig:Spine2': spine, 'mixamorig:RightHand': rightHand }[name] || null; }
};
const THREE = { Group, Mesh, BoxGeometry, MeshStandardMaterial };
const entry = {
  id: 'arad',
  gear: ['radio-headset', 'cipher-notebook'],
  appearance: { outfit: 'radio-operator', accentColor: '#344b35' }
};
const snapshot = structuredClone(entry);

assert.ok(CharacterWardrobe, 'CharacterWardrobe must be attached to globalThis');
const layers = CharacterWardrobe.createLayers(THREE, entry, armature);

assert.deepEqual(entry, snapshot, 'creating a wardrobe must not mutate roster data');
assert.ok(layers.undershirt instanceof Mesh, 'every character needs an undershirt mesh');
assert.ok(layers.uniform instanceof Mesh, 'every character needs a uniform mesh');
assert.equal(layers.undershirt.parent, spine, 'undershirt must attach to the real Mixamo Spine2 bone');
assert.equal(layers.uniform.parent, spine, 'uniform must attach to the real Mixamo Spine2 bone');
assert.ok(layers.kit instanceof Mesh, 'gear must produce an optional kit mesh');
assert.equal(layers.kit.parent, rightHand, 'hand-held kit must attach to the real Mixamo hand bone');
assert.equal(layers.uniform.material.userData.outfit, 'radio-operator', 'uniform must retain its roster outfit identity');
assert.equal(layers.uniform.material.userData.accentColor, '#344b35', 'uniform must retain its roster accent color');

console.log('character-wardrobe-check: PASS');
