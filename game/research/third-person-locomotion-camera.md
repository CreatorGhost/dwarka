# Third-person locomotion and camera research

Date: 2026-09-02  
Scope: PlayCanvas browser runtime, server-authoritative Chapter 1  
Method: codebase audit plus first-party PlayCanvas, W3C, Unity, Epic/Unreal, and Valve documentation only. No gameplay code was changed by this research task.

## Executive conclusion

Chapter 1 should keep server-authoritative collision and in-place locomotion, but it should stop driving animation from keys and stop treating view yaw, movement yaw, and character-facing yaw as the same signal. The professional pattern appropriate here is:

1. Mouse delta updates an independent camera/aim pivot immediately.
2. Input is transformed through that camera's flattened forward/right basis.
3. The authoritative simulation moves a capsule/circle and reports velocity plus the last processed input sequence.
4. The owning client predicts that same movement and softly reconciles to the server; remote/AI actors use a short snapshot interpolation buffer.
5. The visible body turns toward actual movement velocity outside aim mode and toward camera aim inside aim mode.
6. Locomotion animation and footsteps are driven by measured horizontal speed and animation phase, not held keys.
7. Aim is a smooth rig blend, while the reticle ray remains stable at screen center.

This directly addresses the reported walking/running/mouse misalignment and the "cart on the road" symptom. A blocked character must have near-zero measured speed, an idle animation, and no footsteps even while a movement key remains held.

## What the current runtime is doing

These observations are from [`game/client-scripts/chapter-1.js`](../client-scripts/chapter-1.js), [`game/server/src/chapter-1/simulation.ts`](../server/src/chapter-1/simulation.ts), and [`game/server/src/chapter-1/collision.ts`](../server/src/chapter-1/collision.ts) as read on 2026-09-02.

- Input and authoritative snapshots run at 20 Hz (`50 ms`). The browser sends normalized WASD axes and a yaw/pitch; the server converts them through camera-relative forward/right vectors and resolves collision.
- The browser infers velocity from two snapshots, extrapolates the latest server position for at most `75 ms`, and then exponentially chases that extrapolated point. It has no history buffer, input acknowledgement, local prediction, or replay of unacknowledged inputs.
- Camera look has two successive values (`lookYaw` and `yaw`) with exponential smoothing. Character facing has a third (`visualYaw`) with different smoothing. This creates a deliberate visual phase difference between the reticle/camera, movement direction, and body.
- Locomotion state is selected from `snapshot.player.state`, but walk versus sprint and footsteps are selected from currently held keys. Therefore pressing into a collider can keep the run cycle and footsteps active while authoritative displacement is zero.
- Normal movement uses `Jog_Fwd_Loop` at playback `1.12`, sprint uses `Sprint_Loop` at `1.04`, and every state switch uses a flat `0.12 s` crossfade. The source clip durations are `0.9333 s` and `0.6667 s`, so their effective cycles are about `0.833 s` and `0.641 s`. Current footsteps repeat every `390 ms` and `275 ms`; those timers are not bound to the actual foot-contact phase.
- The server changes planar speed instantly among `3.2 m/s` aim, `4.5 m/s` normal, and `6.5 m/s` sprint. Animation playback is fixed rather than derived from actual displacement or authored stride speed.
- The server dodge lasts `0.65 s`, while the current `Roll` source clip is `1.4667 s` and is played at speed `1`. The animation therefore cannot reach its authored ending before authoritative dodge movement stops.
- The camera switches aim distance, shoulder offset, height, and field of view by a Boolean. Camera obstruction shortens the distance immediately and restores it at `3.2 m/s`; collision is sampled against manually duplicated boxes rather than a camera-radius sweep against the same scene collision representation.
- Visible environment placements and authoritative colliders live in different hand-authored arrays. This makes a visually rotated/scaled wagon, stall, barrel group, or other road prop capable of disagreeing with the invisible blocker even if both arrays are individually reasonable.

## Primary-source findings

### 1. Camera-relative movement should come from the camera basis

