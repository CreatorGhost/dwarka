# Rapid 3D browser-game workflow research

Updated 2026-09-02. This note uses first-party documentation and source repositories only.

## Bottom line

A useful-looking 3D browser-game prototype can be assembled in one to two hours when most of its hard parts already exist: a proven controller, a coherent asset kit, a compatible rig and animation set, reusable scene prefabs, and a tiny gameplay loop. The fast result comes from selecting and connecting these parts. It does not come from generating production-ready characters, animations, collision, combat, level art, audio, localization, and browser QA from one prompt.

PlayCanvas supports exactly this assembly model. A project can start from a starter kit or a forked project, imported models become ready-to-place templates, and templates propagate edits across every instance. Its current Editor MCP server also lets an AI assistant inspect and modify scenes, components, scripts, assets, templates, animation data, and project settings, then launch the result and inspect runtime state. Sources: [creating PlayCanvas projects](https://developer.playcanvas.com/user-manual/editor/projects/creating/), [templates](https://developer.playcanvas.com/user-manual/editor/templates/), [Editor MCP server](https://developer.playcanvas.com/user-manual/editor/mcp-server/).

The honest quality ceiling for a two-hour pass is a polished vertical slice with one coherent location and one dependable interaction loop. It is not an original, content-rich game. A good fast prototype may look professional in a short capture because it has disciplined camera framing, lighting, animation blending, sound, and art direction. It will still depend on stock assets and a small set of tested paths.

## What fast teams reuse

1. **A running project instead of a blank scene.** PlayCanvas explicitly supports both starter kits and forking an existing project. Its official third-person controller tutorial provides an already working camera, input, and physics example. Starting there avoids spending the first hour rediscovering input signs, pointer lock, ground contact, and camera hierarchy. Sources: [project creation](https://developer.playcanvas.com/user-manual/editor/projects/creating/), [third-person controller](https://developer.playcanvas.com/tutorials/third-person-controller/), [official engine examples](https://playcanvas.github.io/).

2. **One modular visual kit.** A matching set of buildings, props, surfaces, and vegetation produces a more convincing result than individually generated assets with mismatched scale and material language. The PlayCanvas Asset Store includes models, scripts, skyboxes, templates, and textures, with author and licence data shown before import. Kenney publishes CC0 packs, including 100-file fantasy and modular-building sets. Sources: [PlayCanvas Asset Store](https://developer.playcanvas.com/user-manual/editor/assets/asset-store/), [Kenney licence policy](https://kenney.nl/support), [Kenney Retro Fantasy Kit](https://www.kenney.nl/assets/retro-fantasy-kit), [Kenney Modular Buildings](https://kenney.nl/assets/modular-buildings).

3. **A single canonical humanoid rig.** Adobe says Mixamo's auto-rigger targets bipedal humanoids in a neutral pose, centered at the origin, with a connected and clean mesh. It explicitly warns that separated parts such as floating heads and large props can fail. Fast teams choose one compatible skeleton, download every needed motion for that skeleton, and keep local copies. They do not retarget a new character in the middle of scene assembly. Source: [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html).

4. **GLB as the delivery contract.** PlayCanvas recommends GLB because it preserves hierarchy, materials, skins, animations, morph targets, cameras, lights, and compression features. Import can also create a reusable hierarchy template. Model pivots and scale are not normalized automatically, so every asset still needs a placement check. Sources: [building models for PlayCanvas](https://developer.playcanvas.com/user-manual/assets/models/building/), [asset import pipeline](https://developer.playcanvas.com/user-manual/editor/assets/import-pipeline/), [loading GLB models](https://developer.playcanvas.com/user-manual/web-components/loading-models/).

5. **Reusable gameplay prefabs.** A crate, enemy, projectile, market stall, or encounter marker should be one template with visual children, collision, scripts, and sockets. Editing the template then updates every instance. This is the fastest reliable way to make a dense scene without accumulating one-off transforms. Source: [PlayCanvas templates](https://developer.playcanvas.com/user-manual/editor/templates/).

## A realistic two-hour production recipe

| Time | Work | Exit condition |
|---|---|---|
| 0 to 10 minutes | Fork the known-good controller project. Make a checkpoint. Lock the camera style, one location, one objective, and one combat loop. | Character can move and look around in a grey-box scene. |
| 10 to 30 minutes | Import one modular environment pack and one character GLB. Set a shared scale convention. Turn repeated scene pieces into templates. | The route reads clearly and every placed object touches the ground. |
| 30 to 50 minutes | Add idle, walk, run, and one action animation to a reusable state graph. Drive locomotion from actual movement speed. | No foot sliding at walk or run speed; transitions do not pop. |
| 50 to 70 minutes | Add one enemy template, one hit reaction, a health rule, and one completion trigger. Use simple primitive collision. | The short loop can be completed and restarted. |
| 70 to 90 minutes | Apply one lighting setup, shadows on key actors, fog or environment depth, and conservative tone mapping. Add a small number of landmark props. | The player, route, objective, and enemies separate visually at a glance. |
| 90 to 110 minutes | Run visible keyboard and mouse scenarios. Test movement at several camera headings, diagonals, sprint transitions, camera pitch limits, walls, corners, stairs, and prop obstacles. | No reversed input, tunnelling, buried assets, camera flips, or stuck animation states. |
| 110 to 120 minutes | Record a clean run, inspect runtime logs and frame rate, save evidence, and checkpoint. | Repeatable start-to-finish path with no console errors and stable frame rate. |

That schedule only works if the controller, art kit, character rig, animations, and core game rule already exist. If one of those inputs is missing, the two-hour target must shrink or the work must continue beyond two hours.

## Animation and movement setup that survives reuse

Use a shared animation state graph with parameters such as planar speed, grounded, aiming, attack trigger, and dodge trigger. PlayCanvas designed one graph to drive multiple humanoid entities while each entity supplies its own clips. Its layers and masks also allow locomotion on the lower body while an aiming or weapon action drives the upper body. Sources: [animation overview](https://developer.playcanvas.com/user-manual/animation/), [animation state graphs](https://developer.playcanvas.com/user-manual/animation/anim-state-graph-assets/), [animation layer masks](https://developer.playcanvas.com/user-manual/animation/anim-layer-masking/).

For a reusable controller, the game state must own movement and the animation must describe it. Measure the distance covered by one walk and run cycle, then tune clip speed against the controller's metres per second. Blend using measured planar velocity rather than a key-down flag. This prevents a run animation while blocked by a wall and prevents idle frames while the character still slides.

The camera should derive movement directions from yaw only. Pitch must not change the ground-plane forward vector. Mouse delta should be scaled once, yaw and pitch should use separate limits, and camera collision should shorten the boom before a wall reaches the near clip plane. These details are not solved by an attractive character asset.

## Scene assembly rules

Every placeable asset needs a tiny contract before it enters the library:

- Unit scale and up axis are known.
- The pivot is at the logical contact point or the prefab contains a documented placement offset.
- Visual bounds and collision bounds are inspected together.
- A ground-contact check rejects floating and buried placements.
- Static scenery uses the cheapest primitive or compound collider that fits. PlayCanvas notes that primitive shapes cost less than mesh collision and provides a Physics viewport mode for inspecting volumes. Source: [collision and triggers](https://developer.playcanvas.com/tutorials/collision-and-triggers/).
- Character and weapon sockets have stable names. Weapons attach to skeleton nodes, never to a camera-space guess.
- The source, author, licence, and local file are recorded before use.

The "carrot on the road" problem is therefore a placement-pipeline failure, not a cosmetic issue. A prop should snap to a ground hit using its lowest visual bound or authored contact marker. It should inherit the surface normal only within a safe tilt limit. A road object that blocks movement needs collision; decoration that should not block uses no collider or a trigger. The rule belongs in the prefab or placement tool so it fixes every instance.

## Fast visual polish that pays off

Use a single environment light, one directional key light, restrained fog, and a consistent tone mapper before adding more lamps. PlayCanvas recommends ACES or Neutral as starting points for HDR scenes. Shadows add grounding, but resolution, filtering, distance, and cascades all have GPU costs. Static environments can use lightmaps when there is time to bake and inspect them. Sources: [tone mapping and exposure](https://developer.playcanvas.com/user-manual/graphics/cameras/tone-mapping/), [shadows](https://developer.playcanvas.com/user-manual/graphics/lighting/shadows/), [lightmapping](https://developer.playcanvas.com/user-manual/graphics/lighting/lightmapping/).

Do not use post-processing to disguise weak composition. PlayCanvas offers bloom, SSAO, TAA, grading, vignette, and other effects, but each should solve a visible problem. A readable silhouette, grounded shadow, consistent palette, and clear objective marker matter more in a short game than a large effects stack. Source: [PlayCanvas post effects](https://developer.playcanvas.com/user-manual/graphics/posteffects/).

For web delivery, import models as GLB, compress meshes deliberately, use Basis for suitable textures, batch compatible static geometry, and preload only assets needed immediately. PlayCanvas gives a rough low-end-mobile target of 100 to 200 draw calls and warns that per-frame allocations can cause garbage-collection pauses. Sources: [optimization guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/), [texture compression](https://developer.playcanvas.com/user-manual/optimization/texture-compression/), [preloading](https://developer.playcanvas.com/user-manual/assets/preloading/).

## QA is part of the one-shot workflow

An AI-assisted pass should end in the launched game, not in source code. PlayCanvas's MCP guidance says to capture the Editor viewport, start the app, capture the running view, read logs and entity state, inject real keyboard and mouse input, and stop the launch after verification. Source: [PlayCanvas Editor MCP server](https://developer.playcanvas.com/user-manual/editor/mcp-server/).

For canvas games, browser automation must use actual keyboard and mouse input plus visible screenshots. Playwright provides coordinate-based mouse tools for canvas content, recorded traces with screenshots and network activity, and code generation for ordinary UI flows. Sources: [Playwright keyboard and mouse tools](https://playwright.dev/mcp/tools/keyboard-mouse), [Playwright tracing](https://playwright.dev/docs/api/class-tracing), [Playwright test generator](https://playwright.dev/docs/codegen).

The minimum visible matrix for a third-person slice is:

- W, S, A, and D at camera yaw 0, 90, 180, and 270 degrees.
- Walk, sprint, stop, reverse, diagonal movement, and rapid alternation.
- Constant mouse motion, tiny mouse motion, vertical limits, and pointer-lock loss and recovery.
- Wall approach, diagonal corner contact, a thin obstacle at sprint speed, stairs or curbs, and decorative road props.
- Idle to walk to run blends, action during movement, hit reaction, death, checkpoint reset, and replay.
- The lowest supported viewport and a representative desktop viewport.
- Runtime logs, asset-load failures, frame rate, draw calls, and a complete start-to-finish recording.

Validate imported GLBs before they reach the scene. Khronos's official validator checks the GLB container, internal references, binary accessors, animation data, images, and supported extensions, and emits machine-readable reports. Source: [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator).

## What AI should and should not do

AI is useful for scene duplication, prefab wiring, script glue, parameter sweeps, asset inventory, test generation, and repeated browser checks. PlayCanvas now exposes those operations through its Editor MCP server, while its VS Code integration supports reviewed pull and push batches for scripts. Sources: [Editor MCP server](https://developer.playcanvas.com/user-manual/editor/mcp-server/), [PlayCanvas VS Code extension](https://developer.playcanvas.com/user-manual/editor/scripting/vscode-extension/).

AI should not silently choose unrelated art packs, change the skeleton, invent attachment offsets per frame, or declare success from a screenshot. Those choices create the exact failures seen in rushed prototypes: floating body parts, weapons glued to hands, props sunk into roads, reversed movement, foot sliding, and collision tunnelling.

## Recommended standard for Dwarka

Dwarka should copy the fast pipeline, not the misleading "one prompt" claim:

1. Keep one canonical humanoid skeleton and reusable locomotion/combat state graph.
2. Keep one approved ancient-environment kit with scale, pivot, collision, source, and licence metadata.
3. Convert every repeated actor, prop family, encounter, and marker into a tested prefab.
4. Put ground snapping and collider generation in the placement pipeline.
5. Maintain a permanent visible movement, camera, collision, equipment, and full-chapter regression suite.
6. Let an AI agent assemble a chapter only from those approved parts, then require an actual browser playthrough before completion.

Once that library exists, a new compact mission can plausibly reach a useful first playable in one to two hours. Building the library itself is production work and should be treated with much stricter review.
