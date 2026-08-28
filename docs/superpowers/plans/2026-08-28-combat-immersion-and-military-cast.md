# Combat Immersion and Military Cast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add continuous projectile impacts, material-aware destruction, armed military characters, safe navigation, realistic gun aiming, a skippable opening cinematic, suppression, smoke visibility, localized tank damage, and tactical commands without removing existing gameplay.

**Architecture:** Keep the browser-only Three.js runtime and add small IIFE modules with explicit global APIs. Projectile movement supplies one swept segment to `ImpactSystem`; registered targets decide their own response through `DestructibleRegistry`, `CharacterCombat`, and tank damage callbacks. Character navigation, aiming, cinematic, and tactical commands remain separate controllers so each can be verified independently.

**Tech Stack:** JavaScript ES5-compatible IIFEs loaded by `src/boot.js`, Three.js r160, Node `vm` contract tests, Blender 4.2 visual/asset verification, local HTTP runtime.

## Global Constraints

- Work only in `C:\Users\Mohammad Amin Chezgi\Downloads\t3475\.worktrees\modular-game`.
- Preserve the existing profile, campaign, weapons, audio, mission, victory, defeat, mobile controls, and cheat shortcuts.
- Allied soldiers react to player fire but never lose health or die from it.
- No civilian faction or civilian story role remains active in the campaign; preserve required narrative functions by converting them to military roles.
- Remove the extra driver actor from mission 01.
- Preserve `Universal Animation Library[Standard].zip` and the current shared 65-bone soldier assets.
- Use the existing projectile pool and visual-effect pools; add bounded pools rather than unbounded scene objects.
- Opening cinematic must be skippable with Escape, Space, click, or touch.
- Turret yaw limits are `-145°` and `+145°`; gun pitch limits are `-8°` and `+22°`.
- Hold Shift for precision camera; Shift plus arrow keys adjusts turret yaw and gun pitch.
- Follow red-green-refactor for every production behavior and run old regression tests after every task.

---

### Task 1: Continuous Projectile Collision

**Files:**
- Create: `src/combat/impact-system.js`
- Modify: `src/boot.js`
- Modify: `src/missions/director.js`
- Modify: `src/input/controls.js`
- Test: `tests/impact-system-check.mjs`
- Test: `tests/projectile-collider-check.mjs`

**Interfaces:**
- Consumes: colliders shaped as `{type, x, z, r?, hw?, hd?, ry?, h?, material?, target?}`.
- Produces: `ImpactSystem.configure(deps)`, `ImpactSystem.segmentCollider(start,end,collider)`, `ImpactSystem.trace(start,end,projectile)`, `ImpactSystem.resolve(projectile,hit)`, and `ImpactSystem.reset()`.
- `trace` returns `null` or `{kind, point, normal, distance, collider, target}` and always chooses the closest hit.

- [ ] **Step 1: Write the failing continuous-collision test**

Create a Node `vm` test that loads the real module and asserts these literal cases:

```js
const wall={type:'aabb',x:5,z:0,hw:.25,hd:2,h:3};
const hit=ImpactSystem.segmentCollider({x:0,y:1,z:0},{x:10,y:1,z:0},wall);
assert.ok(hit,'a fast shell must hit the thin wall');
assert.ok(Math.abs(hit.point.x-4.75)<1e-6);
assert.equal(ImpactSystem.segmentCollider({x:0,y:4,z:0},{x:10,y:4,z:0},wall),null);
```

