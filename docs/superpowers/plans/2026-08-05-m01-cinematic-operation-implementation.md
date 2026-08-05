# عملیات اول سینمایی و حذف منوی قدیمی Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy main menu with profile-to-map flow and deliver the first full cinematic operation, M01 «آتش در سرو», as a stable three-act convoy mission.

**Architecture:** The profile screen becomes the entry point and the campaign map becomes the only non-combat hub. Mission-one data selects an operation controller rather than the generic spawn director. A scene-library record, scene builder, convoy entity, cinematic controller, and opening-operation state machine have separate lifecycle ownership so retries and exits dispose all operation state without changing the legacy systems used by M02–M40.

**Tech Stack:** HTML, CSS, browser-global JavaScript, Three.js r160 loaded through the existing import map, Node VM checks, PowerShell static checks.

## Global Constraints

- Do not remove gameplay mechanics, weapons, save data, cheats, audio tracks, M02–M40 mission support, or existing enemy tank support.
- Delete only the old `#menu` screen and controls whose sole purpose is entering it: `btnMissions`, `btnProfileBack`, `btnProfiles`.
- The only hub flow is `profileSelect → missions`; all non-combat returns navigate to `missions`.
- M01 has exactly three acts, finite authored enemy encounters, three convoy trucks, per-act checkpoints, and skippable cinematics.
- M01 contains no hostile on-foot combatants; humans are cinematic or environmental actors only.
- No external model is added without a recorded license. Accept only CC0, CC-BY, or an explicit game-use license; reject CC-BY-NC and CC-BY-ND.
- All new scene-owned meshes, colliders, listeners, trucks, and effects must be cleaned on retry, mission change, and return to the map.
- Every production behavior begins with a test that fails for the missing behavior, followed by the minimal implementation and a fresh passing run.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/ui/screens.js` | Hub navigation: profile, campaign map, briefing, defeat, victory; no legacy menu path. |
| `src/profile/profile-ui.js` | Profile creation/selection and direct navigation to the map. |
| `src/ui/campaign-map.js` | Campaign map controls, including the independent profile switch action. |
| `src/input/controls.js` | Wire only existing controls and all return-to-map actions. |
| `src/campaign/mission-data.js` | Mark M01 as the authored opening operation and point it at `scene-01`. |
| `src/scenes/scene-library.js` | Immutable scene registry and lookup API. |
| `src/scenes/scene-01.js` | Immutable M01 layout: zones, landmarks, paths, spawn positions, checkpoints and act metadata. |
| `src/scenes/scene-builder.js` | Builds/disposes the active scene root, colliders and scene-owned effects. |
| `src/entities/convoy.js` | Builds, updates, damages and disposes protected convoy trucks. |
| `src/cinematics/operation-cinematics.js` | Skippable in-engine camera/dialogue beats and cleanup. |
| `src/missions/operation-controller.js` | M01 finite three-act state machine; delegates standard missions to existing director. |
| `src/missions/director.js` | Routes M01 update/start/retry flow to the operation controller without modifying generic mode behavior. |
| `src/ui/game-ui.js` and `game.html` | Objective strip, subtitle/cinematic overlay, skip action and operation status rendering. |
| `docs/credits/assets.md` | Attribution ledger for any future imported art asset. |

## Task 1: Remove the legacy menu and prove the new hub flow

**Files:**
- Modify: `game.html`
- Modify: `src/core/runtime.js`
- Modify: `src/ui/screens.js`
- Modify: `src/profile/profile-ui.js`
- Modify: `src/ui/campaign-map.js`
- Modify: `src/input/controls.js`
- Modify: `tests/screens-stale-markup-check.mjs`
- Create: `tests/profile-to-map-flow-check.mjs`

**Interfaces:**
- Produces `showCampaignMap(): boolean` and `showProfileSelect(): void`.
- Consumes `renderCampaignMap(): boolean`, `initProfileUI(): boolean`, `initCampaignMapUI(): boolean`.
- Removes `showMenu()` and all references to `#menu`, `btnMissions`, `btnProfileBack`, and `btnProfiles`.

- [x] **Step 1: Write the failing flow test**

