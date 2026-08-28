# Shared Soldier Animation and Game Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the original-rig downloaded soldier into operation one with distinct textures, baked CC0 animations, procedural motion overlays, and visual verification.

**Architecture:** Blender retains the 97-bone soldier and bakes selected Quaternius source actions onto anatomically matched original bones. Three.js loads geometry and motion once, clones skinned instances, applies per-role materials, runs a crossfade state machine, and adds lightweight procedural motion after mixer updates.

**Tech Stack:** Blender 4.2 Python, Quaternius CC0 FBX/GLB, glTF/GLB 2.0, Three.js GLTFLoader/SkeletonUtils/AnimationMixer, ES5-compatible boot modules, Node contract tests.

## Global Constraints

- Never replace, rebind, or regenerate the downloaded soldier's original 97-bone skeleton or weights.
- Preserve `Universal Animation Library[Standard].zip`, extracted animation sources, downloaded soldier sources/textures/license, and all gameplay/story capabilities.
- Require structural and visual output checks before deleting old model files.

---

### Task 1: Build the Texture Variant Contract

- [ ] Add a failing manifest/image test for all 22 roster IDs.
- [ ] Generate nine 1024px uniform variants from the original diffuse image while preserving detail and non-uniform pixels.
- [ ] Add `textureVariant` to every roster appearance and validate local safe paths.
- [ ] Run image and roster tests.

### Task 2: Retarget and Bake the CC0 Motion Library

- [ ] Add a failing Blender verifier requiring the eleven public baked actions on the 97-bone target.
- [ ] Inventory source/target rest skeletons and build a deterministic anatomical map using hierarchy plus normalized rest positions.
- [ ] Bake local rotation deltas onto target bones without modifying rest data, weights, or rigid attachments.
- [ ] Export `assets/models/characters/animation/character-motion.glb` and a bone-map manifest.
- [ ] Verify finite tracks, target names, durations, and source archive preservation.

### Task 3: Add Runtime Character Loading and Motion Control

- [ ] Add failing JS contracts for cached loading, skinned cloning, per-instance materials, state aliases, crossfades, procedural overlays, and disposal.
- [ ] Implement `src/entities/character-manager.js` and extend `animation-manager.js` with aliases, one-shots, and post-mixer procedural hooks.
- [ ] Import GLTFLoader and SkeletonUtils during boot and initialize the shared character assets.
- [ ] Keep all errors local to character placeholders and expose actionable console messages.

### Task 4: Replace Scene-One Primitive Actors

- [ ] Add a failing scene contract proving `buildStoryCharacter` no longer builds Box/Sphere/Cylinder body parts.
- [ ] Spawn roster-backed models into existing actor placeholders while retaining positions, rotations, role metadata, and colliders.
- [ ] Update and dispose actors through the active SceneBuilder handle.
- [ ] Run scene and lifecycle tests.

### Task 5: Produce Offline and Browser Visual Evidence

- [ ] Render idle, walk, run, aim, and fall contact sheets using the actual base GLB and baked motion GLB.
- [ ] Inspect and reject exploded limbs, detached gear, missing textures, ground drift, and incorrect framing.
- [ ] Serve the modular worktree over HTTP, enter operation one, and capture screenshots showing replaced story actors and palette differences.
- [ ] Confirm no character or animation errors in the browser console.

### Task 6: Remove Superseded Models and Exclusive Generators

- [ ] Hash the animation archive before cleanup.
- [ ] Review an exact deletion list covering six old GLBs and MakeHuman/wardrobe-only builders, caches, recipes, previews, and exclusive tests.
- [ ] Delete only reviewed superseded files and update dangling references.
- [ ] Repeat structural, motion, roster, scene, offline-image, and browser-image checks.
- [ ] Confirm the animation archive hash is unchanged.