Also register a wall at distance 8 and a character at distance 4 and assert `trace` returns the character.

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/impact-system-check.mjs`

Expected: FAIL because `ImpactSystem` is not defined.

- [ ] **Step 3: Implement swept circle, AABB, OBB, vertical-height, and ground intersection**

Use slab intersection for AABB, rotate segment endpoints into OBB-local coordinates, solve the XZ quadratic for circles, and interpolate `y` at the hit fraction. Ground collision occurs when `start.y > 0.06 && end.y <= 0.06`.

```js
function trace(start,end,projectile){
  var hits=[];
  dependencies.targets().forEach(function(collider){
    var hit=segmentCollider(start,end,collider);
    if(hit)hits.push(hit);
  });
  var ground=segmentGround(start,end);
  if(ground)hits.push(ground);
  return hits.sort(function(a,b){return a.distance-b.distance;})[0]||null;
}
```

- [ ] **Step 4: Route real bullets through one trace**

In `updateBullets`, clone/copy the previous position before integration, move the projectile, call `ImpactSystem.trace(previous,current,b)`, resolve the result once, then deactivate the projectile. Remove only the superseded point-based obstacle/building/ground loops; keep lifetime and bounds expiration.

- [ ] **Step 5: Load the module before projectiles and run GREEN**

Add `src/combat/impact-system.js` before `src/combat/projectiles.js` in `GAME_SCRIPTS`.

Run:

```powershell
node tests/impact-system-check.mjs
node tests/projectile-collider-check.mjs
node --check src/combat/impact-system.js
node --check src/missions/director.js
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/combat/impact-system.js src/boot.js src/missions/director.js src/input/controls.js tests/impact-system-check.mjs tests/projectile-collider-check.mjs
git commit -m "feat: add continuous projectile collision"
```

---

### Task 2: Material-Aware Destruction and Ground Impacts

**Files:**
- Create: `src/combat/destructible-registry.js`
- Modify: `src/combat/impact-system.js`
- Modify: `src/combat/effects.js`
- Modify: `src/scenes/scene-builder.js`
- Modify: `src/world/battlefield.js`
- Modify: `src/ui/screens.js`
- Modify: `src/core/runtime.js`
- Modify: `src/boot.js`
- Test: `tests/destructible-registry-check.mjs`
- Test: `tests/ground-impact-check.mjs`
- Test: `tests/m01-art-pass-check.mjs`

**Interfaces:**
- Produces: `DestructibleRegistry.configure(deps)`, `register(spec)`, `targets()`, `applyImpact(target,impact)`, `removeWithin(root)`, and `reset()`.
- `spec` is `{object, collider, material, durability, breakable, root}`.
- `applyImpact` returns one of `{result:'dent'|'chip'|'break'|'ricochet'|'fuel-hit', remaining}`.

- [ ] **Step 1: Write failing material-response tests**

Use real registry calls with deterministic `random:()=>0.5` and literal assertions:

```js
assert.equal(registry.applyImpact(steel,{damage:6,kind:'mg',incidence:.2}).result,'dent');
assert.equal(registry.applyImpact(wood,{damage:60,kind:'shell',incidence:.8}).result,'break');
assert.equal(removedCollider,true,'breaking a prop removes its collision');
```

For ground, call `ImpactSystem.resolve` with `{kind:'ground'}` and assert the configured callback receives explosion size `.45`, crater size `.7`, and dust count `8` for a normal shell.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node tests/destructible-registry-check.mjs
node tests/ground-impact-check.mjs
```

Expected: FAIL because the registry and ground response do not exist.

- [ ] **Step 3: Implement bounded dents, debris, and craters**

Add pools to runtime:

```js
const impactMarks=[],breakFragments=[];
const MAX_IMPACT_MARKS=96,MAX_BREAK_FRAGMENTS=80;
```

Implement `spawnImpactMark(point,normal,material,size)`, `spawnBreakFragments(target,point,count)`, and `spawnGroundImpact(point,power)`. Reuse the oldest mark/fragment when a pool reaches its limit. A resistant mark is a shallow dark circular mesh aligned to `normal`; broken props become 4–8 box fragments, the source object becomes invisible, and its collider is removed.

- [ ] **Step 4: Annotate mission and legacy props**

Update scene builders so every collider carries a target specification:

```js
handle.addDestructible({
  object:crate,collider:{type:'obb',x,z,hw:.58,hd:.58,ry:0,h:1.1},
  material:'wood',durability:35,breakable:true,root:group
});
```

Use `steel` for rails, wagons, fuel tanks and lamps; `concrete` for buildings and bridge; `wood` for crates, fences, sandbags and cable spools; `fuel` for drums/tanks; `earth` for the ground.

- [ ] **Step 5: Reset destruction on mission lifecycle**

Call `DestructibleRegistry.removeWithin(active.root)` in `SceneBuilder.clearActive()` and `DestructibleRegistry.reset()` in `clearWorld()` after clearing bullets.

- [ ] **Step 6: Run GREEN and regressions**

Run:

