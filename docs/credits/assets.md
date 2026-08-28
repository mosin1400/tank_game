# Asset credits and provenance

This ledger records the source and transformation history of third-party assets
that ship in the game. Raw authoring files under `tools/raw-character/` are not
redistributed. A row marked **pending acquisition** is not a claim that the
asset has already been downloaded or included in the game.

| Shipped asset / input | Source | License / permission | Download date | Modifications | Status |
| --- | --- | --- | --- | --- | --- |
| Vardan male base mesh, Game Engine topology, male skin, long-sleeve shirt, trousers and shoes | MakeHuman Community 1.3.0 bundled/core assets only; <https://static.makehumancommunity.org/about/license.html> | CC0 | Pending acquisition | Adult-male proportions selected; exported in metres; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |
| `t-pose-with-skin.fbx` | Adobe Mixamo auto-rigger; <https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html> | Adobe Mixamo FAQ permission for use in video games | Pending acquisition | Auto-rigged from the CC0 MakeHuman FBX; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |
| `idle.fbx` → `idle` | Adobe Mixamo — Idle | Adobe Mixamo FAQ permission for use in video games | Pending acquisition | 30 FPS; without skin; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |
| `walking.fbx` → `walk` | Adobe Mixamo — Walking (exact library identifier pending) | Adobe Mixamo FAQ permission for use in video games | Pending acquisition | **In Place enabled**; 30 FPS; without skin; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |
| `running.fbx` → `run` | Adobe Mixamo — Running (exact library identifier pending) | Adobe Mixamo FAQ permission for use in video games | Pending acquisition | **In Place enabled**; 30 FPS; without skin; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |
| `pointing.fbx` → `point` | Adobe Mixamo — Pointing | Adobe Mixamo FAQ permission for use in video games | Pending acquisition | 30 FPS; without skin; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |
| `talking.fbx` → `radio` | Adobe Mixamo — Talking | Adobe Mixamo FAQ permission for use in video games | Pending acquisition | 30 FPS; without skin; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |
| `sitting-idle.fbx` → `driver-sit` | Adobe Mixamo — Sitting Idle | Adobe Mixamo FAQ permission for use in video games | Pending acquisition | 30 FPS; without skin; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |
| `standing-react-small-from-right.fbx` → `brace` | Adobe Mixamo — Standing React Small From Right | Adobe Mixamo FAQ permission for use in video games | Pending acquisition | 30 FPS; without skin; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |
| `binoculars` clip | Derived locally from the licensed `idle` Mixamo clip | Same permission as the source `idle` clip | Pending acquisition | Arm pose authored in Blender; retargeted, renamed, compressed, exported to GLB | **Pending acquisition** |

Before committing `assets/models/characters/vardan-men.glb`, replace every
pending date/status above with the actual acquisition date, confirm each
MakeHuman asset metadata says CC0, and retain the downloaded metadata/license
records outside Git with the raw source files. Also record the exact MakeHuman
asset identifiers, exact Mixamo library selections/settings, and the final
`vardan-men.glb` SHA-256 here:

- Final GLB SHA-256: **Pending build**
- Visual gate: **Pending** — inspect male appearance, deformation, garment
  intersections, grounded feet, 1.65–1.95 m height and forward **+Z** in both
  Blender and the game before changing this status or committing the GLB.

## Commander vertical-slice acquisition ledger

This section is the authoritative Task 2 inventory. Every **Pending UI
acquisition** value must be replaced from the actual MakeHuman or Mixamo UI;
the search labels below are instructions, not claims about downloaded assets.

### Locally verified MakeHuman core candidates

| Slot | Installed identifier / UUID | Local metadata evidence | License evidence | Selection status |
| --- | --- | --- | --- | --- |
| Topology | Candidate `male_generic`; `df01ef58-b37f-479e-9f97-b4c1b9626aa8` | `data/proxymeshes/male_generic/male_generic.mhpxy` | Embedded metadata reports `licenseCC0` | **Pending exact Game Engine UI confirmation** |
| Skin | `middleage_caucasian_male` | `data/skins/middleage_caucasian_male/middleage_caucasian_male.mhmat` | Header explicitly records CC0 release in September 2020 | **Verified local candidate; pending export** |
| Long-sleeve upper + trousers | `male_casualsuit05`; `02e8aa01-466f-4eb4-a375-e209cb4a77d8` | `data/clothes/male_casualsuit05/male_casualsuit05.mhpxy` | Embedded metadata reports `licenseCC0` | **Verified local candidate; pending export** |
| Shoes | `shoes03`; `ad622a26-da1e-4e3c-9f8e-454edf10d504` | `data/clothes/shoes03/shoes03.mhpxy` | Embedded metadata reports `licenseCC0` | **Verified local candidate; pending export** |

The installed `male_generic` proxy is not recorded as the final Game Engine
topology because its local metadata does not establish that UI label. The
recipe deliberately keeps that final identifier empty until it is inspected
in MakeHuman. MakeHuman core outputs are covered by the project’s published
[CC0 asset license](https://static.makehumancommunity.org/about/license.html).

### Exact Mixamo download inventory

| Raw filename | Intended Mixamo search / source | Required settings | Displayed title | Acquisition date | Status |
| --- | --- | --- | --- | --- | --- |
| `t-pose-with-skin.fbx` | Auto-rigger T-pose | FBX Binary; 30 FPS; **With Skin** | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `idle.fbx` | Idle | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `walking.fbx` | Walking | FBX Binary; 30 FPS; Without Skin; **In Place** | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `running.fbx` | Running | FBX Binary; 30 FPS; Without Skin; **In Place** | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `crouch-walking.fbx` | Crouch Walking | FBX Binary; 30 FPS; Without Skin; **In Place** | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `talking.fbx` | Talking | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `pointing.fbx` | Pointing | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `standing-react-small-from-right.fbx` | Standing React Small From Right | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `sitting-idle.fbx` | Sitting Idle | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `repairing.fbx` | Repairing | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `rifle-aiming-idle.fbx` | Rifle Aiming Idle | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `reloading.fbx` | Reloading | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `hit-reaction.fbx` | Hit Reaction | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |
| `falling-back-death.fbx` | Falling Back Death | FBX Binary; 30 FPS; Without Skin | Pending UI acquisition | Pending UI acquisition | **Pending UI acquisition** |

The Mixamo files remain outside Git and are not redistributed. Their game-use
permission is documented by the [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html).
`radio`, `binoculars`, and `hatch-idle` will be derived locally from the
licensed `talking.fbx` and `idle.fbx` inputs; they require no extra downloads.
