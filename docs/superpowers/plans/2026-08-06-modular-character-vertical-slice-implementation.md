# Modular Character Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run the first production-quality modular male character slice: the complete 22-role roster manifest, one realistic commander body/head, one shared 16-clip motion library, cached offline loading, actor lifecycle, and a 20-actor verification lab.

**Architecture:** Keep authored source FBX files outside Git, build deterministic GLBs with Blender 4.2 LTS, and ship character geometry separately from the shared motion library. A validated JSON manifest defines all named, soldier and general roles; browser-side IIFE modules cache templates, clone skinned scenes and bind clips by stable bone names. This plan proves the architecture with the player commander before the remaining heads, garments and facial rigs are produced by follow-up plans.

**Tech Stack:** MakeHuman Community 1.3.0 core CC0 assets, Adobe Mixamo FBX sources, Blender 4.2.16 LTS Python API, glTF 2.0/GLB, Three.js r160, browser IIFE modules, Node `.mjs` contract tests, Python unit tests.

## Global Constraints

- Every visible human is male; no real political, extremist or historical-military symbols.
- Final roster is exactly 11 named characters, 6 soldier types and 5 general types, backed by exactly 3 body classes: `lean`, `medium`, `heavy`.
- Shared motion library has exactly 16 public clip names: `idle`, `walk`, `run`, `crouch-walk`, `talk`, `point`, `radio`, `binoculars`, `brace`, `driver-sit`, `hatch-idle`, `repair`, `rifle-aim`, `rifle-reload`, `hit-react`, `fall`.
- Seven cinematic characters use full face animation in the completed roster; facial blendshapes are outside this vertical-slice plan and must not be faked with low-quality procedural deformation.
- Character pack target remains 35–45 MB after the complete roster; this slice records budgets but does not claim the final pack is complete.
- LOD budgets are at most 35,000 triangles for cinematic LOD0, 18,000 for nearby LOD1 and 2,000–6,000 for distant LOD2.
- Main close-up textures are at most 2K; other face, clothing and equipment textures are at most 1K.
- No production fallback to the old primitive human builder.
- Missing named-character assets are fatal and recoverable at loading; missing secondary variants may fall back only to a valid same-faction role.
- Raw MakeHuman, Mixamo and Blender authoring inputs remain under ignored `tools/raw-character/`; only optimized outputs, recipes, builders, tests and provenance are committed.
- Use TDD for every production module: write the test, observe the intended RED failure, implement minimal behavior, then verify GREEN.
- Preserve all pre-existing dirty worktree changes and never stage unrelated files.

## File Structure

| File | Responsibility |
|---|---|
| `assets/models/characters/manifests/character-roster.json` | Complete 22-role declarative roster and exact shared clip list. |
| `src/assets/character-roster.js` | Parse, validate, index and resolve the roster; no Three.js dependency. |
| `tools/characters/recipes/commander-medium.json` | Reproducible MakeHuman/Mixamo source recipe and license identifiers. |
| `tools/characters/build-character-slice.py` | Deterministic Blender import, retarget, normalization, NLA and GLB export. |
| `tools/characters/character_build_math.py` | Pure builder math reused by Blender and Python tests. |
| `assets/models/characters/core/commander-medium.glb` | Skinned commander geometry and materials without duplicated motion clips. |
| `assets/models/characters/animation/character-motion.glb` | One compatible skeleton plus exactly 16 shared animation clips. |
| `vendor/three/examples/jsm/loaders/GLTFLoader.js` | Official Three.js r160 offline GLB loader. |
| `vendor/three/examples/jsm/utils/SkeletonUtils.js` | Official Three.js r160 skinned clone helper. |
| `src/assets/model-loader.js` | Deduplicated preload, skinned clone and deterministic disposal. |
| `src/entities/character-actors.js` | Manifest-driven actor creation, clip binding, update, LOD and lifecycle. |
| `src/scenes/character-lab.js` | Production-independent 20-actor verification scene used by tests and debug shortcut. |
| `docs/credits/assets.md` | Exact source, permission, acquisition date, modifications and SHA-256 ledger. |

---

### Task 1: Complete roster manifest and validation boundary

**Files:**
- Create: `assets/models/characters/manifests/character-roster.json`
- Create: `src/assets/character-roster.js`
- Modify: `src/boot.js`
- Create: `tests/character-roster-contract-check.mjs`
- Create: `tests/character-roster-module-check.mjs`