```powershell
node tests/destructible-registry-check.mjs
node tests/ground-impact-check.mjs
node tests/m01-art-pass-check.mjs
node tests/scene-lifecycle-check.mjs
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/combat/destructible-registry.js src/combat/impact-system.js src/combat/effects.js src/scenes/scene-builder.js src/world/battlefield.js src/ui/screens.js src/core/runtime.js src/boot.js tests/destructible-registry-check.mjs tests/ground-impact-check.mjs tests/m01-art-pass-check.mjs
git commit -m "feat: add material-aware battlefield destruction"
```

---

### Task 3: Armed Military Cast and Allied Hit Reactions

**Files:**
- Create: `src/entities/weapon-models.js`
- Create: `src/entities/character-combat.js`
- Modify: `src/entities/character-manager.js`
- Modify: `src/assets/character-roster.js`
- Modify: `assets/models/characters/manifests/character-roster.json`
- Modify: `src/scenes/scene-builder.js`
- Modify: `docs/story/character-bible.md`
- Modify: `docs/story/campaign-arc.md`
- Modify: `src/boot.js`
- Test: `tests/weapon-attachment-check.mjs`
- Test: `tests/character-combat-check.mjs`
- Test: `tests/military-roster-check.mjs`
- Test: `tests/m01-art-pass-check.mjs`

**Interfaces:**
- `WeaponModels.create(type,THREE)` returns a detailed `THREE.Group` named `weapon-ppsh41` or `weapon-mosin`.
- `CharacterCombat.register(actor,{faction,radius,height})`, `traceSegment(start,end)`, `applyHit(actor,impact)`, `suppressNear(point,radius,amount)`, `removeWithin(root)`, and `reset()`.
- `CharacterManager.spawnCharacter` accepts `weapon:'ppsh41'|'mosin'|null` and exposes `list()` plus `commandAllies(command,target)`.

- [ ] **Step 1: Write failing weapon and friendly-fire tests**

Build a real fake bone hierarchy with a node named `mixamorig:RightHand`. Spawn a character with `weapon:'ppsh41'`, await readiness, and assert the weapon is a child of the hand and contains stock, receiver, barrel, sight and drum meshes.

Register an allied actor with `health:100`, apply a shell hit, and assert:

```js
assert.equal(actor.userData.health,100);
assert.equal(actor.userData.animation.state(),'hit-react');
assert.ok(actor.userData.suppression>0);
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node tests/weapon-attachment-check.mjs
node tests/character-combat-check.mjs
node tests/military-roster-check.mjs
```

Expected: FAIL because weapons, combat registration, and military-only roster behavior are missing.

- [ ] **Step 3: Build PPSh-41 and Mosin groups**

Use reusable cached geometries and two materials: worn blued steel and dark lacquered wood. PPSh-41 must include a shaped stock, box receiver, ventilated barrel shroud, muzzle, sights, trigger guard and drum magazine. Mosin must include a long stock, receiver, bolt handle, barrel, front/rear sights and sling points. Set shadows on all meshes and keep each weapon under 30 mesh nodes.

- [ ] **Step 4: Attach weapons and register hit volumes**

After cloning the character model:

```js
var hand=model.getObjectByName('mixamorig:RightHand');
var weapon=global.WeaponModels.create(options.weapon,deps.THREE);
hand.add(weapon);
weapon.position.set(.02,.04,.08);
weapon.rotation.set(-Math.PI/2,0,Math.PI/2);
```

Register the actor only after its model and animation exist. `CharacterCombat.applyHit` sets `hit-react` for `.55s`, adds suppression, calls a panic/cover request, and never changes allied health.

- [ ] **Step 5: Convert the campaign roster and remove the extra driver actor**

Delete the `marium`/driver placement from mission 01. Replace the two depot civilian placements with `vardan-engineer` and `vardan-rifleman`. Change every remaining roster entry with faction `civilian` to the military faction and role that preserves its story function. Remove `civilian` from valid faction sets and update the JSON manifest and story documents consistently.

- [ ] **Step 6: Run GREEN and character regressions**

Run:

```powershell
node tests/weapon-attachment-check.mjs
node tests/character-combat-check.mjs
node tests/military-roster-check.mjs
node tests/character-manager-check.mjs
node tests/character-roster-module-check.mjs
node tests/character-roster-contract-check.mjs
node tests/m01-art-pass-check.mjs
```

Expected: all PASS with five mission-01 actors: four ground soldiers plus one tower observer.

