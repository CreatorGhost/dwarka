# Environment and prop alignment standard

Updated 2026-09-02. This note uses primary sources only: Khronos specifications and tools, PlayCanvas documentation/API, Blender documentation, and the asset creator's own pack pages.

## Decision

Treat every reusable environment object as a small prefab with an explicit placement contract, not as a GLB plus hand-entered coordinates. The contract has four independently inspectable parts:

1. a normalized visual root;
2. a semantic contact point and facing direction;
3. one or more collision proxies;
4. placement data shared by rendering, server collision, navigation, and QA.

That is the durable fix for carts, stalls, stairs, pots, or other road objects that float, sink, face the wrong way, or block a different area from the one they visibly occupy.

## Canonical coordinate and scale contract

- **Unit:** one scene unit is one metre. This matches both glTF, where global mesh positions are measured in metres, and PlayCanvas, which generally treats one unit as one metre. Sources: [Khronos glTF 2.0, coordinate system and units](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units), [PlayCanvas model units](https://developer.playcanvas.com/user-manual/assets/models/units/).
- **Up:** positive Y. glTF is right-handed and defines +Y as up. PlayCanvas also defines `(0, 1, 0)` as world up. Sources: [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units), [PlayCanvas entity transforms](https://developer.playcanvas.com/tutorials/manipulating-entities/).
- **Facing:** store a semantic `front` marker instead of guessing from mesh bounds. glTF calls +Z the front of an asset, while PlayCanvas defines an entity's `forward` as its local **negative** Z axis. A reusable visual adapter therefore needs to own any required 180-degree correction exactly once. Sources: [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units), [PlayCanvas Entity API](https://api.playcanvas.com/engine/classes/Entity.html#forward).
- **Transform:** exported static prop roots must have zero rotation, uniform unit scale `(1, 1, 1)`, and no negative or zero scale. Blender's Apply operation transfers rotation/scale into object data and resets those object transforms; glTF explicitly warns that non-invertible transforms can cause lighting or visibility artifacts. Sources: [Blender Apply](https://docs.blender.org/manual/en/latest/scene_layout/object/editing/apply.html), [glTF node transformations](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#transformations).
- **Origin:** place a ground prop's origin at its authored support/contact point, normally bottom-centre of its load-bearing footprint. Use other semantic origins when necessary: a door hinge, wheel axle, or hanging hook. Blender documents that the origin controls object translation, rotation, and scale and can be placed independently of geometry. Source: [Blender Object Origin](https://docs.blender.org/manual/en/latest/scene_layout/object/origin.html).
- **Modular grid:** record each module's intended grid size and snap step in metres. Quaternius says the Medieval Village MegaKit is grid-based and its pieces are designed to snap together; arbitrary scale should not be used to make adjacent modules meet. Source: [Quaternius Medieval Village MegaKit](https://quaternius.com/packs/medievalvillagemegakit.html).

The runtime prefab hierarchy should be:

```text
PropRoot                    placement position/yaw; scale always 1
├── VisualAdapter           one import-axis correction, then immutable
│   └── ImportedGLB
├── ContactMarkers          ground/hinge/axle metadata; not rendered
└── Collision               primitive or compound child shapes
```

The gameplay object faces PlayCanvas `-Z`; the imported visual adapter accounts for the glTF `+Z` front convention. Collision children are authored in `PropRoot` space, so they cannot drift when a visual asset is swapped.

## Normalization and import pipeline

For each source model:

1. Import the original glTF/GLB into a clean Blender scene using Y-up export conventions. Blender's glTF exporter exposes a Y Up option specifically for the glTF convention. Source: [Blender glTF import/export](https://docs.blender.org/manual/en/3.6/addons/import_export/scene_gltf2.html).
2. Set scene units to metric at scale 1.0. Measure the model against a known one-metre reference and assign a category (`architecture`, `vehicle`, `furniture`, `container`, `small-prop`, `vertical-decoration`). PlayCanvas recommends authoring against the desired scale rather than fixing it after import. Source: [PlayCanvas model units](https://developer.playcanvas.com/user-manual/assets/models/units/).
3. Establish the semantic front and ground/support contact markers. Move geometry relative to the origin so a grounded prop's load-bearing contact plane is at local `y = 0`; do not use the centre of a tall bounding box as the ground anchor.
4. Apply rotation and scale before export. Retain a deliberate non-zero location only inside a named visual adapter; do not leave undocumented transforms on the GLB root.
5. Export a self-contained GLB and run the official Khronos validator. It checks GLB structure, schemas, references, accessor bounds, invalid numeric values, images, animations, and supported extensions and returns non-zero for errors. Source: [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator).
6. Write a manifest entry containing source checksum, output checksum, dimensions, contact markers, semantic front correction, intended grid, collider proxies, material family, LOD family, and licence/source.
7. Render standard front, side, top, and three-quarter thumbnails with a one-metre reference and collision overlay. These images are review artifacts, not optional marketing renders.

Do not silently correct arbitrary source mistakes at placement time. A runtime correction that refuses offsets beyond a threshold should produce a failed validation result and asset name, not quietly leave the object floating or buried.

## Ground placement

### Flat street or floor

With a normalized bottom-contact origin, placement is simply `PropRoot.y = surfaceY`. Reapplying the operation must be idempotent: a second snap cannot move the prop.

### Uneven ground

Cast a ray downward from above the intended X/Z position to the authoritative walkable surface. PlayCanvas documents downward ray casts as a way to determine ground contact. Source: [PlayCanvas ray casting](https://developer.playcanvas.com/user-manual/physics/ray-casting/).

- Snap the authored contact marker, not the visual AABB centre, to the hit position.
- Keep furniture, walls, wagons, stalls, and characters upright. Only small debris or vegetation may align to the hit normal, and then only under an authored tilt cap.
- For multiple support points, solve height from all contacts: for a wagon use both wheel tracks; for a four-legged table use its feet. Reject placements whose support-point height spread exceeds the object's allowed terrain tolerance.
- Raycast against a dedicated `WalkableGround` layer/filter so a prop cannot snap onto another prop, an awning, or a roof.
- Treat “no ground hit,” a correction beyond tolerance, and a slope beyond tolerance as placement errors.

Blender's face snapping can align objects to surfaces during authored layout, including optional rotation alignment, but final game validation must still use the same world data the runtime will use. Source: [Blender snapping](https://docs.blender.org/manual/en/2.80/scene_layout/object/editing/transform/control/snap.html).

## Collision generation

The collision shape must express gameplay intent, not trace every decorative triangle.

- Use boxes, spheres, capsules, cylinders, and cones wherever they reasonably fit. PlayCanvas states that primitive shapes are cheaper than mesh shapes. Source: [PlayCanvas collision and triggers](https://developer.playcanvas.com/tutorials/collision-and-triggers/).
- Use a compound shape for a wagon, stall, stairs, or furniture whose blocking mass cannot be represented by one primitive. In PlayCanvas, descendant primitive shapes form the compound; its parent is the centre of mass, which should remain inside the shape to avoid odd force/torque behaviour. Source: [PlayCanvas compound shapes](https://developer.playcanvas.com/user-manual/physics/compound-shapes/).
- Use a concave triangle-mesh collider only for static or kinematic geometry. PlayCanvas documents that non-convex mesh collision does not work for a dynamic rigid body; convex hulls are the more efficient dynamic option. Source: [PlayCanvas Collision component](https://developer.playcanvas.com/user-manual/editor/scenes/components/collision/).
- A rigid body has no physical effect without a collision component. A collision component without a rigid body is a trigger rather than a blocker. Source: [PlayCanvas Rigid Body component](https://developer.playcanvas.com/user-manual/editor/scenes/components/rigidbody/).
- The Quaternius Standard archives used here do not include the Source-version collision implementation. Quaternius says the Medieval Village Source version contains custom optimized collisions and the Fantasy Props Source/Pro versions contain custom simple collisions. Therefore this project must author equivalent simple proxies or deliberately acquire those versions; it must not assume the downloaded Standard GLBs contain collision. Sources: [Medieval Village MegaKit](https://quaternius.com/packs/medievalvillagemegakit.html), [Fantasy Props MegaKit](https://quaternius.com/packs/fantasypropsmegakit.html).

For an authoritative two-dimensional server simulation, generate the server footprints from the same prefab collision proxies and placement transform used by the renderer. Do not maintain a hand-copied second list. Preserve stable collider IDs so test failures name the real prop.

## Visual-versus-physics audit

PlayCanvas's Editor Physics view displays collision and trigger volumes. Use it during asset review, and give the browser build an equivalent F3 overlay for the custom server footprints. Source: [PlayCanvas collision and triggers](https://developer.playcanvas.com/tutorials/collision-and-triggers/).

Every blocking prop must pass these views:

- **Top:** collider covers the intended blocking footprint after yaw and scale.
- **Front and side:** collider starts at the walkable surface and does not form an invisible wall above/beside decorative open space.
- **Player sweep:** a player-radius circle/capsule is swept toward every major side and corner at walk and sprint speed.
- **Line of sight:** arrows and AI sight use the same intended occluding mass, or an explicitly different named proxy.
- **Navigation:** the remaining road width is visibly traversable and at least `2 × playerRadius + 0.10 m` for a one-character passage.

Acceptance tolerances for this stylized project:

| Check | Gate |
|---|---:|
| Ground contact | every support marker within 0.02 m of its surface |
| Upright prop tilt | up-vector dot world-up at least 0.999 unless authored otherwise |
| Export root scale | each component within 0.0001 of 1.0 |
| Export root rotation | identity within 0.01 degrees |
| Blocking visual coverage | at least 95% of authored blocking footprint covered |
| Excess invisible blocking | no more than 0.15 m beyond the authored footprint, except labelled safety margins |
| Route clearance | player-radius sweep plus 0.05 m per side |
| Tunnelling | zero crossings through any blocking proxy at maximum sprint step and simulated latency budget |
| Snap stability | second snap changes position by less than 0.001 m |

Decorative shafts, cloth, handles, or foliage may intentionally be non-blocking, but the prefab must label them. A single full-mesh AABB is not an acceptable substitute for deciding which parts should block.

## Batching, instancing, LOD, and lighting

- Use PlayCanvas static batch groups for non-moving environment pieces that share a material. The engine's primary batching rule is common material; a reasonable maximum AABB keeps batches small enough for useful culling. Static groups use fewer runtime resources than dynamic groups. Source: [PlayCanvas batching](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/batching/).
- Use hardware instancing for many copies of an identical mesh, but divide instances into spatial cells because PlayCanvas notes that hardware-instanced members are submitted without per-instance frustum culling. Source: [PlayCanvas hardware instancing](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/).
- Author LOD families only where profiling justifies them. Use a stable pivot, material family, silhouette, and collision proxy across every level; switch only the render mesh. Collision must never change when LOD changes.
- Choose batching or runtime lightmaps deliberately. PlayCanvas says runtime lightmaps are low-cost for static geometry but are not compatible with batching because each lightmapped object needs a unique lightmap texture. Sources: [PlayCanvas lighting](https://developer.playcanvas.com/user-manual/graphics/lighting/), [PlayCanvas runtime lightmaps](https://developer.playcanvas.com/user-manual/graphics/lighting/runtime-lightmaps/).
- Keep texel density consistent and lightmap UVs non-overlapping. Source: [PlayCanvas lightmapping](https://developer.playcanvas.com/user-manual/graphics/lighting/lightmapping/).
- Use one consistent environment/key-light setup and a limited number of local lights. Clustered lighting makes nearby omni and spot lights more scalable, but directional lights affect every object and do not use clustering. Source: [PlayCanvas clustered lighting](https://developer.playcanvas.com/user-manual/graphics/lighting/clustered-lighting/).
- Preserve shared texture/material families. The Fantasy Props pack was intentionally authored with all 200 models using four texture sets; exporting every prop with separately embedded copies loses much of that reuse at download/memory/material identity level. Source: [Quaternius Fantasy Props MegaKit](https://quaternius.com/packs/fantasypropsmegakit.html).

## Automated validation gates

Run these in CI for every environment import or layout change:

### Asset gate

- [ ] Official glTF Validator reports zero errors; warnings are either zero or explicitly allowlisted with a reason.
- [ ] All node TRS numbers are finite; no zero/negative scale.
- [ ] Static placeable root has identity rotation and unit scale.
- [ ] World dimensions fit the declared category range.
- [ ] Ground, hinge, axle, and front markers exist as required by category.
- [ ] Ground marker is at local `y = 0 ± 0.01 m`.
- [ ] Every collider proxy has a stable ID, supported shape, finite dimensions, and positive volume.
- [ ] Source, licence, source checksum, output checksum, material family, and texture budget are recorded.

### Layout gate

- [ ] Placement record references an existing normalized asset and approved scale variant.
- [ ] Ground ray finds exactly the intended walkable surface.
- [ ] Every support marker satisfies the 0.02 m contact tolerance.
- [ ] Upright props satisfy the tilt gate.
- [ ] No prop starts intersecting the player, an encounter spawn, or another blocking prop unless explicitly allowed.
- [ ] Render and server colliders are generated from the same placement record and hashes match.
- [ ] Every mission route has a successful player-radius path between checkpoints.
- [ ] No collider blocks a doorway, objective marker, interaction point, or required camera line.

### Runtime gate

- [ ] Debug overlay can show visual bounds, contact points, server collision, and line-of-sight blockers together.
- [ ] Walk and sprint sweeps hit each side/corner without penetration or tunnelling.
- [ ] Sliding along a long wall and around a cart/stall corner remains stable.
- [ ] Ground snap is idempotent across two scene rebuilds.
- [ ] LOD switches do not move the object, pop collision, or change shadow grounding.
- [ ] Static batching/instancing is applied after asynchronous models exist, and draw-call savings are measured.
- [ ] Standard front/side/top screenshots and a visible end-to-end browser run are retained as artifacts.

## DWARKA-specific audit findings

These are read-only observations from the current repository, not general claims from the external sources above.

1. [`chapter-1.js`](../../game/client-scripts/chapter-1.js) keeps visual placements in `ENVIRONMENT_PLACEMENTS` and a separate `WORLD_COLLIDERS` array, while [`collision.ts`](../../game/server/src/chapter-1/collision.ts) keeps another server collider list. The values currently resemble one another but are not generated from a shared source.
2. Runtime `alignEnvironmentModelToStreet` uses the rendered world AABB minimum and silently skips a correction over 0.35 m. It is only called for a hard-coded subset of model names. This is a repair heuristic, not an asset contract, and it cannot identify the correct support points for wheels or feet.
3. The current `Crate_Wooden.glb` root stores scale `(0.78, 0.78, 0.78)` while most inspected prop roots are unit scale. The runtime then applies another placement scale, so the library is not normalized consistently.
4. Using the GLB `POSITION` bounds and current placement transforms, the courtyard wagon's conservative visual X/Z AABB is approximately `[0.73, 3.67] × [-0.22, 3.63]`, but its server collider is `[0.72, 3.25] × [-0.22, 2.85]`. The burned wagon is approximately `[-7.60, -4.49] × [-28.49, -24.64]`, but its server collider is `[-7.15, -4.48] × [-28.50, -25.35]`. These under-covered ends/corners explain how the player can visually enter part of a cart. A named compound collision proxy is better than expanding a coarse full AABB indiscriminately.
5. `batchStaticEnvironment()` runs before `loadApprovedAssets()` starts asynchronous GLB loading. The later imported render components are not assigned the batch group in `placeEnvironmentFor`, so the imported environment does not receive the same batching treatment as geometry present at scene construction.
6. The import script emits one self-contained GLB per prop, each with embedded images. That is safe for isolated delivery but duplicates texture payloads/material instances across assets even though the source Fantasy Props kit is designed around four shared texture sets.

## Implementation order

1. **P0 — one layout manifest:** move placements and collision proxies into one data file and generate both client and server representations.
2. **P0 — normalized prop library:** rebuild the currently used wagon, stall, stairs, barrels, crates, bench, fence, vases, and pots with semantic origins, unit roots, contact markers, and recorded dimensions.
3. **P0 — compound colliders:** replace cart/stall/stair full AABBs with authored primitive compounds; add collision-overlay QA.
4. **P0 — visible movement sweeps:** test the exact roadway props at walking and sprinting speeds from all sides and corners.
5. **P1 — load-aware batching/material reuse:** assign batches after models load or pre-register compatible assets, and preserve shared material/texture resources.
6. **P1 — LOD only after profiling:** add render-only LODs for repeated high-cost pieces without touching placement or collision.
7. **P1 — lighting consistency pass:** select either batch-oriented dynamic/environment lighting or a deliberate lightmap route, then validate every prop under one shared exposure and tone-mapping setup.

This order fixes visible placement and player trust first, then optimizes the stable result.
