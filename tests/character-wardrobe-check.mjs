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
const head = new Node(); head.name = 'mixamorig:Head';
const rightHand = new Node(); rightHand.name = 'mixamorig:RightHand';
const leftUpLeg = new Node(); leftUpLeg.name = 'mixamorig:LeftUpLeg';
const rightUpLeg = new Node(); rightUpLeg.name = 'mixamorig:RightUpLeg';
const armature = {
  getObjectByName(name) {
    return {
      'mixamorig:Spine2': spine, 'mixamorig:Head': head, 'mixamorig:RightHand': rightHand,
      'mixamorig:LeftUpLeg': leftUpLeg, 'mixamorig:RightUpLeg': rightUpLeg
    }[name] || null;
  }
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
assert.ok(layers.undershirt.children.some((piece) => piece.name === 'wardrobe-undershirt-collar'),
  'undershirt must retain a visible collar outside the uniform');
assert.ok(layers.undershirt.children.some((piece) => piece.name === 'wardrobe-undershirt-hem'),
  'undershirt must retain a visible hem outside the uniform');
assert.ok(layers.undershirt.children.some((piece) => piece.name === 'wardrobe-undershirt-sleeve-left'),
  'undershirt must retain visible sleeves outside the uniform');
const collar = layers.undershirt.children.find((piece) => piece.name === 'wardrobe-undershirt-collar');
assert.ok(collar.position.z > layers.uniform.geometry.args[2] / 2,
  'the undershirt collar must extend beyond the tunic instead of being hidden inside it');
assert.ok(layers.trousers.left instanceof Mesh && layers.trousers.right instanceof Mesh,
  'a uniform must include separate leg garments');
assert.equal(layers.trousers.left.parent, leftUpLeg, 'left trouser must attach to the left Mixamo leg');
assert.equal(layers.trousers.right.parent, rightUpLeg, 'right trouser must attach to the right Mixamo leg');
assert.ok(layers.kit instanceof Mesh, 'gear must produce an optional primary kit mesh');
assert.equal(layers.kit.parent, head, 'Arad radio-headset must attach to the real Mixamo head bone');
assert.equal(layers.accessories.find((piece) => piece.name === 'wardrobe-kit-cipher-notebook').parent, rightHand,
  'Arad notebook must attach to the real Mixamo hand bone');
assert.equal(layers.uniform.material.userData.outfit, 'radio-operator', 'uniform must retain its roster outfit identity');
assert.equal(layers.uniform.material.userData.accentColor, '#344b35', 'uniform must retain its roster accent color');

const tankerHead = new Node(); tankerHead.name = 'Head';
const tankerSpine = new Node(); tankerSpine.name = 'Spine2';
const tankerLeftLeg = new Node(); tankerLeftLeg.name = 'LeftUpLeg';
const tankerRightLeg = new Node(); tankerRightLeg.name = 'RightUpLeg';
const tankerArmature = {
  skeleton: { bones: [tankerHead, tankerSpine, tankerLeftLeg, tankerRightLeg] }
};
const tankerEntry = {
  id: 'vardan-tanker', gear: ['vardan-tanker-helmet', 'vardan-tanker-vest'],
  appearance: { outfit: 'vardan-tanker', accentColor: '#4e633a' }
};
const tankerLayers = CharacterWardrobe.createLayers(THREE, tankerEntry, tankerArmature);
assert.equal(tankerLayers.kit.parent, tankerHead, 'tank helmet must attach through skeleton bone lookup');
assert.equal(tankerLayers.accessories.find((piece) => piece.name === 'wardrobe-kit-vardan-tanker-vest').parent, tankerSpine,
  'tank vest must attach to the spine bone');

console.log('character-wardrobe-check: PASS');