- [ ] **Step 7: Commit**

```powershell
git add src/entities/weapon-models.js src/entities/character-combat.js src/entities/character-manager.js src/assets/character-roster.js assets/models/characters/manifests/character-roster.json src/scenes/scene-builder.js docs/story/character-bible.md docs/story/campaign-arc.md src/boot.js tests/weapon-attachment-check.mjs tests/character-combat-check.mjs tests/military-roster-check.mjs tests/m01-art-pass-check.mjs
git commit -m "feat: arm the military character cast"
```

---

### Task 4: Collision- and Threat-Aware Character Navigation

**Files:**
- Create: `src/entities/character-navigation.js`
- Modify: `src/entities/character-manager.js`
- Modify: `src/core/runtime.js`
- Modify: `src/scenes/scene-builder.js`
- Modify: `src/boot.js`
- Test: `tests/character-navigation-check.mjs`
- Test: `tests/character-manager-check.mjs`

**Interfaces:**
- `CharacterNavigation.configure({getObstacles,getThreats,getAllies})`.
- `chooseStep(actor,behavior,dt)` returns `{x,z,yaw,state}` or `null`.
- `requestCover(actor,source,urgency)` and `setCommand(actor,command,target)` mutate only the actor navigation state.

- [ ] **Step 1: Write failing navigation tests**

Test three literal scenes:

1. Actor at `(0,0)` with threat at `(10,0)` must choose a step with `x < 0`.
2. A wall covering negative X forces the chosen step to a non-colliding Z direction.
3. Two actors at the same candidate point must choose separated destinations at least `1.2m` apart.

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/character-navigation-check.mjs`

Expected: FAIL because `CharacterNavigation` is missing.

- [ ] **Step 3: Implement scored steering**

Sample 16 headings. Predict the actor position `0.8s` ahead. Reject headings intersecting an expanded circle/AABB/OBB. Score each remaining heading:

```js
score += distanceFromThreatDelta*8;
score += coverGain*5;
score -= allyOverlap*12;
score -= headingChange*0.8;
score -= towardThreatDot>0?towardThreatDot*20:0;
```

Replan every `.35–.65s` using a deterministic per-actor phase, but immediately replan if the current segment is blocked.

- [ ] **Step 4: Replace fixed panic waypoints**

Mission 01 actors receive `{behavior:'run-to-cover',startDelay,speed}` rather than absolute waypoint loops. Configure navigation in runtime with `staticObs`, living enemies, player, convoy trucks, and registered allies.

- [ ] **Step 5: Run GREEN**

Run:

```powershell
node tests/character-navigation-check.mjs
node tests/character-manager-check.mjs
node tests/m01-art-pass-check.mjs
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/entities/character-navigation.js src/entities/character-manager.js src/core/runtime.js src/scenes/scene-builder.js src/boot.js tests/character-navigation-check.mjs tests/character-manager-check.mjs
git commit -m "feat: add threat-aware soldier navigation"
```

---

### Task 5: Gun Limits, Elevation, and Precision Camera

**Files:**
- Create: `src/entities/tank-aiming.js`
- Modify: `src/entities/player.js`
- Modify: `src/input/controls.js`
- Modify: `src/ui/game-ui.js`
- Modify: `src/ui/screens.js`
- Modify: `src/core/runtime.js`
- Modify: `src/boot.js`
- Test: `tests/tank-aiming-check.mjs`
- Test: `tests/precision-camera-check.mjs`

**Interfaces:**
- `TankAiming.configure({THREE,getPlayer,getAimPoint})`.
- `update(dt,input)` applies yaw/pitch and returns `{precision,yaw,pitch}`.
- `cameraPose()` returns `{position,lookAt,fov}` in world coordinates.
- `reset()` restores neutral pitch and third-person mode.

- [ ] **Step 1: Write failing limit and input tests**

Assert literal radians:

```js
controller.setAngles(Math.PI,1);
assert.ok(Math.abs(controller.yaw()-145*Math.PI/180)<1e-9);
assert.ok(Math.abs(controller.pitch()-22*Math.PI/180)<1e-9);
controller.setAngles(-Math.PI,-1);
assert.ok(Math.abs(controller.yaw()+145*Math.PI/180)<1e-9);
assert.ok(Math.abs(controller.pitch()+8*Math.PI/180)<1e-9);
```

With `{shift:true,up:true}`, assert pitch changes and tank throttle remains zero. With `{shift:false,up:true}`, assert throttle remains one and pitch does not change from key input.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node tests/tank-aiming-check.mjs
node tests/precision-camera-check.mjs
```