Create `tests/profile-to-map-flow-check.mjs` that loads the actual `src/ui/screens.js` in a VM with a fake document containing only `profileSelect`, `missions`, and `listStars`. Expose `showCampaignMap`, call it, and assert that `missions` receives `on`, `profileSelect` loses `on`, and `renderCampaignMap` is called exactly once. Assert source text does not contain `showMenu(` or `#menu`.

```js
if(context.FlowTest.showCampaignMap()!==true)throw new Error('map hub must render');
if(!screens.missions.classList.has('on'))throw new Error('campaign map must be active');
if(source.includes('showMenu(')||source.includes("'menu'"))throw new Error('legacy menu path remains');
```

- [x] **Step 2: Run the test and verify RED**

Run: `node tests/profile-to-map-flow-check.mjs`

Expected: failure because `showCampaignMap` does not exist and `showMenu` remains.

- [x] **Step 3: Implement direct profile-to-map navigation**

Remove the `#menu` markup and its three controls from `game.html`. Add `btnMapProfiles` in the campaign-map header, labelled `تغییر پروفایل`. Replace `showMenu` with:

```js
function showCampaignMap(){
  state='menu'; paused=false; document.body.dataset.state='menu'; stopMusic();
  const listStars=document.getElementById('listStars');
  if(!listStars||!renderCampaignMap())return false;
  listStars.textContent=`ستاره‌ها: ${faNum(totalStars())} از ${faNum(MISSIONS.length*3)} · مأموریت‌های باز: ${faNum(prog.u)} از ${faNum(MISSIONS.length)}`;
  showScreen('missions'); return true;
}
```

Update `SCREENS` to omit `menu`; have profile continue call `showCampaignMap`; map profile switch call `showProfileSelect`; runtime call `showProfileSelect` only when both UI modules initialize. Point briefing back, victory list, defeat list, pause quit and all relevant controls to `showCampaignMap`.

- [x] **Step 4: Run focused checks and verify GREEN**

Run:

```powershell
node tests/profile-to-map-flow-check.mjs
node tests/profile-ui-init-check.mjs
node tests/campaign-map-init-check.mjs
node tests/screens-stale-markup-check.mjs
rg -n "showMenu|btnMissions|btnProfileBack|btnProfiles|id=\"menu\"" game.html src
```

Expected: all Node checks print `PASS`; `rg` exits 1 with no matches.

- [x] **Step 5: Commit**

```powershell
git add game.html src/core/runtime.js src/ui/screens.js src/profile/profile-ui.js src/ui/campaign-map.js src/input/controls.js tests/profile-to-map-flow-check.mjs tests/screens-stale-markup-check.mjs
git commit -m "feat: replace legacy menu with campaign hub"
```

## Task 2: Define the immutable scene and operation data for M01

**Files:**
- Modify: `src/campaign/mission-data.js`
- Create: `src/scenes/scene-library.js`
- Create: `src/scenes/scene-01.js`
- Create: `tests/opening-operation-data-check.mjs`

**Interfaces:**
- Produces `SceneLibrary.getScene(sceneId)` and `OpeningScene01.LAYOUT`.
- `LAYOUT` has `{id, playerSpawn, zones, convoyPath, checkpoints, encounters, landmarks, cinematicBeats}`.
- `CAMPAIGN_MISSIONS[0].runtime.operation` equals `'opening-convoy'`.

- [x] **Step 1: Write the failing data test**

Create `tests/opening-operation-data-check.mjs`. Load real scene files in a VM, then assert scene ID `scene-01`, three ordered zones (`yard`, `broken-road`, `watch-hill`), exactly three truck path records, three checkpoints, five finite encounter records, and frozen data.

```js
const scene=context.SceneLibrary.getScene('scene-01');
if(scene.zones.map(z=>z.id).join(',')!=='yard,broken-road,watch-hill')throw new Error('M01 needs three ordered acts');
if(scene.convoyPath.length!==3||scene.encounters.length!==5)throw new Error('M01 authored counts changed');
if(!Object.isFrozen(scene))throw new Error('scene layout must be immutable');
```

- [x] **Step 2: Run the test and verify RED**

Run: `node tests/opening-operation-data-check.mjs`

Expected: failure because the scene registry and layout do not exist.

- [x] **Step 3: Create authored M01 data**

