# Male Character Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every primitive M01 person with an optimized realistic male MakeHuman character using a shared Mixamo rig, named animations, male narrative roles and leak-free Three.js playback.

**Architecture:** A single optimized GLB is preloaded and cached by `ModelLoader`; `HumanActors` creates skinned clones, selects visual variants and owns `AnimationMixer` instances. SceneBuilder requests actors by role and owns their disposal. Narrative conversion is a repository-wide data migration performed in the same playable checkpoint.

**Tech Stack:** MakeHuman Community 1.3.0, Mixamo, Blender 4.2 LTS portable, glTF 2.0/GLB, Three.js r160 `GLTFLoader`, `SkeletonUtils.clone`, JavaScript and Node contract tests.

## Global Constraints

- Every named story character, visible model, spoken line, subtitle and role is male.
- Final character delivery is `assets/models/characters/vardan-men.glb` with one shared humanoid skeleton.
- Required animation names are `idle`, `walk`, `run`, `point`, `radio`, `binoculars`, `driver-sit` and `brace`.
- M01 humans are non-combatants; the observer is removed by the tower event.
- MakeHuman core assets must be CC0; Mixamo assets are used only under Adobe's video-game permission.
- All asset sources, licenses, acquisition dates and modifications are recorded in `docs/credits/assets.md`.
- No current gameplay feature, mission mode, profile state or weapon is removed.
- Every runtime behavior starts with a failing test and ends with a fresh full-suite run.

---

## File Structure

| File | Responsibility |
|---|---|
| `assets/models/characters/vardan-men.glb` | Optimized male skinned mesh, material variants and eight named animation clips. |
| `tools/characters/build-vardan-men.py` | Deterministic Blender conversion, clip naming, gesture authoring, optimization and GLB export. |
| `vendor/three/examples/jsm/loaders/GLTFLoader.js` | Offline Three.js r160 GLB loader. |
| `vendor/three/examples/jsm/utils/SkeletonUtils.js` | Offline r160 skinned-clone helper. |
| `src/assets/model-loader.js` | Cached model preload, skinned cloning, lookup and disposal. |
| `src/entities/human-actors.js` | Actor roles, animation cross-fades, update and lifecycle. |
| `src/scenes/scene-builder.js` | Requests six M01 actor roles and owns returned actor handles. |
| `src/core/runtime.js`, `src/boot.js` | Loader globals, dependency order and startup preload. |
| `src/main.js` | Per-frame actor animation update and world cleanup. |
| Story/runtime files | Replace five female-coded identities consistently. |
| `docs/credits/assets.md` | MakeHuman and Mixamo provenance ledger. |

### Task 1: Acquire and build the licensed male GLB

**Files:**
- Create: `assets/models/characters/vardan-men.glb`
- Create: `tools/characters/build-vardan-men.py`
- Create: `docs/credits/assets.md`
- Modify: `.gitignore`
- Create: `tests/character-asset-contract-check.mjs`

**Interfaces:**
- Produces a GLB whose JSON chunk has at least one skin, one mesh, eight exact animation names and no external URI.
- The primary mesh is centred at world origin, feet at `y=0`, faces `+Z`, and has an adult male height between 1.65 and 1.95 metres.

- [ ] **Step 1: Write the failing GLB contract test**

Create `tests/character-asset-contract-check.mjs`:

```js
import fs from 'node:fs/promises';

const file=new URL('../assets/models/characters/vardan-men.glb',import.meta.url);
const bytes=await fs.readFile(file);
if(bytes.toString('ascii',0,4)!=='glTF')throw new Error('character asset must be binary glTF');
const jsonLength=bytes.readUInt32LE(12);
const json=JSON.parse(bytes.toString('utf8',20,20+jsonLength).trim());
const required=['idle','walk','run','point','radio','binoculars','driver-sit','brace'];
const names=new Set((json.animations||[]).map(clip=>clip.name));
for(const name of required)if(!names.has(name))throw new Error(`missing animation ${name}`);
if(!(json.skins||[]).length)throw new Error('character GLB needs a skin');
if(!(json.meshes||[]).length)throw new Error('character GLB needs a mesh');
for(const buffer of json.buffers||[])if(buffer.uri)throw new Error('GLB must embed buffers');
for(const image of json.images||[])if(image.uri)throw new Error('GLB must embed textures');
console.log('PASS: licensed male character GLB contract');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/character-asset-contract-check.mjs`

