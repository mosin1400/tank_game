# Single Soldier Character Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all previous generated character models with one downloaded equipped soldier, the supplied Mixamo rig, and roster-specific texture variants while preserving the animation library.

**Architecture:** Blender imports the equipped soldier and the authoritative Mixamo FBX, transfers/creates skin weights onto the Mixamo armature, and exports one animation-free shared GLB. The roster references this shared geometry and selects recolored source textures per character. Old model-generation assets are removed only after the replacement passes structural and visual checks.

**Tech Stack:** Blender 4.2 Python, FBX, glTF/GLB 2.0, Three.js ES modules, JSON roster, Node contract tests.

## Global Constraints

- Preserve `Universal Animation Library[Standard].zip` and its extracted animation files unchanged.
- Preserve `soldier.fbx`, its original archive/textures/license, and `player-commander-rigged.fbx`.
- Do not remove roster IDs, story roles, dialogue, gameplay behavior, or motion states.
- Delete old model outputs and their exclusive generation pipeline only after the shared replacement passes verification.
- Use one shared mesh/rig; character variety comes from source-detail-preserving texture palettes and existing roster scale metadata.

---

### Task 1: Audit Sources and Write the Replacement Contract

**Files:**
- Create: `tests/single-soldier-source-check.py`
- Inspect: `tools/raw-character/donor/russian-soldier/soldier.fbx`
- Inspect: `tools/raw-character/mixamo/player-commander-rigged.fbx`

- [ ] Assert both FBXs exist and the animation archive/extracted tree remain present.
- [ ] Import both FBXs in Blender and record mesh, material, texture, armature, bone, and action inventories.
- [ ] Fail if the soldier lacks clothing/equipment meshes or the Mixamo source lacks a humanoid armature.

### Task 2: Build and Verify the Shared Rigged Soldier

**Files:**
- Create: `tools/characters/build-shared-soldier.py`
- Create: `tests/verify-shared-soldier.py`
- Create: `assets/models/characters/core/soldier-base.glb`

- [ ] Write the GLB verifier first and confirm it fails while the output is absent.
- [ ] Import soldier geometry and Mixamo skeleton, align rest poses without changing bone hierarchy, bind clothing/equipment using automatic weights plus nearest-body correction, normalize to four influences, and export without actions.
- [ ] Verify finite geometry/weights, one armature, required equipment, source materials, and no animation actions.
- [ ] Render rest and stress-pose previews and reject detached/exploded geometry.

### Task 3: Generate Texture Variants

**Files:**
- Create: `tools/characters/build-character-texture-variants.py`
- Create: `assets/models/characters/textures/variants/*.png`
- Create: `assets/models/characters/textures/variants/manifest.json`
- Create: `tests/character-texture-variant-check.mjs`

- [ ] Extract and preserve the source diffuse textures.
- [ ] Generate distinct muted palettes for the 22 roster IDs while retaining luminance, fabric detail, dirt, skin, and equipment features.
- [ ] Verify every roster ID has a nonblank image with dimensions matching its source and a manifest entry.

### Task 4: Integrate the Shared Model and Variants

**Files:**
- Modify: `assets/models/characters/manifests/character-roster.json`
- Modify: `src/entities/character-manager.js` or the active character loader discovered by contract search.
- Modify: relevant roster/runtime contract tests.

- [ ] Point all 22 roster entries to `assets/models/characters/core/soldier-base.glb` and add an explicit texture-variant field.
- [ ] Clone materials per spawned character before swapping variant maps so instances do not recolor each other.
- [ ] Preserve existing body scale, states, IDs, dialogue, faction, and motion paths.
- [ ] Verify roster contracts and browser loading.

### Task 5: Remove the Superseded Model Pipeline

**Files:**
- Delete: five named-character GLBs plus `player-commander.glb` after integration passes.
- Delete: normalized wardrobe output and MakeHuman/wardrobe-only generation scripts, recipes, caches, previews, and exclusive tests.
- Preserve: soldier source/archive/textures/license, Mixamo FBX, Universal Animation Library archive/extraction, shared builder/verifier, runtime and roster files.

- [ ] Produce an exact tracked/untracked deletion list and verify every target is model-generation-specific.
- [ ] Delete only reviewed targets.
- [ ] Search for dangling references to deleted paths and replace or remove them.
- [ ] Run structural, roster, browser, and preservation checks; confirm the animation archive hash is unchanged.