Define fixed coordinates in `scene-01.js`: player spawn `[-76,0,92]`; zones from southwest to northeast; convoy stops at yard, canal and exit; checkpoint IDs `m01-yard`, `m01-road`, `m01-hill`; encounters `yard-scout-a`, `yard-scout-b`, `road-ambush-a`, `road-ambush-b`, `hill-commander`; landmarks for the fuel yard, rail siding, canal bridge, orchard, watch tower, generator and exit gate. Use `Object.freeze` recursively for all exported records. Update M01 campaign data to title `آتش در سرو`, scene `scene-01`, runtime `{t:'operation',v:3,c:1,operation:'opening-convoy'}` and preserve the persistent reward schema.

- [x] **Step 4: Run the test and verify GREEN**

Run: `node tests/opening-operation-data-check.mjs`

Expected: `PASS: opening operation scene data`.

- [x] **Step 5: Commit**

```powershell
git add src/campaign/mission-data.js src/scenes/scene-library.js src/scenes/scene-01.js tests/opening-operation-data-check.mjs
git commit -m "feat: define opening convoy operation data"
```

## Task 3: Build and dispose the M01 visual world as an owned layer

**Files:**
- Modify: `src/boot.js`
- Modify: `src/world/battlefield.js`
- Create: `src/scenes/scene-builder.js`
- Create: `tests/scene-lifecycle-check.mjs`

**Interfaces:**
- Produces `SceneBuilder.loadForMission(mission): object|null`, `SceneBuilder.clearActive(): void`, and `SceneBuilder.getActive(): object|null`.
- An active scene handle is `{id, root, colliders, effects, dispose}`.
- Consumes `SceneLibrary.getScene`, `OpeningScene01.LAYOUT`, Three.js globals and existing material helpers `mkBox`, `mkCyl`, `mkSph`.

- [ ] **Step 1: Write the failing lifecycle test**

Create `tests/scene-lifecycle-check.mjs` with a minimal fake builder dependency that counts `add`, `remove`, `addCollider`, and `removeCollider`. Assert loading `scene-01` produces one root, calling `clearActive` removes the root and all scene colliders, and calling clear twice does not remove anything twice.

```js
const active=builder.loadForMission({sceneId:'scene-01'});
if(!active||active.id!=='scene-01')throw new Error('scene-01 must load');
builder.clearActive(); builder.clearActive();
if(fake.removed!==1||fake.colliderRemovals!==active.colliders.length)throw new Error('scene cleanup must be idempotent');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/scene-lifecycle-check.mjs`

Expected: failure because `SceneBuilder` does not exist.

- [ ] **Step 3: Implement owned scene layers**

Load `scene-library.js`, `scene-01.js`, and `scene-builder.js` before `battlefield.js` in `src/boot.js`. Refactor `buildBattlefield()` to create only persistent renderer ambience and a `legacyWorldRoot`, preserving it for M02–M40. `SceneBuilder.loadForMission` hides the legacy root for `scene-01`, creates one group, registers every collision record in the handle, and builds fuel tanks, rail siding and static wagons, damaged shed, mud road, shallow canal, bridge, orchard, watch tower, generator, sandbags, distant hills, rain/smoke sprites and bounded fire effects. Its disposer removes group children, unregisters only handle colliders and restores the legacy root. Do not create random buildings or random camps inside `scene-01`.

- [ ] **Step 4: Run focused checks and verify GREEN**

Run:

```powershell
node tests/scene-lifecycle-check.mjs
node tests/opening-operation-data-check.mjs
```

Expected: both print `PASS` and repeated scene cleanup has no duplicate removal.

- [ ] **Step 5: Commit**

```powershell
git add src/boot.js src/world/battlefield.js src/scenes/scene-builder.js tests/scene-lifecycle-check.mjs
git commit -m "feat: add owned cinematic scene layers"
```

## Task 4: Add protected convoy trucks and finite three-act operation logic

**Files:**
- Create: `src/entities/convoy.js`
- Create: `src/missions/operation-controller.js`
- Modify: `src/missions/director.js`
- Modify: `src/combat/combat.js`
- Modify: `src/ui/game-ui.js`
- Create: `tests/opening-operation-controller-check.mjs`