**Interfaces:**
- Consumes: no runtime dependencies.
- Produces: `CharacterRoster.configure({fetchJson})`, `load(url)`, `validate(data)`, `get(id)`, `list(kind)`, `motionClips()` and `reset()`.
- `get(id)` returns one immutable entry after `load()` or throws `Unknown character role: <id>`.

- [ ] **Step 1: Write the failing manifest contract test**

Create a Node test that reads the real JSON and asserts these exact IDs:

```js
const expected={
  named:['player-commander','ramin','saman','nikan','arad','major-mehraz','shahin-tali','general-varen','soroush-amani','mehran','nader-rostami'],
  soldier:['vardan-rifleman','vardan-tanker','vardan-engineer','ash-rifleman','ash-elite','ash-crew'],
  general:['convoy-driver','mechanic','rail-worker','resistance','medic']
};
const clips=['idle','walk','run','crouch-walk','talk','point','radio','binoculars','brace','driver-sit','hatch-idle','repair','rifle-aim','rifle-reload','hit-react','fall'];
```

Assert exact set equality per kind, exact clip order, bodies `lean|medium|heavy`, valid faction `vardan|ash|civilian`, `faceTier` in `full|simple`, local relative asset URLs only, unique IDs, and fallback roles that exist, share kind/faction, and never target themselves. Assert the seven `full` roles are exactly `player-commander`, `ramin`, `saman`, `nikan`, `arad`, `shahin-tali`, `general-varen`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/character-roster-contract-check.mjs`

Expected: fail with `ENOENT` for `character-roster.json`.

- [ ] **Step 3: Create the complete manifest**

Use schema version `1`, the clip list above, and entries with this shape:

```json
{
  "id": "player-commander",
  "kind": "named",
  "faction": "vardan",
  "body": "medium",
  "faceTier": "full",
  "geometry": "assets/models/characters/core/commander-medium.glb",
  "motion": "assets/models/characters/animation/character-motion.glb",
  "defaultState": "idle",
  "fallback": null,
  "gear": ["commander-coat", "commander-cap"]
}
```

All named entries use their approved body class from the design spec. Until their follow-up assets ship, named entries other than `player-commander` point to their future stable paths and have `fallback:null`; tests must not require those future files to exist in this plan. Secondary entries use a same-faction fallback: Vardan roles fall back to `vardan-rifleman`, Ash roles to `ash-rifleman`, and civilian roles to `convoy-driver`. The fallback root entries have `fallback:null`.

- [ ] **Step 4: Write the module behavior test and observe RED**

Load `src/assets/character-roster.js` in a VM/global context with a fake `fetchJson`. Assert concurrent `load()` calls fetch once, `get()` and `list()` return frozen values, invalid data rejects without replacing the last valid index, unknown IDs throw, and `reset()` permits a fresh fetch.

Expected RED: file is absent or `CharacterRoster` is undefined.

- [ ] **Step 5: Implement the minimal roster module**

Implement as an IIFE attached to `globalThis`. Store one `{promise,data,index}` record. Deep-clone incoming JSON before validation, freeze entries and arrays, and never expose mutable manifest objects. `load(url='assets/models/characters/manifests/character-roster.json')` deduplicates in-flight and resolved loads. Add `src/assets/character-roster.js` immediately after `src/core/runtime.js` in `GAME_SCRIPTS`.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```powershell
node tests/character-roster-contract-check.mjs
node tests/character-roster-module-check.mjs
git diff --check
```

Commit only the four scoped production/test files:

```powershell
git add assets/models/characters/manifests/character-roster.json src/assets/character-roster.js src/boot.js tests/character-roster-contract-check.mjs tests/character-roster-module-check.mjs
git commit -m "feat: define modular character roster"
```

### Task 2: Acquire the licensed commander and shared motion sources

**Files:**
- Create: `tools/characters/recipes/commander-medium.json`
- Modify: `.gitignore`
- Modify: `docs/credits/assets.md`
- Create: `tests/character-source-inventory-check.py`
- Raw ignored inputs: `tools/raw-character/makehuman/commander-medium-unrigged.fbx`
- Raw ignored inputs: `tools/raw-character/mixamo/t-pose-with-skin.fbx`
- Raw ignored inputs: thirteen animation FBXs listed below.

**Interfaces:**
- Consumes: MakeHuman 1.3.0, authenticated Mixamo session, Blender-compatible FBX.
- Produces: exact raw inventory and a tracked recipe consumed by Task 3.

- [ ] **Step 1: Write and run the failing source inventory test**

The Python test reads the recipe, rejects absolute paths and missing license fields, then requires these exact raw files:

```python
FILES = [
  'makehuman/commander-medium-unrigged.fbx',
  'mixamo/t-pose-with-skin.fbx',
  'mixamo/idle.fbx', 'mixamo/walking.fbx', 'mixamo/running.fbx',
  'mixamo/crouch-walking.fbx', 'mixamo/talking.fbx', 'mixamo/pointing.fbx',
  'mixamo/standing-react-small-from-right.fbx', 'mixamo/sitting-idle.fbx',
  'mixamo/repairing.fbx', 'mixamo/rifle-aiming-idle.fbx',
  'mixamo/reloading.fbx', 'mixamo/hit-reaction.fbx', 'mixamo/falling-back-death.fbx'
]
```

Run: `python tests/character-source-inventory-check.py`

Expected RED: missing recipe or the first missing FBX.

- [ ] **Step 2: Create the tracked source recipe**

The JSON recipe records: MakeHuman version `1.3.0`, adult male, medium/average proportions, metres, feet on ground, unrigged export, Game Engine topology, bundled male skin, bundled long-sleeve shirt, trousers and shoes, and the exact metadata identifier/license for each selected core asset. It records Mixamo settings `FBX Binary`, `30 FPS`, `With Skin` only for T-pose, `Without Skin` for clips, and `In Place:true` for walking/running/crouch-walking.

- [ ] **Step 3: Export the commander from MakeHuman**

Open MakeHuman, select only bundled/core assets whose metadata explicitly says CC0, match the recipe, save the `.mhm` beside the raw FBX outside Git, and export exactly `tools/raw-character/makehuman/commander-medium-unrigged.fbx`. Verify adult male appearance, clothing coverage, neutral T-pose, feet on ground and metres.

- [ ] **Step 4: Auto-rig once in Mixamo**

Upload `commander-medium-unrigged.fbx`. Place chin, wrist, elbow, knee and groin markers. Download the T-pose as `t-pose-with-skin.fbx`, FBX Binary, 30 FPS, with skin.

- [ ] **Step 5: Download thirteen source clips**

Download exact library selections matching the filenames in Step 1. Use FBX Binary, 30 FPS, without skin. Enable In Place only for walk, run and crouch-walk. Record the displayed Mixamo title/identifier and acquisition date in the recipe and credits. The builder derives `radio` from `talk`, `binoculars` from `idle`, and `hatch-idle` from `idle`, so no extra downloads are allowed.

- [ ] **Step 6: Verify inventory and provenance, then commit tracked files**

Run:

```powershell
python tests/character-source-inventory-check.py
git check-ignore tools/raw-character/mixamo/idle.fbx
git diff --check
```

Expected: inventory PASS; raw file is ignored. Update every involved credits row from pending to its actual acquisition date and source title. Commit only recipe, test, credits and ignore rules; never commit raw FBXs.

### Task 3: Build the commander geometry and 16-clip motion GLBs

**Files:**
- Rename/modify: `tools/characters/build-vardan-men.py` → `tools/characters/build-character-slice.py`
- Modify: `tools/characters/character_build_math.py`
- Modify: `tests/character-builder-math-check.py`
- Replace/modify: `tests/character-asset-contract-check.mjs`
- Create: `assets/models/characters/core/commander-medium.glb`
- Create: `assets/models/characters/animation/character-motion.glb`
- Modify: `docs/credits/assets.md`

**Interfaces:**
- Consumes: Task 2 recipe and exact raw inventory.
- Produces: one geometry GLB with mesh+skin and one motion GLB with exactly 16 compatible clips.

- [ ] **Step 1: Extend tests and observe RED**

The Python math test adds pairwise travel, metre conversion, deterministic LOD ratio validation and action-frame validation. The JS asset contract parses both GLBs and requires valid GLB 2.0 chunks, embedded buffers/images, reachable mesh+skin binding, valid `JOINTS_0`/`WEIGHTS_0`, valid joint-node indices, 1.65–1.95 m grounded bounds, and no animation in `commander-medium.glb`. It requires exact 16 non-empty clips in `character-motion.glb`, positive duration, no extras and identical normalized joint-name sets across both files.

Expected RED: new output files do not exist.

- [ ] **Step 2: Refactor the approved builder without losing its safeguards**

Retain normalized Mixamo bone resolution, FCurve retarget validation, dependency-graph world-space root-motion sampling, 30 FPS checks, NLA stashing, texture limiting, scene bounds, post-export validation and state restoration from the existing approved builder.

Change `CLIPS` to thirteen downloaded sources and three derived clips. Implement:

```python
PUBLIC_CLIPS = (
 'idle','walk','run','crouch-walk','talk','point','radio','binoculars',
 'brace','driver-sit','hatch-idle','repair','rifle-aim','rifle-reload',
 'hit-react','fall'
)
```

`radio` copies `talk` and adds a right-hand-to-ear pose; `binoculars` copies `idle` and raises both hands; `hatch-idle` copies `idle`, masks leg translation/rotation tracks and keeps upper-body breathing. Derived actions must be separate Blender actions with exact names and NLA tracks.

- [ ] **Step 3: Split deterministic exports**

Export selected skinned mesh/material/armature without animation to `commander-medium.glb`. Export a duplicate compatible armature with all 16 NLA actions and no renderable mesh to `character-motion.glb`. Both outputs use embedded resources, Y-up glTF, at most 2048 textures, and stable bone names. Write SHA-256 values into credits.

- [ ] **Step 4: Run Blender and verify GREEN**

Run:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --factory-startup --python tools/characters/build-character-slice.py
node tests/character-asset-contract-check.mjs
python tests/character-builder-math-check.py
git diff --check
```

