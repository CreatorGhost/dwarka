# DWARKA runtime boundary

Date: 2026-09-01. Scope: game-runtime behavior only. Hosting, databases, pricing, and provisioning are intentionally excluded because the project will run on the team's own server.

> **Decision update, 2026-09-02:** the narrow 20 Hz combat referee described below is now required for Chapter 1. The browser still renders and predicts movement, but the existing server owns combat and objective results. `docs/chapter-1-game-handoff.md` is the current source of truth. Approved later extensions live in `docs/future-chapters-game-handoff.md` and must not enter the Chapter 1 protocol early.

## Recommendation

Render the game in the browser. Do not use GPU pixel streaming for the hackathon build. Pixel streaming would move rendering and simulation to the server, but it adds an encoder, signaling, WebRTC connectivity, session allocation, and input-to-video latency. Epic describes its signaling stack as a reference implementation and documents STUN/TURN requirements for networks where peers cannot connect directly. That is too much failure surface for a 48 to 72 hour demo unless a working streaming stack already exists ([overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-pixel-streaming-in-unreal-engine), [hosting and networking](https://dev.epicgames.com/documentation/en-us/unreal-engine/hosting-and-networking-guide-for-pixel-streaming-in-unreal-engine)). Unity Render Streaming remains a package rather than a simpler escape hatch ([releases](https://github.com/Unity-Technologies/UnityRenderStreaming/releases)). Godot's official browser path is a local WebAssembly/WebGL export, not first-party pixel streaming ([web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)).

Chapter 1 uses a narrow authoritative combat referee:

- The browser renders at 60 fps and predicts movement, camera, animation, VFX, audio, and immediate input feedback.
- A small process on the existing JavaScript server ticks at 20 Hz and owns the encounter seed and clock, attack timers, cooldowns, invulnerability windows, simple circle/AABB hit tests, HP and status effects, mercy rules, boss phases, and win/fail state.
- The Chapter 1 client sends sequenced inputs for movement, aim, dodge, attack, and interaction. It never claims a hit or damage value. Later chapters may add charged-shot, melee-slot, astra-mode, mercy, and lower-weapon inputs only when their chapter is implemented.
- The server returns acknowledgements, state snapshots, and discrete combat events. The client interpolates remote state and performs shallow reconciliation without rewinding the whole scene.

Standard WebSockets are enough for the referee protocol ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/index.html)). A multiplayer platform or database would add setup without improving this personal single-player hackathon demo.

## Do not attempt

- Pixel streaming unless a proven stack already exists.
- Rollback, deterministic lockstep, or full lag compensation.
- Duplicate Rapier physics on client and server.
- Server-side navmesh or full enemy locomotion.
- WebRTC or WebTransport for state synchronization.
- Persistence, accounts, leaderboards, or database work for the demo.

If server communication fails during judging, the demo should expose a clearly labelled local fallback mode rather than become unplayable. This fallback is a presentation safeguard, not an authoritative production design.