Expected: `ENOENT` for `assets/models/characters/vardan-men.glb`.

- [ ] **Step 3: Acquire only approved source assets**

Before network or GUI actions, request approval to download/install external tools. Use MakeHuman Community 1.3.0 from its official release and Blender 4.2 LTS portable from blender.org. Do not add either program to Git. Add these exact ignores:

```gitignore
tools/raw-character/
tools/blender-portable/
```

In MakeHuman select an adult male, neutral T-pose, average proportions, the bundled Game Engine topology, bundled male skin, long-sleeve shirt, trousers and shoes. Use only bundled/core assets whose metadata says CC0. Export `tools/raw-character/vardan-male-unrigged.fbx` in metres, feet on ground, without a skeleton.

Upload the FBX to Mixamo with the five auto-rig markers at chin, wrists, elbows, knees and groin. Download one FBX with skin in T-pose and these Mixamo clips without skin at 30 FPS: `Idle`, `Walking`, `Running`, `Pointing`, `Talking`, `Sitting Idle`, and `Standing React Small From Right`. Save them under `tools/raw-character/mixamo/` using lowercase filenames.

- [ ] **Step 4: Create the deterministic Blender builder**

Create `tools/characters/build-vardan-men.py` with these named responsibilities:

```python
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'tools' / 'raw-character' / 'mixamo'
OUT = ROOT / 'assets' / 'models' / 'characters' / 'vardan-men.glb'
CLIPS = {
    'idle.fbx': 'idle', 'walking.fbx': 'walk', 'running.fbx': 'run',
    'pointing.fbx': 'point', 'talking.fbx': 'radio',
    'sitting-idle.fbx': 'driver-sit',
    'standing-react-small-from-right.fbx': 'brace'
}

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def import_fbx(path):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path),automatic_bone_orientation=False)
    return list(set(bpy.data.objects)-before)

def rename_action(objects, name):
    armature=next(obj for obj in objects if obj.type=='ARMATURE')
    action=armature.animation_data.action
    action.name=name
    action.use_fake_user=True
    return armature,action

def create_binoculars_action(armature, idle_action):
    action=idle_action.copy();action.name='binoculars';action.use_fake_user=True
    armature.animation_data.action=action
    pose={
        'mixamorigLeftArm': (0.15,0.2,-0.85),
        'mixamorigLeftForeArm': (0.0,-1.35,-0.15),
        'mixamorigRightArm': (-0.15,-0.2,0.85),
        'mixamorigRightForeArm': (0.0,1.35,0.15)
    }
    for bone_name,rotation in pose.items():
        bone=armature.pose.bones[bone_name]
        bone.rotation_mode='XYZ';bone.rotation_euler=rotation
        bone.keyframe_insert('rotation_euler',frame=1)
        bone.keyframe_insert('rotation_euler',frame=30)

def export_glb():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),export_format='GLB',export_animations=True,
        export_skins=True,export_morph=True,export_yup=True,
        export_image_format='WEBP',export_texture_dir=''
    )

def main():
    clear_scene()
    hero_objects=import_fbx(RAW / 't-pose-with-skin.fbx')
    hero_armature=next(obj for obj in hero_objects if obj.type=='ARMATURE')
    imported_actions={}
    for filename,clip_name in CLIPS.items():
        clip_objects=import_fbx(RAW / filename)
        clip_armature,action=rename_action(clip_objects,clip_name)
        imported_actions[clip_name]=action
        for obj in clip_objects:
            if obj is not hero_armature:
                bpy.data.objects.remove(obj,do_unlink=True)
    hero_armature.animation_data_create()
    hero_armature.animation_data.action=imported_actions['idle']
    create_binoculars_action(hero_armature,imported_actions['idle'])
    bpy.context.view_layer.objects.active=hero_armature
    hero_armature.select_set(True)
    export_glb()

if __name__=='__main__':
    main()
```

The script imports the skinned T-pose first, imports each animation FBX, retains only the animation actions, creates `binoculars` from the idle action using the exact pose above, removes imported duplicate meshes/armatures, limits every texture to 2048×2048, and exports one GLB. Run it with Blender's background executable:

```powershell
blender.exe --background --python tools/characters/build-vardan-men.py
```

