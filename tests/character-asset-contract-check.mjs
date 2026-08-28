import fs from 'node:fs/promises';

const file = new URL('../assets/models/characters/vardan-men.glb', import.meta.url);
const bytes = await fs.readFile(file);
const required = [
  'idle',
  'walk',
  'run',
  'point',
  'radio',
  'binoculars',
  'driver-sit',
  'brace',
].sort();

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(bytes.length >= 20, 'character asset is too short to be a GLB');
check(bytes.toString('ascii', 0, 4) === 'glTF', 'character asset must be binary glTF');
check(bytes.readUInt32LE(4) === 2, 'character GLB must use glTF 2.0');
check(bytes.readUInt32LE(8) === bytes.length, 'GLB header length must match file size');

const chunks = [];
for (let offset = 12; offset < bytes.length;) {
  check(offset + 8 <= bytes.length, 'truncated GLB chunk header');
  const length = bytes.readUInt32LE(offset);
  const type = bytes.readUInt32LE(offset + 4);
  check(length % 4 === 0, 'GLB chunks must be padded to four bytes');
  check(offset + 8 + length <= bytes.length, 'GLB chunk exceeds declared file bounds');
  chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) });
  offset += 8 + length;
}
check(chunks.length >= 2, 'character GLB needs JSON and BIN chunks');
check(chunks[0].type === 0x4e4f534a, 'first GLB chunk must be JSON');
check(chunks.filter((chunk) => chunk.type === 0x4e4f534a).length === 1, 'GLB needs exactly one JSON chunk');
check(chunks.filter((chunk) => chunk.type === 0x004e4942).length === 1, 'GLB needs exactly one BIN chunk');

const json = JSON.parse(chunks[0].data.toString('utf8').trim());
const bin = chunks.find((chunk) => chunk.type === 0x004e4942).data;
check(json.asset?.version === '2.0', 'glTF JSON asset version must be 2.0');
check(Array.isArray(json.buffers) && json.buffers.length === 1, 'GLB needs one embedded buffer');
check(!json.buffers[0].uri, 'GLB must embed its buffer');
check(json.buffers[0].byteLength <= bin.length, 'BIN chunk is shorter than the declared buffer');

for (const [index, view] of (json.bufferViews || []).entries()) {
  const start = view.byteOffset || 0;
  check(view.buffer === 0, `bufferView ${index} must use the embedded buffer`);
  check(Number.isInteger(view.byteLength) && view.byteLength > 0, `bufferView ${index} has invalid length`);
  check(start >= 0 && start + view.byteLength <= json.buffers[0].byteLength, `bufferView ${index} exceeds buffer bounds`);
}

check(Array.isArray(json.images) && json.images.length > 0, 'character GLB needs embedded textures');
for (const [index, image] of json.images.entries()) {
  check(!image.uri, `image ${index} must not use an external URI`);
  check(Number.isInteger(image.bufferView), `image ${index} must use an embedded bufferView`);
  check(json.bufferViews?.[image.bufferView], `image ${index} references a missing bufferView`);
  check(['image/webp', 'image/png', 'image/jpeg'].includes(image.mimeType), `image ${index} has unsupported MIME type`);
}

check(Array.isArray(json.skins) && json.skins.length > 0, 'character GLB needs a skin');
for (const [index, skin] of json.skins.entries()) {
  check(Array.isArray(skin.joints) && skin.joints.length > 0, `skin ${index} needs joints`);
  for (const joint of skin.joints) {
    check(Number.isInteger(joint) && json.nodes?.[joint], `skin ${index} references invalid joint node ${joint}`);
  }
}
check(Array.isArray(json.meshes) && json.meshes.length > 0, 'character GLB needs a mesh');