Expected: FAIL because `TankAiming` does not exist.

- [ ] **Step 3: Implement aiming limits and input arbitration**

Move turret/gun control from `updatePlayer` into `TankAiming`. In precision mode, consume arrow keys before drive input. Keep `WASD` available for slow tank movement, but arrow keys exclusively adjust gun while Shift is held. Clamp yaw and pitch every frame after interpolation.

- [ ] **Step 4: Implement barrel-aligned camera**

Obtain the world position and quaternion of `player.gun`. Place the precision camera `0.38m` above and `0.65m` behind the mantlet, look `80m` along the barrel axis, use FOV `24`, and reduce shake to 20%. Blend position/look/FOV with exponential smoothing. Third-person remains FOV `46`.

- [ ] **Step 5: Reset modes through lifecycle**

Call `TankAiming.reset()` in `startMission`, `clearWorld`, victory, defeat, pause exit, and campaign-map exit. Update shell direction from the real gun quaternion without flattening pitch.

- [ ] **Step 6: Run GREEN**

Run:

```powershell
node tests/tank-aiming-check.mjs
node tests/precision-camera-check.mjs
node --check src/entities/player.js
node --check src/ui/game-ui.js
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/entities/tank-aiming.js src/entities/player.js src/input/controls.js src/ui/game-ui.js src/ui/screens.js src/core/runtime.js src/boot.js tests/tank-aiming-check.mjs tests/precision-camera-check.mjs
git commit -m "feat: add precise tank gun aiming"
```

---

### Task 6: Skippable Mission-01 Opening Cinematic

**Files:**
- Create: `src/missions/opening-cinematic.js`
- Modify: `src/missions/operation-controller.js`
- Modify: `src/input/controls.js`
- Modify: `src/ui/game-ui.js`
- Modify: `src/ui/screens.js`
- Modify: `src/core/runtime.js`
- Modify: `src/boot.js`
- Modify: `game.html`
- Test: `tests/opening-cinematic-check.mjs`
- Test: `tests/opening-operation-controller-check.mjs`

**Interfaces:**
- `OpeningCinematic.configure(api)`, `start(layout)`, `update(dt)`, `skip()`, `dispose()`, `isActive()`, and `cameraPose()`.
- `api` supplies `setSubtitle(text,speaker)`, `clearSubtitle()`, `lockControls(value)`, `setMusicDuck(value)`, and `onComplete()`.

- [ ] **Step 1: Write failing timeline and skip tests**

Use a fake clock and assert beats at `0`, `2.8`, `5.8`, `8.6`, and `11.2` seconds. Call `skip()` at `3.1s` and assert exactly once: controls unlock, subtitle clears, music duck resets, and `onComplete` runs. A second `skip()` must return `false` and perform no side effects.

- [ ] **Step 2: Run test and verify RED**

Run: `node tests/opening-cinematic-check.mjs`

Expected: FAIL because the cinematic controller is missing.

- [ ] **Step 3: Implement the five-beat camera timeline**

Use scene landmarks to calculate poses for fuel yard, rail siding, running soldiers, player tank, and final gameplay handoff. Store Persian subtitle lines as data in the module. Use smoothstep interpolation between poses and never mutate scene objects from the cinematic controller.

- [ ] **Step 4: Add subtitle UI and skip controls**

Add `#cinematicSubtitle` with speaker and text children plus an unobtrusive «برای رد کردن: Esc یا Space» hint. Intercept Escape, Space, primary click, and touch only while `OpeningCinematic.isActive()`; otherwise preserve their current meanings.

- [ ] **Step 5: Integrate mission start**

Load `scene-01` through `OpeningOperation.start`, start the cinematic, set `state='cinematic'`, and defer active gameplay updates until completion. On completion, set `state='play'`, reset clock delta, and allow the operation intro timer to begin.

- [ ] **Step 6: Run GREEN and lifecycle regressions**

Run:

