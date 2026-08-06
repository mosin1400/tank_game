# M01 Density, Collision and Texture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Densify M01, align its railway, add correct oriented collisions, introduce ground/tank textures, and place story characters and observers.

**Architecture:** Scene-specific layout helpers live in `scene-builder.js`; reusable collision math lives beside input collision resolution. A shared rail frame drives all rail geometry and wagons. Generated textures are project assets consumed by renderer materials.

**Tech Stack:** JavaScript, Three.js, Canvas/PNG textures, Node contract tests.

## Global Constraints

- Preserve every existing game capability.
- M01 contains story characters and observers, not hostile infantry combatants.
- All scene-owned objects and colliders must be cleaned by `SceneBuilder.clearActive()`.
- Production behavior follows a failing-test-first cycle.

---

### Task 1: Oriented collision behavior

**Files:**
- Modify: `src/input/controls.js`
- Create: `tests/oriented-collision-check.mjs`

**Interfaces:**
- Consumes collider `{type:'obb',x,z,hw,hd,ry}`.
- Produces the existing `resolveCollisions(pos,r,isPlayer,selfE)` behavior with OBB support.

- [ ] Write a VM test that places a tank circle beside a 45-degree box and checks the resolved point is outside its local extents.
- [ ] Run `node tests/oriented-collision-check.mjs` and observe failure because OBB is unsupported.
- [ ] Add world-to-local circle-versus-box resolution and transform the correction back to world space.
- [ ] Run the focused test and existing operation tests.

### Task 2: Shared rail frame and blocking wagons

**Files:**
- Modify: `src/scenes/scene-builder.js`
- Create: `tests/m01-rail-collision-check.mjs`

**Interfaces:**
- Produces `SceneBuilder.getRailPlacementsForTest()` only through configured test dependencies, with wagon placements derived from the same rail frame used for rendering.
- Adds OBB colliders for wagons and major scene structures through `handle.addCollider`.

- [ ] Write a behavior test that builds M01 with lightweight dependencies and checks wagon lateral offsets are zero in rail-local space and yaw matches the track.
- [ ] Run it and observe failure against the current independently placed rail geometry.
- [ ] Build rails, sleepers and wagons from one `railPoint(distance,lateral)` transform and register their colliders.
- [ ] Run rail, collision and lifecycle checks.

### Task 3: Dense authored prop clusters and human actors

**Files:**
- Modify: `src/scenes/scene-builder.js`
- Modify: `tests/m01-art-pass-check.mjs`

**Interfaces:**
- Produces dense zone builders and `buildStoryCharacter(parent, role, position, yaw)`.
- Registers blocking colliders only for major props.

- [ ] Extend the art-pass test to build a real scene handle and assert minimum landmark, blocking-prop and actor counts.
- [ ] Run it and observe failure on current counts.
- [ ] Add prop clusters across all three acts and six lightweight story/observer actors.
- [ ] Run art, lifecycle and opening-operation checks.

### Task 4: Ground and tank texture assets

**Files:**
- Create: `assets/images/m01-muddy-ground.png`
- Create: `assets/images/tank-worn-olive-steel.png`
- Modify: `src/render/renderer.js`

**Interfaces:**
- Renderer loads both assets and applies repeating ground detail and shared tank steel detail while preserving material tint differences.

- [ ] Generate and visually inspect both seamless texture assets.
- [ ] Add a renderer material test that verifies the ground repeat and tank material maps/tints.
- [ ] Run it and observe failure before renderer integration.
- [ ] Integrate the maps into existing materials without changing weapon or vehicle behavior.
- [ ] Run renderer, art and operation tests.

### Task 5: Regression verification

**Files:**
- Modify only files already listed if verification finds a scoped defect.

- [ ] Run every `tests/*.mjs` test and `git diff --check`.
- [ ] Launch the local page and inspect M01 for console errors, rail alignment, obstacle blocking, character placement and texture visibility.
- [ ] Review the final diff to ensure no existing feature was removed.