PlayCanvas's official movement tutorial gets camera `forward` and `right`, constructs movement from those directions, and normalizes before applying movement. Its official `Third Person Controller` example also classifies the problem as a combined input/camera/physics controller. The current server's basis math follows this basic pattern, but the direction used for simulation must be the same immediate aim-pivot direction shown to the player—not a differently lagged body angle. Sources: [PlayCanvas First Person Movement](https://developer.playcanvas.com/tutorials/first-person-movement/), [PlayCanvas Third Person Controller](https://developer.playcanvas.com/tutorials/third-person-controller/).

Concrete rule for DWARKA:

```text
flatForward = normalize(cameraAimForward with y = 0)
flatRight   = normalize(cross(worldUp, flatForward))
wish        = normalize(flatRight * inputX + flatForward * inputY)
```

Keep the current diagonal normalization. Never derive the player's movement direction from the model's current visual rotation; visual rotation is allowed to lag.

### 2. Camera aim and visible character rotation should be decoupled

Unity's first-party Cinemachine third-person documentation recommends an independent, often invisible tracking target when the camera must rotate separately from the character. The third-person rig then follows origin/shoulder/hand pivots, supports independent per-axis damping, and resolves obstacles while retaining sight of the target. For shooter aim, its aim extension keeps the screen-centre target steady even when camera motion contains noise. Sources: [Cinemachine Third Person Follow](https://docs.unity.cn/Packages/com.unity.cinemachine@3.1/manual/CinemachineThirdPersonFollow.html), [Create a Third Person Camera](https://docs.unity.cn/Packages/com.unity.cinemachine@6.6/manual/ThirdPersonCameras.html).

Concrete rule for DWARKA:

- Maintain distinct values named by responsibility: `aimYaw/Pitch`, `movementYaw`, and `actorYaw`.
- Mouse changes `aimYaw/Pitch` immediately. Do not damp the rotational value used by the reticle ray.
- Outside aim: `actorYaw` turns toward actual planar velocity once speed exceeds a dead zone.
- In aim/fire: `actorYaw` turns toward `aimYaw`; movement remains camera-relative and may strafe.
- Damp the camera pivot position and visible body turn, not the aiming ray. Use quaternion interpolation (or shortest-angle yaw interpolation for a world-up character); PlayCanvas documents `Quat.slerp` for rotational interpolation and its official smooth-camera example uses Lerp/Slerp. Sources: [PlayCanvas Quat API](https://api.playcanvas.com/engine/classes/Quat.html), [PlayCanvas Smooth Camera Movement](https://developer.playcanvas.com/tutorials/smooth-camera-movement/).

Use frame-rate-independent damping everywhere:

```text
alpha = 1 - exp(-response * dt)
value = lerp(value, target, alpha)
```

Recommended starting responses, to be tuned visibly: body turn `12–16 s^-1`, camera follow position `10–14 s^-1`, collision recovery `6–9 s^-1`. The aim ray itself should have no temporal filter beyond optional assist applied only after real mouse input stops.

### 3. Pointer lock should provide the complete mouse-delta stream

The W3C Pointer Lock specification defines `movementX/Y` as movement deltas, requires motion to be delivered while locked, removes screen-edge clamping, and provides the `unadjustedMovement` option for input without platform mouse acceleration. The option may be unsupported, in which case the request rejects with `NotSupportedError`. PlayCanvas's Mouse API provides pointer lock and normalized cross-browser mouse events. Sources: [W3C Pointer Lock 2.0](https://www.w3.org/TR/pointerlock-2/), [PlayCanvas Mouse API](https://api.playcanvas.com/engine/classes/Mouse.html), [PlayCanvas Mouse Input](https://developer.playcanvas.com/tutorials/mouse-input/).

Concrete rule for DWARKA:

- Request `{ unadjustedMovement: true }` on the user's click, then fall back to ordinary pointer lock when unsupported.
- Accumulate every delta received during the render frame, multiply once by a configurable sensitivity, then clear the accumulator. This avoids behavior that changes with event frequency.
- Remove the current unconditional per-event `±120 px` clamp. If anomaly protection is needed, cap the *frame's angular delta* after accumulation and log the cap in QA; do not silently discard ordinary fast swipes.
- Add sensitivity and invert-Y settings. Keep pitch clamped and yaw unbounded/wrapped.
- On pointer-lock loss, blur, pause, or visibility loss, clear mouse deltas and movement keys exactly once. Do not accept look input merely because the canvas has focus; require actual pointer lock during play.

### 4. Animation should be driven from actual motion, with explicit blends

PlayCanvas's Anim component is built around animation state graphs, runtime parameters, clip speed, transitions, layers, masks, and blend trees. Its documentation specifically presents one reusable graph for humanoid locomotion and suggests layers/masks when the upper body must perform an action while the lower body continues locomotion. Transitions have explicit durations, exit times, offsets, and interruption rules. Sources: [PlayCanvas Anim state graphs](https://developer.playcanvas.com/user-manual/animation/anim-state-graph-assets/), [PlayCanvas AnimComponent API](https://api.playcanvas.com/engine/classes/AnimComponent.html), [PlayCanvas Anim State Graph Blending](https://developer.playcanvas.com/tutorials/anim-blending/).

Concrete rule for DWARKA:

- Server snapshots should include authoritative planar velocity, or the client should calculate smoothed render velocity from consecutive rendered positions. Use its magnitude—not keys—to drive locomotion.
- Use a speed dead zone with hysteresis: enter locomotion above roughly `0.18 m/s`, return to idle below roughly `0.10 m/s`. This prevents rapid idle/jog toggles at collision edges.
- With only idle, forward jog, and sprint assets, use a 1D speed blend (`0`, normal, sprint). Do not pretend a forward clip is a good strafe clip. If aim strafing remains important later, add genuine left/right/back clips and use a 2D directional blend; Unity's official 2D blend-tree documentation likewise maps motions by velocity X/Z and distinguishes directional blends. Source: [Unity 6 2D Blending](https://docs.unity3d.com/6000.0/Documentation/Manual/BlendTree-2DBlending.html).
- Measure each locomotion clip's authored forward speed once and store it as clip metadata. For an in-place clip, determine the speed at which planted feet are visually stationary. Then compute `playbackRate = actualSpeed / authoredSpeed`, clamped to a modest band such as `0.8–1.25`. When outside that band, crossfade to the other gait instead of stretching one clip unnaturally.
- Bind footsteps to normalized animation contact phases or animation events, not wall-clock intervals. A blocked player at zero actual velocity must produce neither steps nor locomotion animation.
- Keep short transition times around `0.10–0.18 s` for locomotion changes, but use per-transition values and hysteresis. The exact values are recommendations for visible tuning, not constants claimed by the sources.

### 5. In-place locomotion is the right default for this server-authoritative game

Unity defines root motion as animation-derived transform displacement and lets XZ/Y/rotation remain in the pose or be applied to the game object. Epic's networked movement documentation describes root motion as a special-case movement mode that must participate explicitly in saved moves and replication; ordinary owning-player movement is predicted locally, replayed on the server, corrected, and re-simulated on the client. Sources: [Unity 6 Root Motion](https://docs.unity3d.com/6000.0/Documentation/Manual/RootMotion.html), [Epic: Understanding Networked Movement](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine).

Concrete rule for DWARKA:

- Keep idle/jog/sprint in-place. The server remains the owner of world displacement and collision.
- Do not add generic root-motion locomotion to hide foot sliding; fix playback/stride matching instead.
- For discrete moves such as dodge, use one deterministic normalized movement curve on the server and drive animation time from the same normalized action progress. Alternatively trim/retime the animation to the authoritative duration. The current `1.4667 s` roll played against a `0.65 s` dodge is objectively mismatched; playing the complete source in that window would require about `2.26x`, likely too fast to look natural, so a trimmed/faster source or a revised action window is preferable.
- Mark phase loads, respawns, retries, and checkpoint restores as teleports. Epic's official model snaps teleports rather than smoothing them. Source: [Epic: Understanding Networked Movement](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine#teleportingacharacterinmultiplayer).

### 6. The owned player and replicated actors need different network presentation

Epic's production movement model immediately simulates the owning character, queues saved moves, has the server reproduce them, and replays remaining moves after a correction. Simulated proxies instead consume replicated movement with network smoothing. Valve's first-party networking documentation explains why rendering directly from 20 Hz snapshots looks choppy, and describes rendering interpolated entities behind the newest state with bounded extrapolation only when snapshot history is unavailable. Sources: [Epic: Understanding Networked Movement](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine), [Valve: Source Multiplayer Networking — entity interpolation](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking#Entity_interpolation).

Concrete rule for DWARKA:

- Add `lastProcessedInputSeq`, authoritative velocity, and a teleport/phase epoch to every snapshot.
- Put deterministic camera-relative motion and collision in one shared data contract/module used by browser prediction and server authority. Keep the server authoritative.
- Owning player: apply current input locally every render/fixed step, acknowledge processed inputs from the server, reset to the authoritative position, replay unacknowledged inputs, and ease only the residual visual error. Snap on a phase epoch change or a large invalid error.
- Enemies/family: keep at least three timestamped snapshots. Render approximately `100 ms` behind the newest server time (two `50 ms` ticks), interpolate position and shortest-path yaw, and extrapolate no farther than `100 ms` before holding. Tune delay against measured network jitter; do not copy Valve's historical default blindly.
- Do not combine the current latest-snapshot extrapolation and exponential chase with a new history buffer; use one explicit timeline. Otherwise two smoothing layers create rubber-band lag.

### 7. Aim mode should be a continuous camera-rig blend

Cinemachine's official third-person rig exposes shoulder offset, vertical arm length, distance, per-axis damping, collision radius, and separate damping into and out of collision. It also recommends an independent target for precise third-person aiming. Source: [Cinemachine Third Person Follow](https://docs.unity.cn/Packages/com.unity.cinemachine@3.1/manual/CinemachineThirdPersonFollow.html).

Concrete rule for DWARKA:

- Introduce `aimBlend` in `[0,1]` with eased aim-in around `0.16–0.20 s` and aim-out around `0.20–0.28 s` as initial tuning ranges.
- Lerp follow target, shoulder offset, camera distance, vertical offset, and FOV from exploration to aim using the same blend. Do not switch the rig parameters as a Boolean.
- Compute the centre-screen aim ray from the final camera transform after collision. Weapon/arrow convergence should use that ray's world hit point, not a separate character-forward ray.
- Use a camera collision radius around `0.18–0.25 m`; move into collision essentially immediately and restore distance more slowly to avoid wall jitter. Ensure the player and non-blocking decoration are excluded from the camera collision mask.
- Suppress positional camera shake during precision aim or apply shake before an aim correction that restores the reticle's centre-world point.

## Recommended implementation order

### P0 — fixes the user's reported defect

1. Add actual planar velocity to snapshots and render state.
2. Drive idle/jog/sprint, playback speed, facing, and footsteps from actual rendered velocity.
3. Split immediate `aimYaw/Pitch` from smoothed `actorYaw`; derive server movement from aim yaw.
4. Replace Boolean aim-camera changes with one eased `aimBlend`.
5. Make visible prop transforms and authoritative collision come from one shared placement/collider manifest. The cart/stall/wagon blocker must be derived or verified from the transformed mesh bounds, not independently guessed.

### P1 — removes network-induced softness

1. Include `lastProcessedInputSeq`, velocity, and phase epoch in snapshots.
2. Add owning-player prediction plus reconciliation.
3. Add a `100 ms` interpolation history for AI/family actors and bounded extrapolation.
4. Synchronize dodge animation time and movement curve.

### P2 — higher visual fidelity without expanding combat scope

1. Convert the flat animation switches to a parameterized locomotion graph.
2. Add upper-body aim/combat masking only if the existing rig/animations remain stable.
3. Replace timed footsteps with animation contact events and tune the authored stride metadata from capture.

## Acceptance tests that should gate completion

| Area | Visible/measurable requirement |
|---|---|
| Direction mapping | At yaw `0`: W moves `-Z`, S `+Z`, A `-X`, D `+X`; at yaw `90°`: W `+X`, S `-X`, A `-Z`, D `+Z`. Repeat at `180°` and `270°`. |
| Diagonals | One second of W+D covers the same planar distance as one second of W, within `2%`. |
| Camera/body separation | A 90° mouse turn rotates the reticle ray immediately; outside aim the body catches up smoothly; inside aim the body faces the aim yaw without the movement basis changing sign. |
| Blocked movement | Hold W against every collidable cart, stall, barrel group, wall, post, stair, and vase cluster for `2 s`: penetration is `0`, measured speed drops below idle threshold, locomotion animation returns to idle, and footsteps stop. |
| Prop alignment | Draw each authoritative collider in QA mode over its visible prop. No blocker may sit in open road and no solid prop may lack the intended blocker. Test rotated/scaled wagons specifically. |
| Speed | Measured steady normal/aim/sprint speeds match `4.5/3.2/6.5 m/s` within `3%` unless intentionally retuned; diagonal speed remains equal. |
| Foot sliding | During each marked planted-foot interval, world-space planted-foot drift stays below `8 cm`; no footstep plays while planar speed is below idle threshold. |
| Start/stop | From idle, run, release, reverse, and feather against a wall. No pose popping, prolonged moonwalk, or run-in-place beyond the short deceleration window. |
| Aim blend | Repeated RMB presses during movement produce no one-frame camera jump, no reversal, and no reticle displacement from the world aim point. |
| Camera collision | Back into every blocker and corner. The camera never enters geometry, moves into collision promptly, and returns without oscillation. |
| Network jitter | Under synthetic 20 Hz snapshots with `0/50/100 ms` jitter and one dropped snapshot, the owned player responds on the input frame, remote actors remain continuous, and correction error decays without overshoot. |
| Teleports | Phase start, retry, reconnect checkpoint, and full-health restart snap cleanly once; no traversal across the map through interpolation. |
| Animation timing | Dodge animation and authoritative dodge start/end on the same normalized timeline; the character does not resume locomotion halfway through the roll. |

## Minimal telemetry for visible tuning

Expose this in the existing QA overlay and test hook:

```text
input axes; aim yaw/pitch; actor yaw; desired movement yaw
authoritative velocity; rendered velocity; gait; clip; playback rate; normalized clip time
latest server tick; render tick/time; input ack; unacked input count; correction error
aim blend; target camera distance; collision-resolved distance; pointer-lock/raw-input status
current collider id; penetration/depenetration count; grounded/blocked flags
```

This makes alignment failures observable instead of subjective: if W looks wrong, the test can distinguish input mapping, camera basis, model forward-axis, body-turn lag, animation phase, and server correction.

## Source list

- [PlayCanvas — Third Person Controller](https://developer.playcanvas.com/tutorials/third-person-controller/)
- [PlayCanvas — First Person Movement](https://developer.playcanvas.com/tutorials/first-person-movement/)
- [PlayCanvas — Smooth Camera Movement](https://developer.playcanvas.com/tutorials/smooth-camera-movement/)
- [PlayCanvas — Mouse API](https://api.playcanvas.com/engine/classes/Mouse.html)
- [PlayCanvas — Quat API](https://api.playcanvas.com/engine/classes/Quat.html)
- [PlayCanvas — Anim state graph assets](https://developer.playcanvas.com/user-manual/animation/anim-state-graph-assets/)
- [PlayCanvas — AnimComponent API](https://api.playcanvas.com/engine/classes/AnimComponent.html)
- [W3C — Pointer Lock 2.0](https://www.w3.org/TR/pointerlock-2/)
- [Unity — Cinemachine Third Person Follow](https://docs.unity.cn/Packages/com.unity.cinemachine@3.1/manual/CinemachineThirdPersonFollow.html)
- [Unity 6 — Root Motion](https://docs.unity3d.com/6000.0/Documentation/Manual/RootMotion.html)
- [Unity 6 — 2D Blending](https://docs.unity3d.com/6000.0/Documentation/Manual/BlendTree-2DBlending.html)
- [Epic Games — Understanding Networked Movement](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine)
- [Valve — Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking#Entity_interpolation)