Expected: builder prints both output paths and both SHA-256 values; tests print PASS.

- [ ] **Step 5: Visual gate and commit**

Open the commander GLB in Blender and confirm male appearance, +Z facing, feet at ground, no garment intersection and correct deformation for idle/walk/brace/driver-sit/rifle-aim. Record `Visual gate: PASS` and date in credits. Commit builder, tests, outputs and updated credits only.

### Task 4: Add cached offline GLB loading and clip compatibility

**Files:**
- Create: `vendor/three/examples/jsm/loaders/GLTFLoader.js`
- Create: `vendor/three/examples/jsm/utils/SkeletonUtils.js`
- Create: `src/assets/model-loader.js`
- Modify: `src/core/runtime.js`
- Modify: `src/boot.js`
- Create: `tests/model-loader-check.mjs`

**Interfaces:**
- Consumes: Three.js r160 import map and Task 3 GLBs.
- Produces: `ModelLoader.configure(deps)`, `preload(url)`, `whenReady(url)`, `instantiate(url)`, `getClips(url)`, `assertCompatible(geometryUrl,motionUrl)`, `dispose()`.

- [ ] **Step 1: Write the failing cache/clone/compatibility test**

With fake loader and clone dependencies, assert concurrent preload calls load once; instances own distinct skinned clones; clips are shared immutable metadata; incompatible normalized bone sets throw `Character skeleton mismatch`; disposal releases each unique geometry, material and texture once; a later preload loads again.

