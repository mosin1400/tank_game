import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/entities/animation-manager.js', import.meta.url), 'utf8');
const context = vm.createContext({ globalThis: {}, console });
vm.runInContext(source, context, { filename: 'src/entities/animation-manager.js' });
const { AnimationManager } = context.globalThis;

assert.ok(AnimationManager, 'AnimationManager must be attached to globalThis');

const calls = [];
function action(name) {
  return {
    name,
    enabled: false,
    timeScale: 1,
    reset() { calls.push(`${name}:reset`); return this; },
    play() { calls.push(`${name}:play`); return this; },
    stop() { calls.push(`${name}:stop`); return this; },
    crossFadeTo(target, seconds, warp) { calls.push(`${name}:fade:${target.name}:${seconds}:${warp}`); return this; }
  };
}
const mixer = {
  updates: [],
  clipAction(clip) { return action(clip.name); },
  update(dt) { this.updates.push(dt); },
  stopAllAction() { calls.push('mixer:stopAll'); }
};
const clips = ['idle', 'walk', 'run', 'aim', 'fall', 'talk', 'point', 'rifle-walk'].map((name) => ({ name }));
const controller = AnimationManager.create({ mixer, clips, initial: 'idle' });

assert.equal(controller.state(), 'idle');
assert.deepEqual(calls.slice(0, 2), ['idle:reset', 'idle:play']);
assert.equal(controller.setState('walk'), true);
assert.equal(controller.state(), 'walk');
assert.ok(calls.includes('walk:reset'));
assert.ok(calls.includes('walk:play'));
assert.ok(calls.includes('idle:fade:walk:0.2:true'));
assert.equal(controller.setState('walk'), false, 'same state must not restart animation');
assert.equal(controller.setState('unknown'), false, 'unknown state must be ignored');

controller.pause(true);
controller.update(0.25);
assert.deepEqual(mixer.updates, [], 'paused controller must not update mixer');
controller.pause(false);
controller.update(0.25);
assert.deepEqual(mixer.updates, [0.25]);
assert.equal(controller.setState('talk', 0.45), true);
assert.ok(calls.includes('walk:fade:talk:0.45:true'));
assert.equal(controller.setState('rifle-aim'), true, 'public state alias should resolve to a baked clip');
assert.equal(controller.state(), 'rifle-aim');
assert.ok(calls.includes('talk:fade:aim:0.2:true'));
assert.equal(controller.setState('rifle-walk'), true, 'armed locomotion must have its own clip');
assert.equal(controller.actionTimeScale('rifle-walk'), 0.58, 'rifle run must play slowly as an armed walk');
controller.dispose();
assert.equal(controller.disposed, true);
assert.ok(calls.includes('mixer:stopAll'));
assert.equal(controller.setState('idle'), false, 'disposed controller must ignore state requests');

assert.throws(
  () => AnimationManager.create({ mixer, clips: [{ name: 'idle' }], initial: 'walk' }),
  /Missing initial animation state: walk/
);

console.log('animation-manager-check: PASS');