- [ ] **Step 5: Record provenance and verify GREEN**

Create the credits table with exact rows for MakeHuman 1.3.0 core assets (CC0) and each Mixamo clip (Adobe Mixamo FAQ permission), including download date and the modifications `retargeted, renamed, compressed, exported to GLB`. Run:

```powershell
node tests/character-asset-contract-check.mjs
git diff --check
```

Expected: contract prints `PASS`; diff check is empty.

- [ ] **Step 6: Commit**

```powershell
git add .gitignore assets/models/characters/vardan-men.glb tools/characters/build-vardan-men.py docs/credits/assets.md tests/character-asset-contract-check.mjs
git commit -m "feat: add licensed male character asset pipeline"
```

### Task 2: Add offline GLB loading and skinned cloning

**Files:**
- Create: `vendor/three/examples/jsm/loaders/GLTFLoader.js`
- Create: `vendor/three/examples/jsm/utils/SkeletonUtils.js`
- Create: `src/assets/model-loader.js`
- Modify: `src/core/runtime.js`
- Modify: `src/boot.js`
- Create: `tests/model-loader-check.mjs`

**Interfaces:**
- Produces `ModelLoader.configure(deps)`, `preload(url)`, `whenReady(url)`, `instantiate(url)`, `getClips(url)`, `dispose()`.
- `instantiate(url)` returns a skinned clone synchronously only after `preload(url)` resolves.

- [ ] **Step 1: Write the failing cache/clone test**

Create `tests/model-loader-check.mjs` using the real module and a loader fake that returns `{scene,animations}`. Assert two preloads call the loader once, two instances are distinct clones, and `dispose()` clears the cache so the next preload calls the loader again.

```js
loader.preload('man.glb');loader.preload('man.glb');
await loader.whenReady('man.glb');
if(loadCalls!==1)throw new Error('preload must deduplicate requests');
const a=loader.instantiate('man.glb'),b=loader.instantiate('man.glb');
if(a===b||a.scene===b.scene)throw new Error('instances must own distinct skinned clones');
loader.dispose();loader.preload('man.glb');await loader.whenReady('man.glb');
if(loadCalls!==2)throw new Error('dispose must clear cached templates');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/model-loader-check.mjs`

Expected: module file does not exist.

- [ ] **Step 3: Vendor matching Three.js r160 helpers**

Download exactly the r160 `GLTFLoader.js` and `SkeletonUtils.js` from the official Three.js package into the paths above. Verify both import from `three` and do not reference a different revision. Extend runtime globals:

```js
let THREE=null,mergeGeometries=null,RoomEnvironment=null,
    GLTFLoader=null,cloneSkinned=null,
    EffectComposer=null,RenderPass=null,UnrealBloomPass=null;
```

Import them in `window.startGame` before any model preload:

```js
GLTFLoader=(await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader;
cloneSkinned=(await import('three/addons/utils/SkeletonUtils.js')).clone;
```

- [ ] **Step 4: Implement the minimal loader**

Implement `src/assets/model-loader.js` as an IIFE with a `Map` of `{promise,gltf}` records. `preload` creates one loader promise, `whenReady` awaits it, `instantiate` throws `Model not preloaded: <url>` until ready and returns `{scene:cloneSkinned(gltf.scene),animations:gltf.animations}`, and `dispose` traverses cached templates to dispose unique geometries, materials and textures before clearing the map.

Add `src/assets/model-loader.js` to `GAME_SCRIPTS` immediately after `src/core/runtime.js`.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
node tests/model-loader-check.mjs
node tests/character-asset-contract-check.mjs
git diff --check
```

Expected: both tests print `PASS`.

```powershell
git add vendor/three/examples/jsm/loaders/GLTFLoader.js vendor/three/examples/jsm/utils/SkeletonUtils.js src/assets/model-loader.js src/core/runtime.js src/boot.js tests/model-loader-check.mjs
git commit -m "feat: add cached offline skinned model loader"
```

### Task 3: Build actor animation state and lifecycle

**Files:**
- Create: `src/entities/human-actors.js`
- Modify: `src/boot.js`
- Modify: `src/main.js`
- Create: `tests/human-actors-check.mjs`

**Interfaces:**
- Produces `HumanActors.preload()`, `create(options)`, `update(dt)`, `remove(handle)`, `dispose()`.
- `create({role,position,yaw,state,variant,parent})` returns `{root,mixer,role,state,setState(next,fadeSeconds)}`.

- [ ] **Step 1: Write the failing animation behavior test**

Test the real module with fake clips/actions. Create two actors, set one from `idle` to `radio` with `0.25`, update by `0.1`, remove one and dispose all. Assert the old action fades out, new action resets/fades in/plays, mixers receive update only while active, and roots are removed exactly once.

```js
const actor=HumanActors.create({role:'signals',state:'idle',parent});
actor.setState('radio',.25);
if(actions.idle.fadeOutArg!==.25||actions.radio.fadeInArg!==.25||!actions.radio.played)
  throw new Error('actor state must cross-fade');