- [ ] **Step 2: Verify RED**

Run: `node tests/model-loader-check.mjs`

Expected: module missing.

- [ ] **Step 3: Vendor exact official r160 helpers**

Add official unmodified Three.js r160 `GLTFLoader.js` and `SkeletonUtils.js`. Verify import specifiers resolve through the existing import map and no other Three revision is included.

- [ ] **Step 4: Implement the minimal loader**

Use a `Map` of `{promise,gltf,bones}` records. `instantiate` is synchronous only after a resolved preload and returns `{scene:cloneSkinned(gltf.scene),animations:gltf.animations}`. `assertCompatible` compares sorted normalized bone node names captured from both GLTF scenes. Disposal traverses cached templates and de-duplicates disposable resources by object identity.

Import `GLTFLoader` and `clone` in `window.startGame` before character preload, configure `ModelLoader`, and load the module immediately after `character-roster.js`.

- [ ] **Step 5: Verify GREEN and commit**

Run model-loader, roster and asset contracts plus `git diff --check`; commit only Task 4 files.

### Task 5: Build manifest-driven character actor lifecycle

**Files:**
- Create: `src/entities/character-actors.js`
- Modify: `src/boot.js`
- Modify: `src/main.js`
- Create: `tests/character-actors-check.mjs`

**Interfaces:**
- Consumes: `CharacterRoster`, `ModelLoader`, `THREE.AnimationMixer`.
- Produces: `CharacterActors.preload(ids)`, `create({id,parent,position,yaw,state})`, `update(dt,cameraPosition)`, `remove(handle)`, `dispose()`.
- Handle: `{id,root,mixer,state,setState(next,fadeSeconds),removed}`.

