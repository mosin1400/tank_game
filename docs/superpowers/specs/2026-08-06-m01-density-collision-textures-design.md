# M01 Density, Collision and Texture Design

## Goal

Turn the opening operation into a dense authored industrial battlefield while keeping it browser-friendly, correcting rail alignment, and making every gameplay-significant prop collide at its visible footprint.

## Scene composition

The fuel yard, rail siding, canal route, watch hill and exit gate remain the five visual anchors. Empty space between them is filled with authored prop clusters: stacked drums and crates, pallets, pipe racks, cable spools, lamps, fences, sandbags, rubble, parked utility vehicles, damaged carts, road signs and burned vegetation. Small dressing objects remain non-blocking; objects large enough to stop a tank receive colliders.

## Rail contract

One rail transform defines the siding center, heading and length. Rails, sleepers and all wagons derive their position and yaw from that transform. Wagons use fixed offsets along the same local forward vector, so they cannot drift off the track or rotate independently.

## Collision contract

Scene colliders support circles, axis-aligned boxes and oriented boxes. Tank collision resolves against each collider's actual rotated local space, then transforms the correction back to world space. Fuel tanks, buildings, wagons, bridge edges, tower legs/base, generator, gate posts, large crate stacks and parked vehicles are blocking. Ground decals, grass, fire sprites, cables and individual small debris are not blocking.

## Materials

Two project-owned raster assets are added: a seamless muddy battlefield ground texture and a seamless worn olive tank-steel texture. Ground uses repeated color plus bump detail. Tank materials retain the four existing campaign tints while sharing the steel detail texture, preserving enemy recognition and avoiding one material per mesh.

## Human actors

M01 adds lightweight authored figures only: Marium near the lead truck, two convoy crew members, two depot workers and one enemy observer on the tower. They use articulated low-poly silhouettes with uniforms, heads, limbs and simple idle poses. Friendly/story figures are non-combatants; the observer is removed with the tower event and is never treated as an infantry enemy. Figures near the driving route have a small blocking circle; the tower observer does not.

## Performance and lifecycle

Repeated props share geometry/materials where practical. All objects and colliders belong to the active SceneBuilder handle and are removed on retry, mission change and return to the map. No external 3D asset or new runtime dependency is introduced in this pass.

## Acceptance criteria

- Every wagon center lies on the same rail centerline and shares the rail yaw.
- A tank cannot pass through wagons, tanks, depot buildings, generator, gate posts or major prop clusters.
- Rotated obstacles resolve collision at their visible orientation.
- The opening area reads as a working fuel-and-rail depot rather than an empty field.
- The ground and tanks visibly use the new textures while existing faction tints remain distinct.
- Story characters and the tower observer appear without introducing hostile infantry combat.
