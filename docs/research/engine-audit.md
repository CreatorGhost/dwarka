# Engine audit for the DWARKA browser demo

Date: 2026-09-01. Scope: a self-hosted, 48 to 72 hour, third-person 3D action demo embedded in the existing website. Facts below come from the repository or linked primary sources. Timing and performance thresholds are engineering estimates.

> **Decision update, 2026-09-02:** the budget is now strictly $0, the target is a 1080p laptop with keyboard and mouse, and the choice is limited to PlayCanvas and React Three Fiber. The finalized choice is **PlayCanvas Free with a public Editor project**. The earlier conditional R3F recommendation below is retained as research history and is superseded by this decision.

## Earlier conditional recommendation

The text below records the earlier React Three Fiber test plan. Do not execute it for the current build. PlayCanvas Free is the final decision.

The earlier proposal was to use React Three Fiber, drei, react-three-rapier, and ecctrl only after a four-hour proof passed. It fit the existing React site and could run in a client-only route. PlayCanvas was the prepared fallback. Godot was not a sensible mid-hackathon switch.

The recommendation is conditional because `ecctrl@2.0.1` requires React and React DOM `>=19.2.7`, while this repository pins React, React DOM, and React Server DOM to `19.2.6`. The current React release is `19.2.8` ([ecctrl](https://www.npmjs.com/package/ecctrl), [React](https://www.npmjs.com/package/react?activeTab=versions)). The first proof step is a coordinated React patch upgrade and production build.

## Finalists

| Finalist | Current release | Assessment |
| --- | --- | --- |
| R3F stack | Three `0.185.1`, R3F `9.7.0`, drei `10.7.8`, react-three-rapier `2.2.0`, ecctrl `2.0.1` ([Three](https://www.npmjs.com/package/three?activeTab=versions), [R3F](https://www.npmjs.com/package/%40react-three/fiber?activeTab=versions), [drei](https://www.npmjs.com/package/%40react-three/drei?activeTab=versions), [Rapier](https://www.npmjs.com/package/%40react-three/rapier?activeTab=versions)) | Best codebase fit. Cross-package compatibility and ecctrl's new major version are the schedule risks. |
| PlayCanvas | Engine `2.21.4`; optional React renderer `0.11.5` ([engine](https://www.npmjs.com/package/playcanvas?activeTab=versions), [React renderer](https://www.npmjs.com/package/%40playcanvas/react?activeTab=versions)) | Mature browser engine and visual editor. Use an Editor export or stable engine for rescue, not the `0.x` React renderer. |
| Godot Web | `4.7.2-stable`, released 2026-08-18 ([archive](https://godotengine.org/download/archive/)) | Maintained, but its editor, GDScript, export, and website bridge create too much switching cost here. |

## Preset coverage

| Need | R3F stack | PlayCanvas | Godot Web |
| --- | --- | --- | --- |
| Controller and camera | ecctrl supplies a ShapeCast controller, state, and camera helpers ([API](https://github.com/pmndrs/ecctrl/blob/main/docs/api-reference.md)). | Official third-person and camera-control examples cover mouse and gamepad ([controller](https://developer.playcanvas.com/tutorials/third-person-controller/), [camera](https://developer.playcanvas.com/user-manual/graphics/cameras/camera-controls/)). | `CharacterBody3D`, `SpringArm3D`, and an official TPS demo ([demo](https://github.com/godotengine/tps-demo)). |
| Animation | ecctrl resolves locomotion; drei plays and blends GLB clips. Combat transitions are custom. | Built-in editable state graphs ([docs](https://developer.playcanvas.com/user-manual/animation/)). | Built-in `AnimationPlayer` and `AnimationTree` ([docs](https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html)). |
| Navigation | No built-in navmesh. Use arena steering. | No built-in navmesh. Add Recast if needed. | Built-in navigation meshes, regions, agents, and debug tools ([docs](https://docs.godotengine.org/en/stable/tutorials/navigation/index.html)). |
| Particles | Drei has Sparkles, Points, and Trail. | Full particle component and editor ([docs](https://developer.playcanvas.com/user-manual/graphics/particles/)). | Built-in `GPUParticles3D` ([API](https://docs.godotengine.org/en/latest/classes/class_gpuparticles3d.html)). |

Skip navmesh for the MVP. Use small arenas, direct pursuit, obstacle rays, and fixed spawn lanes. Neither R3F nor PlayCanvas removes the navigation work.

## Four-hour proof

1. Hour 0 to 1: align React packages at `19.2.8`, install exact game dependencies, create a lazy client-only route, and pass a production build without peer overrides, hydration errors, or duplicate React.
2. Hour 1 to 2.5: load one animated GLB on ramps and steps. Deliver run, stop, turn, dodge, camera collision, aim, one projectile, and one hit sensor. Repeat every action twenty times without stuck physics, camera snaps, or lost input.
3. Hour 2.5 to 4: add six pursuing dummies, three effects, keyboard and mouse controls, plus one HTTP request and WebSocket echo to the user's server. Test the production build on the target laptop under network throttling.

Estimated pass line: the first encounter is controllable in under ten seconds on a 20 Mbps connection, runs at least 45 fps for sixty seconds on the agreed laptop at 1080p, and produces no uncaught errors.

Switch to PlayCanvas by hour four if the React upgrade remains unstable after 45 minutes, ecctrl has not delivered predictable movement, aim, and camera by hour 2.5, or the target laptop misses the frame target after reducing shadow resolution and particles. Use the official third-person project, export a separate static game, and embed it. Do not switch for missing navmesh or asset weight because PlayCanvas fixes neither. Do not switch after hour eight. Cut features instead.