```powershell
node tests/opening-cinematic-check.mjs
node tests/opening-operation-controller-check.mjs
node tests/scene-lifecycle-check.mjs
node tests/screens-stale-markup-check.mjs
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/missions/opening-cinematic.js src/missions/operation-controller.js src/input/controls.js src/ui/game-ui.js src/ui/screens.js src/core/runtime.js src/boot.js game.html tests/opening-cinematic-check.mjs tests/opening-operation-controller-check.mjs
git commit -m "feat: add skippable opening cinematic"
```

---

### Task 7: Suppression, Smoke Visibility, Ricochet, and Tank Modules

**Files:**
- Create: `src/combat/combat-awareness.js`
- Create: `src/combat/tank-damage.js`
- Modify: `src/combat/impact-system.js`
- Modify: `src/combat/effects.js`
- Modify: `src/combat/combat.js`
- Modify: `src/missions/director.js`
- Modify: `src/core/runtime.js`
- Modify: `src/boot.js`
- Test: `tests/combat-awareness-check.mjs`
- Test: `tests/ricochet-check.mjs`
- Test: `tests/tank-module-damage-check.mjs`

**Interfaces:**
- `CombatAwareness.registerSmoke({position,radius,density,life})`, `visibilityBetween(a,b)`, `suppressNear(point,radius,amount)`, `update(dt)`, and `reset()`.
- `TankDamage.initialize(tank)`, `classifyHit(tank,worldPoint)`, and `apply(tank,module,damage)`.
- Enemy tanks expose `modules:{tracks,engine,turret}` in range `0..1`.

- [ ] **Step 1: Write failing deterministic tests**