**Interfaces:**
- Produces `Convoy.create(layout)`, `Convoy.update(convoy,dt)`, `Convoy.damage(truck,amount)`, `Convoy.dispose(convoy)`.
- Produces `OpeningOperation.start(mission)`, `OpeningOperation.update(dt)`, `OpeningOperation.retryCheckpoint()`, `OpeningOperation.dispose()`, `OpeningOperation.isActive()`.
- `OpeningOperation.update` returns `{handled:true, completed:boolean, failed:boolean}` while active; `updateDirector` returns immediately when handled.

- [ ] **Step 1: Write failing operation-controller tests**

Create `tests/opening-operation-controller-check.mjs` using the real controller with injected scene/convoy/enemy/cinematic functions. Assert ordered acts, no random spawning, checkpoint retry resets only the current act, all trucks destroyed returns `failed:true`, and `completed:true` occurs only after the hill encounter is cleared and at least one truck reaches exit.

```js
operation.start({idx:0,def:{sceneId:'scene-01'}});
if(operation.snapshot().act!=='yard')throw new Error('opening must begin in yard');
operation.advanceForTest('yard'); operation.advanceForTest('broken-road');
if(operation.snapshot().act!=='watch-hill')throw new Error('acts must be ordered');
operation.destroyAllTrucksForTest();
if(!operation.update(.1).failed)throw new Error('all trucks lost must fail');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/opening-operation-controller-check.mjs`

Expected: failure because `OpeningOperation` and `Convoy` do not exist.

- [ ] **Step 3: Implement convoy and opening-operation state machine**

Build each truck from low-poly cab, cargo bed, wheels, lights and health-bar group; routes move only after their act activates. Register truck collision circles separately and make `damagePlayer`/enemy shell splash call `Convoy.damage` when an explosion overlaps a truck. Operation controller must spawn only the five named encounter records with existing `spawnEnemy(type,{stationary,hp})`, track their live IDs, set the checkpoint after each completed act, use `showBanner` and `showMsg` for the current objective, and call existing `missionVictory()` only after exit conditions. `makeMission` identifies `runtime.operation==='opening-convoy'`; `updateDirector` delegates before generic `survive` logic. Retry uses `OpeningOperation.retryCheckpoint()` and never invokes generic random spawn loops.

- [ ] **Step 4: Run controller checks and verify GREEN**

Run:

```powershell
node tests/opening-operation-controller-check.mjs
node tests/scene-lifecycle-check.mjs
```

Expected: both print `PASS`; test output proves five named encounters and no generic spawn call for M01.

- [ ] **Step 5: Commit**

```powershell
git add src/entities/convoy.js src/missions/operation-controller.js src/missions/director.js src/combat/combat.js src/ui/game-ui.js tests/opening-operation-controller-check.mjs
git commit -m "feat: add opening convoy operation controller"
```

## Task 5: Add skippable cinematics, subtitles and checkpoint-safe transitions

**Files:**
- Create: `src/cinematics/operation-cinematics.js`
- Modify: `game.html`
- Modify: `styles/game.css`
- Modify: `src/input/controls.js`
- Modify: `src/ui/screens.js`
- Modify: `src/missions/operation-controller.js`
- Create: `tests/operation-cinematics-check.mjs`

**Interfaces:**
- Produces `OperationCinematics.play(beat,callbacks)`, `OperationCinematics.skip()`, `OperationCinematics.update(dt)`, `OperationCinematics.dispose()`.
- `play` returns a handle with `{active, skip, complete}`; callbacks call exactly once.
- `OpeningOperation` calls beats `m01-intro`, `m01-road-transition`, `m01-hill-transition`, `m01-outro`.

- [ ] **Step 1: Write the failing cinematic test**

Create `tests/operation-cinematics-check.mjs` with a fake overlay and camera. Play an intro, invoke skip twice, then assert the skip callback ran once, overlay is hidden, camera restoration was called once, and a later `dispose` is harmless.

```js
const handle=Cinematics.play({id:'m01-intro',duration:4},callbacks);
handle.skip(); handle.skip(); Cinematics.dispose();
if(completed!==1||fakeOverlay.visible||camera.restoreCount!==1)throw new Error('skip must be safe and exactly once');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/operation-cinematics-check.mjs`

Expected: failure because the cinematic module does not exist.

- [ ] **Step 3: Implement in-engine skippable beats**