const animations = json.animations || [];
const names = animations.map((clip) => clip.name).sort();
check(JSON.stringify(names) === JSON.stringify(required), `animation names must be exactly: ${required.join(', ')}`);
for (const animation of animations) {
  check(animation.channels?.length > 0, `animation ${animation.name} has no channels`);
  check(animation.samplers?.length > 0, `animation ${animation.name} has no samplers`);
  for (const [index, sampler] of animation.samplers.entries()) {
    const input = json.accessors?.[sampler.input];
    const output = json.accessors?.[sampler.output];
    check(input && output, `animation ${animation.name} sampler ${index} has invalid accessors`);
    check(input.type === 'SCALAR' && input.count >= 2, `animation ${animation.name} sampler ${index} needs time samples`);
    check(input.min?.length === 1 && input.max?.length === 1 && input.max[0] > input.min[0], `animation ${animation.name} sampler ${index} has no usable duration`);
  }
  for (const [index, channel] of animation.channels.entries()) {
    check(animations.length && animation.samplers[channel.sampler], `animation ${animation.name} channel ${index} has an invalid sampler`);
    check(json.nodes?.[channel.target?.node], `animation ${animation.name} channel ${index} has an invalid target node`);
    check(['translation', 'rotation', 'scale', 'weights'].includes(channel.target?.path), `animation ${animation.name} channel ${index} has an invalid target path`);
  }
}

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let k = 0; k < 4; k += 1) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
  }
  return out;
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  return [
    (1 - 2 * y * y - 2 * z * z) * sx, (2 * x * y + 2 * w * z) * sx, (2 * x * z - 2 * w * y) * sx, 0,
    (2 * x * y - 2 * w * z) * sy, (1 - 2 * x * x - 2 * z * z) * sy, (2 * y * z + 2 * w * x) * sy, 0,
    (2 * x * z + 2 * w * y) * sz, (2 * y * z - 2 * w * x) * sz, (1 - 2 * x * x - 2 * y * y) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function transform(matrix, [x, y, z]) {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const points = [];
let forwardMetadataFound = false;
let skinnedMeshNodeFound = false;
const roots = json.scenes?.[json.scene || 0]?.nodes || [];
check(roots.length > 0, 'character GLB needs a default scene root');

function visit(nodeIndex, parentMatrix, ancestry = new Set()) {
  check(!ancestry.has(nodeIndex), 'character scene graph contains a cycle');
  const node = json.nodes?.[nodeIndex];
  check(node, `scene references missing node ${nodeIndex}`);
  const world = multiply(parentMatrix, nodeMatrix(node));
  if (node.extras?.runtimeForward === '+Z' && node.extras?.requiresVisualForwardCheck === true) {
    forwardMetadataFound = true;
  }
  if (Number.isInteger(node.mesh)) {
    const mesh = json.meshes[node.mesh];
    check(mesh, `node ${nodeIndex} references missing mesh`);
    if (Number.isInteger(node.skin)) {
      check(json.skins[node.skin], `node ${nodeIndex} references missing skin`);
      skinnedMeshNodeFound = true;
    }
    for (const primitive of mesh.primitives || []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION];
      check(accessor?.type === 'VEC3', `mesh ${node.mesh} needs VEC3 POSITION bounds`);
      check(accessor.min?.length === 3 && accessor.max?.length === 3, `mesh ${node.mesh} POSITION needs min/max bounds`);
      if (Number.isInteger(node.skin)) {
        const joints = json.accessors?.[primitive.attributes?.JOINTS_0];
        const weights = json.accessors?.[primitive.attributes?.WEIGHTS_0];
        check(joints?.type === 'VEC4', `skinned mesh ${node.mesh} needs JOINTS_0 VEC4 data`);
        check([5121, 5123].includes(joints.componentType), `skinned mesh ${node.mesh} has invalid JOINTS_0 component type`);
        check(weights?.type === 'VEC4', `skinned mesh ${node.mesh} needs WEIGHTS_0 VEC4 data`);
        check(
          weights.componentType === 5126 || ([5121, 5123].includes(weights.componentType) && weights.normalized === true),
          `skinned mesh ${node.mesh} has invalid WEIGHTS_0 component type`,
        );
        check(joints.count === accessor.count && weights.count === accessor.count, `skinned mesh ${node.mesh} skin attributes must match POSITION count`);
      }
      for (const x of [accessor.min[0], accessor.max[0]]) {
        for (const y of [accessor.min[1], accessor.max[1]]) {
          for (const z of [accessor.min[2], accessor.max[2]]) points.push(transform(world, [x, y, z]));
        }
      }
    }
  }
  const nextAncestry = new Set(ancestry).add(nodeIndex);
  for (const child of node.children || []) visit(child, world, nextAncestry);
}

for (const root of roots) visit(root, identity);
check(points.length > 0, 'character scene contains no bounded mesh primitives');
check(skinnedMeshNodeFound, 'character scene needs a node that binds a mesh to a skin');
const minimum = [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis])));
const maximum = [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis])));
const height = maximum[1] - minimum[1];
check(height >= 1.65 && height <= 1.95, `character height must be 1.65–1.95m, got ${height.toFixed(3)}m`);
check(Math.abs(minimum[1]) <= 0.02, `character feet must be at y=0, got ${minimum[1].toFixed(3)}`);
check(Math.abs((minimum[0] + maximum[0]) * 0.5) <= 0.03, 'character must be centred on world X');
check(Math.abs((minimum[2] + maximum[2]) * 0.5) <= 0.03, 'character must be centred on world Z');
check(forwardMetadataFound, 'character root must declare +Z runtime forward and the mandatory visual gate');

console.log('PASS: licensed male character GLB contract');