- [ ] **Step 1: Write the failing lifecycle test**

Use real module with fake roster, loader, mixer/actions and parent. Assert preload de-duplicates shared URLs; create binds Task 3 motion clips to the cloned commander; state change cross-fades; unknown state leaves current action unchanged; update ticks active mixers; distance tiers disable face metadata and reduce update cadence; remove is idempotent; dispose clears every handle exactly once.

- [ ] **Step 2: Verify RED**

Run: `node tests/character-actors-check.mjs`

Expected: module missing.

- [ ] **Step 3: Implement actor creation and updates**

Resolve the manifest entry, require named geometry without fallback, preload geometry+motion, call `assertCompatible`, clone geometry, create one mixer on the cloned root and create actions from shared motion clips. Use cross-fade defaults of `0.2` seconds. Store distance tier thresholds `near<25`, `mid<70`, `far>=70` metres; update near every frame, mid every second frame and far every fourth frame. This plan exposes face-enabled metadata but does not create facial morphs.

- [ ] **Step 4: Integrate lifecycle**

Load module after `model-loader.js`. Call `CharacterActors.update(wdt,camera.position)` during active play and pause it when game time is paused. Call `CharacterActors.dispose()` from the existing world-clear/retry boundary before scene resources are removed.

- [ ] **Step 5: Verify GREEN and commit**

Run actor, loader, roster, scene-lifecycle and asset tests; commit only Task 5 files.

### Task 6: Add a 20-actor verification lab and startup checkpoint

**Files:**
- Create: `src/scenes/character-lab.js`
- Modify: `src/boot.js`
- Modify: `src/core/runtime.js`
- Modify: `src/ui/screens.js`
- Create: `tests/character-lab-check.mjs`
- Create: `tests/character-runtime-integration-check.mjs`

**Interfaces:**
- Consumes: Task 5 `CharacterActors` and player commander manifest entry.
- Produces: debug-only `CharacterLab.open()`, `close()`, `isOpen()`, `stats()` and shortcut `Ctrl+Shift+Alt+H`.

- [ ] **Step 1: Write failing lab and integration tests**

Assert lab creates exactly 20 commander instances in a 5×4 grid with deterministic states cycling `idle`, `walk`, `brace`, `driver-sit`, `rifle-aim`; closing twice removes each once. Integration asserts startup order `Three imports → CharacterRoster.load → CharacterActors.preload(['player-commander']) → profile UI`, preload failure reaches `window.__showError` with `بارگذاری شخصیت فرمانده ناموفق بود`, and two open/close cycles leave zero handles.

- [ ] **Step 2: Verify RED**

Run both tests; expect missing lab and missing preload behavior.

- [ ] **Step 3: Implement the lab and startup preload**

Lab owns a dedicated `THREE.Group`, never modifies campaign state, and is accessible only through the debug shortcut. Startup loads/validates the manifest, preloads the commander and motion library, then continues to profile selection. A named-asset failure remains visible and recoverable; no primitive fallback is permitted.

- [ ] **Step 4: Automated verification**

Run every character-focused test, every existing `tests/*.mjs`, Python builder tests and `git diff --check`. Record raw results in the implementer report.

- [ ] **Step 5: Manual verification**

Start the local server, open the lab, confirm 20 visible realistic male commanders, stable scale/grounding, five motions, pause behavior, no console errors, two open/close cycles without duplicates, and acceptable interaction on Intel HD 5500. Use renderer stats and `CharacterLab.stats()` to record actor/mixer counts before and after close.

- [ ] **Step 6: Commit**

Commit only lab/startup/test files. Do not include unrelated scene, rail, collision or texture changes.

## Completion Gate

This plan is complete only when the real licensed commander and motion GLBs exist, all 16 clips pass the contract, the commander preloads before profile navigation, the 20-actor lab opens and closes without leaks, all tests are green, visual review passes, provenance is complete, and the per-task plus whole-plan reviewers report no unresolved Critical or Important findings.

After this gate, write separate implementation plans for: cinematic faces and four tank crew; Shahin/Varen reveal; four secondary named characters; soldier kits; general kits; and final M01 replacement/performance polish.