Add a non-blocking cinematic overlay with subtitle, speaker, progress bar and `btnSkipCinematic`; it is visible from frame one. Cinematic camera interpolates from the fuel fire to Marium’s truck and T-34 for intro, uses 3–5-second bridges for act transitions, and shows the distant tower/train composition for outro. `Escape` and the skip button call the same idempotent skip method. When a beat completes or skips, restore player camera and resume the exact stored operation state. Pause must pause cinematic time; retry/quit must dispose it.

- [ ] **Step 4: Run checks and verify GREEN**

Run:

```powershell
node tests/operation-cinematics-check.mjs
node tests/opening-operation-controller-check.mjs
```

Expected: both print `PASS`; the operation test still reaches completion after skipped transitions.

- [ ] **Step 5: Commit**

```powershell
git add src/cinematics/operation-cinematics.js game.html styles/game.css src/input/controls.js src/ui/screens.js src/missions/operation-controller.js tests/operation-cinematics-check.mjs
git commit -m "feat: add skippable opening operation cinematics"
```

## Task 6: Wire lifecycle, license ledger and full regression verification

**Files:**
- Modify: `src/boot.js`
- Modify: `src/ui/screens.js`
- Modify: `src/missions/director.js`
- Create: `docs/credits/assets.md`
- Modify: `tests/campaign-foundation-check.ps1`
- Create: `tests/m01-integration-contract-check.mjs`

**Interfaces:**
- `startMission(0)` calls `SceneBuilder.loadForMission`, `OpeningOperation.start` and `OperationCinematics.play` in that order.
- `clearWorld`, retry, victory, defeat and quit call `OpeningOperation.dispose`, `OperationCinematics.dispose` and `SceneBuilder.clearActive` before changing screen.
- `docs/credits/assets.md` starts with the license acceptance table and no imported asset entries until an approved asset is actually added.

- [ ] **Step 1: Write the failing integration-contract check**

Create `tests/m01-integration-contract-check.mjs`. Read source files and assert boot loads scene, convoy and cinematic modules in dependency order; `startMission` has an M01 setup hook; director delegates operation before generic modes; `clearWorld` has all three dispose calls; and no removed menu identifiers exist. Assert credits file exists and contains the license table headings.

```js
assertOrder(boot,['src/scenes/scene-library.js','src/scenes/scene-01.js','src/scenes/scene-builder.js','src/entities/convoy.js','src/cinematics/operation-cinematics.js','src/missions/operation-controller.js']);
mustContain(screens,'OpeningOperation.dispose()');
mustNotContain(allSource,'showMenu');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/m01-integration-contract-check.mjs`

Expected: failure until all lifecycle hooks and credits ledger exist.

- [ ] **Step 3: Complete lifecycle wiring and documentation**

Load modules in `boot.js` after their dependencies. Update `clearWorld`, retry, victory, defeat, quit and map navigation to call the three idempotent disposers. Write `docs/credits/assets.md` with a table: `Asset | Creator | Source URL | License | Download date | Changes | In-game credit`, then document allowed/rejected licenses and leave the asset table empty. Add precise PowerShell checks for removed menu markup, M01 operation data and new script paths to `campaign-foundation-check.ps1`.

- [ ] **Step 4: Run full verification and verify GREEN**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1
node tests/profile-view-model-check.mjs
node tests/profile-store-check.mjs
node tests/campaign-map-model-check.mjs
node tests/profile-to-map-flow-check.mjs
node tests/opening-operation-data-check.mjs
node tests/scene-lifecycle-check.mjs
node tests/opening-operation-controller-check.mjs
node tests/operation-cinematics-check.mjs
node tests/m01-integration-contract-check.mjs
git diff --check
```

Expected: every check prints `PASS`; `git diff --check` has no output. Then run the local server from the worktree and verify manually: profile → map → M01; skip every cinematic; lose all trucks; retry from each checkpoint; win with one and three trucks; return to map; launch M02.

- [ ] **Step 5: Commit**

```powershell
git add src/boot.js src/ui/screens.js src/missions/director.js docs/credits/assets.md tests/campaign-foundation-check.ps1 tests/m01-integration-contract-check.mjs
git commit -m "feat: integrate cinematic opening operation"
```