HumanActors.update(.1);
if(actor.mixer.updated!==.1)throw new Error('active mixer must update');
HumanActors.remove(actor);HumanActors.remove(actor);
if(parent.removeCount!==1)throw new Error('actor removal must be idempotent');
```

- [ ] **Step 2: Run RED**

Run: `node tests/human-actors-check.mjs`

Expected: module file does not exist.

- [ ] **Step 3: Implement actor creation and variants**

`preload()` awaits `ModelLoader.preload('assets/models/characters/vardan-men.glb')`. `create()` clones the cached scene, selects a named clip via `THREE.AnimationClip.findByName`, creates one mixer, applies position/yaw, and assigns role metadata. Visual variants use deterministic material tint records:

```js
const VARIANTS={
  commander:{uniform:0x59633f,skin:0xb78968},
  signals:{uniform:0x4c5740,skin:0xa97858},
  driver:{uniform:0x665642,skin:0xc08d69},
  crew:{uniform:0x515744,skin:0x9f704f},
  worker:{uniform:0x50504a,skin:0xb27c5b},
  observer:{uniform:0x3f4538,skin:0x9a694c}
};
```

Clone materials before tinting so variants do not mutate the cached template. `setState` rejects unknown states without changing the current action. `dispose` stops mixers, uncaches roots and removes all actor roots once.

Load the script after `model-loader.js`. Call `HumanActors.update(wdt)` in active play and dying states, and `HumanActors.dispose()` from `clearWorld()`.

- [ ] **Step 4: Verify GREEN and commit**

Run:

```powershell
node tests/human-actors-check.mjs
node tests/model-loader-check.mjs
node tests/scene-lifecycle-check.mjs
git diff --check
```

```powershell
git add src/entities/human-actors.js src/boot.js src/main.js tests/human-actors-check.mjs
git commit -m "feat: add animated male actor lifecycle"
```

### Task 4: Convert the narrative and replace primitive M01 figures

**Files:**
- Modify: `docs/story/character-bible.md`
- Modify: `docs/superpowers/specs/2026-08-05-m01-cinematic-operation-design.md`
- Modify: `docs/superpowers/specs/2026-08-05-campaign-40-missions-design.md`
- Modify: `src/scenes/scene-01.js`
- Modify: `src/scenes/scene-builder.js`
- Modify: `src/missions/operation-controller.js`
- Create: `tests/male-narrative-contract-check.mjs`
- Create: `tests/m01-realistic-actors-check.mjs`

**Interfaces:**
- M01 creates roles `driver`, `convoy-crew-a`, `convoy-crew-b`, `depot-worker-a`, `depot-worker-b`, and `observer` through `HumanActors.create`.
- Scene handle owns `actors: []`; disposal calls `HumanActors.remove` for every handle.

- [ ] **Step 1: Write failing narrative and actor tests**

The narrative test reads runtime and story files, rejects the obsolete identities `نازی رستمی`, `سارا امانی`, `مریم`, `آذر` and `سارا تالی`, and requires `نادر رستمی`, `سروش امانی`, `مهران`, `آراد` and `شاهین تالی`.

The actor test builds M01 with injected `HumanActors.create` and asserts six calls, male variant roles, `observer` begins in `binoculars`, `driver` begins in `driver-sit`, and no primitive actor builder runs.

- [ ] **Step 2: Run RED**

Run:

```powershell
node tests/male-narrative-contract-check.mjs
node tests/m01-realistic-actors-check.mjs
```

Expected: obsolete names and `buildStoryCharacter` cause failures.

- [ ] **Step 3: Apply the identity migration**

Replace all five names and update role descriptions, objectives and dialogue while preserving their tactical functions. M01 opening lines become:

```js
api.showObjective('آتش در سرو','سروش: دیده‌بان دشمن هنوز ما را ندیده؛ کاروان را آماده کن.');
api.showMessage('رامین: مهران مسیر خروج از حیاط سوخت را باز نگه داشته.');
```

Change the yard objective to `مهران و کاروان را از حیاط سوخت خارج کن`.

- [ ] **Step 4: Replace primitive figures with actor handles**

Delete `buildStoryCharacter` from `scene-builder.js`. Add actor records to `scene-01.js`:

```js
actors:[
  {role:'driver',variant:'driver',state:'driver-sit',position:[-69,1.25,90],yaw:.2},
  {role:'convoy-crew-a',variant:'crew',state:'idle',position:[-60,0,90],yaw:-.4},
  {role:'convoy-crew-b',variant:'crew',state:'point',position:[-81,0,94],yaw:.8},
  {role:'depot-worker-a',variant:'worker',state:'brace',position:[-90,0,72],yaw:1.2},
  {role:'depot-worker-b',variant:'worker',state:'radio',position:[-45,0,85],yaw:-1},
  {role:'observer',variant:'observer',state:'binoculars',position:[126,8.35,-60],yaw:Math.PI}
]
```

SceneBuilder maps these records through `HumanActors.create`, stores returned handles in `handle.actors`, and removes them during scene disposal. Friendly ground actors keep their existing circle colliders; the tower observer has no ground collider.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
node tests/male-narrative-contract-check.mjs
node tests/m01-realistic-actors-check.mjs
node tests/opening-operation-data-check.mjs
node tests/opening-operation-controller-check.mjs
node tests/scene-lifecycle-check.mjs
git diff --check
```

