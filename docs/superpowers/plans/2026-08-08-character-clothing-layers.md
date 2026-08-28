# Character clothing layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every game character a persistent base garment and role-appropriate clothing without multiplying asset size.

**Architecture:** Blender bakes three garment layers into the six authored main GLBs. A focused runtime wardrobe module later constructs the equivalent lightweight layers for the sixteen secondary roles from roster appearance data and never changes the cloned body mesh.

**Tech Stack:** Blender 4.2 Python, Three.js r160, browser JavaScript, Node contract checks.

## Global Constraints

- All 22 roles are male and must never show an unclothed body.
- No real-world political or military symbols.
- Main roles keep individual GLBs; secondary roles reuse the real player rig.
- No primitive human fallback; modular primitives are clothing only.
- Do not alter unrelated dirty working-tree changes.

---

### Task 1: Bake base garments into the authored cast

**Files:**
- Modify: `tools/characters/build-rigged-character-cast.py`
- Modify: `tests/verify-rigged-glbs.py`

- [ ] Write a test asserting an imported main GLB has `outfit_undershirt`, eight or more clothing meshes, and bone parenting.
- [ ] Run Blender verifier and observe failure because the base layer is absent.
- [ ] Add a cloth-coloured `outfit_undershirt` geometry piece attached to `Spine2` in the cast builder.
- [ ] Rebuild six GLBs with Blender 4.2.
- [ ] Run `blender.exe --background --python tests/verify-rigged-glbs.py` and commit the builder, GLBs and verifier.

### Task 2: Add the shared secondary wardrobe

**Files:**
- Create: `src/entities/character-wardrobe.js`
- Modify: `src/boot.js`
- Create: `tests/character-wardrobe-check.mjs`

- [ ] Write a fake-Three test requiring `CharacterWardrobe.createLayers(THREE, entry, armature)` to return `undershirt`, `uniform` and optional kit meshes without editing `entry`.
- [ ] Run the Node test and observe it fail because `CharacterWardrobe` does not exist.
- [ ] Implement only the material, mesh and Mixamo-bone attachment helpers required by the test; use the roster outfit/accent data.
- [ ] Add the module after `character-roster.js` in boot order.
- [ ] Re-run the wardrobe and roster contract checks; commit the runtime module and test.

### Task 3: Verify the full wardrobe contract

**Files:**
- Modify: `tests/character-roster-contract-check.mjs`
- Modify: `docs/superpowers/specs/2026-08-08-character-clothing-layers-design.md`

- [ ] Add a failing roster assertion that every role has a non-empty `appearance.outfit` and gear array.
- [ ] Run the roster test and confirm the expected failure if the contract is temporarily absent.
- [ ] Keep the existing roster data only if it satisfies the test; otherwise correct its exact missing entry.
- [ ] Run the Blender verifier, wardrobe test and roster test together; record the exact results in the spec.
- [ ] Commit the final contract update.
