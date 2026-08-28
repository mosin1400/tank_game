# Single Soldier Character Pipeline Design

## Decision

Replace the previous generated-character and fitted-wardrobe pipeline with one licensed, fully equipped soldier mesh from `tools/raw-character/donor/russian-soldier/soldier.fbx`. Bind that mesh to the exact Mixamo humanoid skeleton from `tools/raw-character/mixamo/player-commander-rigged.fbx`, export one shared game-ready GLB, and give roster entries distinct appearances through texture/material variants and their existing body-scale values.

## Preserved Inputs

- Keep `Universal Animation Library[Standard].zip` and the extracted Quaternius animation source tree unchanged.
- Keep the Russian soldier source archive, its extracted `soldier.fbx`, textures, and license/attribution record.
- Keep the Mixamo auto-rigged FBX as the authoritative skeleton source.
- Keep the 22-character roster IDs, story roles, dialogue data, motion states, and gameplay behavior.

## Output Architecture

- `assets/models/characters/core/soldier-base.glb` is the only character geometry asset used by the roster.
- The GLB contains the downloaded body, clothing, and equipment meshes, one Mixamo armature, normalized weights limited to four influences, and no embedded actions.
- `assets/models/characters/textures/variants/` contains recolored diffuse textures. Variants preserve the source texture detail and change only controlled uniform/equipment palettes.
- The roster selects a texture variant per character while continuing to use its existing scale and metadata for silhouette variation.
- The animation library remains separate and is retargeted to the shared Mixamo skeleton in the subsequent motion step.

## Removal Scope

After the new GLB passes structural and rendered checks, remove the six previous core GLBs, the normalized wardrobe GLB, MakeHuman caches/sources/recipes, old character builders, wardrobe fitters, donor-normalization scripts, and tests that exclusively validate the deleted pipeline. Do not remove the Russian soldier source, Mixamo FBX, animation archive/extraction, license record, generic preview utilities that remain useful, roster/story files, or runtime animation code.

## Validation

- Verify the shared GLB has one armature, deforming skinned meshes, finite weights, at most four influences, clothing/equipment geometry, and no actions.
- Render rest and stress-pose previews to catch exploded limbs, detached equipment, missing textures, or bad scale.
- Verify every roster entry points to `soldier-base.glb` and a valid texture variant.
- Load the game over HTTP and confirm characters appear with the new model, distinct palettes, and no console errors.