```powershell
git add docs/story/character-bible.md docs/superpowers/specs/2026-08-05-m01-cinematic-operation-design.md docs/superpowers/specs/2026-08-05-campaign-40-missions-design.md src/scenes/scene-01.js src/scenes/scene-builder.js src/missions/operation-controller.js tests/male-narrative-contract-check.mjs tests/m01-realistic-actors-check.mjs
git commit -m "feat: replace opening cast with realistic animated men"
```

### Task 5: Startup integration and playable checkpoint verification

**Files:**
- Modify: `src/core/runtime.js`
- Modify: `src/boot.js`
- Modify: `src/main.js`
- Modify: `src/ui/screens.js`
- Create: `tests/character-runtime-integration-check.mjs`

**Interfaces:**
- `window.startGame` awaits `HumanActors.preload()` before enabling profile navigation.
- `clearWorld()` disposes scene actors before clearing other scene-owned state.

- [ ] **Step 1: Write the failing integration test**

Read and execute the boot/runtime boundary with fakes. Assert dependency order `GLTFLoader → ModelLoader script → HumanActors script → preload → SceneBuilder`, preload failure calls `window.__showError`, and two start/retry cycles leave exactly six active actor handles.

- [ ] **Step 2: Run RED**

Run: `node tests/character-runtime-integration-check.mjs`

Expected: startup does not preload human assets and dependency scripts are absent.

- [ ] **Step 3: Wire preload and failure behavior**

Add a loading step after Three.js imports:

```js
step('بارگذاری شخصیت‌های سه‌بعدی…',48);await HumanActors.preload();await frame();
```

If preload rejects, throw `مدل شخصیت‌ها بارگذاری نشد: <original message>` so the existing startup handler displays a recoverable error. Do not silently use primitive humans in the production path.

- [ ] **Step 4: Run full automated and manual verification**

Run every `tests/*.mjs` file and `git diff --check`. Start the local server and verify profile → map → M01, six visible animated male actors, observer binocular pose, driver seated in the lead truck, pause freezing mixers, retry without duplicates, and return to map without console errors.

- [ ] **Step 5: Commit**

```powershell
git add src/core/runtime.js src/boot.js src/main.js src/ui/screens.js tests/character-runtime-integration-check.mjs
git commit -m "feat: integrate realistic male cast into opening operation"
```

## Completion gate

Do not start the railway/convoy plan until this checkpoint is playable and reviewed. Completion requires the real GLB, all eight named clips, six visible male actors, repository-wide narrative consistency, green tests and no duplicated mixers after retry.