Assert a density-1 smoke sphere centered on the line between shooter and target returns visibility below `.35`; an off-axis smoke sphere returns `1`. Assert a shallow steel impact (`incidence < .25`) with deterministic random returns `ricochet` and the reflected velocity points away from the surface. Assert track damage below `.35` caps tank speed at 45%, engine below `.35` caps it at 55%, and turret below `.35` caps traverse at 40%.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node tests/combat-awareness-check.mjs
node tests/ricochet-check.mjs
node tests/tank-module-damage-check.mjs
```

Expected: FAIL because the modules are missing.

- [ ] **Step 3: Connect smoke to enemy perception and accuracy**

Register smoke volumes when thick smoke is spawned. Multiply enemy detection distance and aim accuracy by `CombatAwareness.visibilityBetween(enemy,player)`. Expire volumes in `updateFX` and clear them with the mission.

- [ ] **Step 4: Implement suppression and ricochet**

Every projectile segment calls `suppressNear` for allied/enemy infantry within `3.5m`; explosions use their splash radius. For ricochet, reflect velocity with `v - 2*(v·n)*n`, reduce speed to 45%, damage to 30%, life to at most `.8s`, and permit only one ricochet per projectile.

- [ ] **Step 5: Implement tank module effects**

Transform hit points into tank-local coordinates. Classify rear third as engine, lower side strips as tracks, upper center as turret, otherwise hull. Initialize module health for player and enemies. Apply speed/reload/traverse penalties and show concise Persian feedback for player module damage.

- [ ] **Step 6: Run GREEN and combat regressions**

Run:

```powershell
node tests/combat-awareness-check.mjs
node tests/ricochet-check.mjs
node tests/tank-module-damage-check.mjs
node tests/impact-system-check.mjs
node --check src/missions/director.js
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/combat/combat-awareness.js src/combat/tank-damage.js src/combat/impact-system.js src/combat/effects.js src/combat/combat.js src/missions/director.js src/core/runtime.js src/boot.js tests/combat-awareness-check.mjs tests/ricochet-check.mjs tests/tank-module-damage-check.mjs
git commit -m "feat: add suppression smoke and localized tank damage"
```

---

### Task 8: Tactical Commands

**Files:**
- Create: `src/entities/tactical-command.js`
- Modify: `src/entities/character-manager.js`
- Modify: `src/entities/character-navigation.js`
- Modify: `src/input/controls.js`
- Modify: `src/ui/screens.js`
- Modify: `src/boot.js`
- Modify: `game.html`
- Test: `tests/tactical-command-check.mjs`

**Interfaces:**
- `TacticalCommand.issue('cover'|'attack'|'retreat',target)` returns the number of commanded allied actors.
- Keyboard mapping: `F1=cover`, `F2=attack`, `F3=retreat`.
- Mobile buttons call the same API and do not duplicate command logic.

- [ ] **Step 1: Write failing command tests**

Register three allies and one enemy. Assert `cover` sends only allies to `run-to-cover`; `attack` points them at the supplied enemy; `retreat` selects a vector away from it. Assert a repeated identical command updates the target but does not duplicate listeners or actors.

- [ ] **Step 2: Run test and verify RED**

Run: `node tests/tactical-command-check.mjs`

Expected: FAIL because `TacticalCommand` is missing.

- [ ] **Step 3: Implement API and UI**

Create three compact Persian HUD buttons visible only during play and cinematic-complete state. Issue a banner/feed acknowledgement containing the commanded unit count. Bind F1/F2/F3 and prevent browser help only when the game is in play.

- [ ] **Step 4: Integrate navigation states**

`cover` calls `requestCover`; `attack` favors headings that close to `12–20m` while avoiding direct obstacles; `retreat` favors headings away until at least `28m`, then switches to `hold`.

- [ ] **Step 5: Run GREEN**

Run:

```powershell
node tests/tactical-command-check.mjs
node tests/character-navigation-check.mjs
node tests/screens-stale-markup-check.mjs
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/entities/tactical-command.js src/entities/character-manager.js src/entities/character-navigation.js src/input/controls.js src/ui/screens.js src/boot.js game.html tests/tactical-command-check.mjs
git commit -m "feat: add allied tactical commands"
```

---

### Task 9: Runtime Integration, Cache Invalidation, and Visual Acceptance

**Files:**
- Modify: `src/boot.js`
- Modify: `game.html`
- Modify: `tests/character-runtime-cache-check.mjs`
- Create: `tests/combat-immersion-integration-check.mjs`
- Create: `tools/previews/combat-immersion/README.md`

**Interfaces:**
- All new modules load before their first consumer.
- One final build version invalidates boot, runtime scripts, soldier model, motion library, and weapon-model cache.

- [ ] **Step 1: Write the failing integration test**

Load the real boot script and assert dependency order: registries before impact system, impact system before director, weapon/navigation/combat before character manager consumers, aiming before player/camera, cinematic before operation controller, and tactical command before controls. Execute a controlled mission lifecycle and assert all module `reset`/`dispose` paths leave zero dynamic targets, smoke volumes, character hit volumes, fragments, and active cinematic timers.

- [ ] **Step 2: Run test and verify RED**

Run: `node tests/combat-immersion-integration-check.mjs`

Expected: FAIL until final order, resets, and build version are complete.

- [ ] **Step 3: Finalize script order and cache version**

Set both `game.html` and `src/boot.js` to `20260828-combat-v1`. Ensure no old `character-v11` or `mixamo-v2` URL remains in active loading paths unless the asset itself is unchanged and intentionally cache-keyed by the new build.

- [ ] **Step 4: Run the complete automated suite**

Run every active `.mjs` test except explicitly obsolete asset-pipeline tests that reference deleted `vardan-men.glb`, then run Blender verification:

```powershell
Get-ChildItem tests -Filter *.mjs | Where-Object Name -NotIn @('character-asset-contract-check.mjs') | ForEach-Object {
  node $_.FullName
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
}
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tests/verify-shared-soldier.py
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tests/verify-character-motion.py
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
```

Expected: all commands exit 0.

- [ ] **Step 5: Perform visual runtime verification**

Serve the modular worktree at port 8080, open `http://localhost:8080/game.html`, hard-refresh once, launch M01, and capture:

1. A military soldier holding PPSh-41 and the observer holding Mosin.
2. Soldiers routing around a solid prop while moving away from an enemy.
3. A metal dent and a broken wooden object after firing.
4. A ground crater and dust burst.
5. Precision barrel camera at minimum and maximum elevation.
6. One frame from the opening cinematic and the immediate playable state after skip.

Save screenshots under `.tmp/combat-immersion/` and record browser console errors in `.tmp/combat-immersion/console.txt`. Acceptance requires no uncaught errors and no visibly detached weapons, intersecting NPCs, or camera clipping.

- [ ] **Step 6: Final diff verification and commit**

```powershell
git diff --check
git status --short
git add src game.html tests tools/previews/combat-immersion/README.md assets/models/characters/manifests/character-roster.json docs/story
git commit -m "feat: complete combat immersion pass"
```
