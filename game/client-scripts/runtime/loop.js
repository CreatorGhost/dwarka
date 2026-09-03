export function safeCameraDistance({
  target,
  desired,
  bounds,
  colliders,
  floorAt,
  clearance = 0.34,
}) {
  const dx = desired.x - target.x;
  const dy = desired.y - target.y;
  const dz = desired.z - target.z;
  const length = Math.hypot(dx, dy, dz);
  const targetFloor = floorAt(target.x, target.z) ?? target.y;
  let allowed = length;
  const steps = Math.max(1, Math.ceil(length / 0.16));
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    const x = target.x + dx * progress;
    const y = target.y + dy * progress;
    const z = target.z + dz * progress;
    const sampleFloor = floorAt(x, z);
    const worldBlocked =
      x < bounds.minX + clearance ||
      x > bounds.maxX - clearance ||
      z < bounds.minZ + clearance ||
      z > bounds.maxZ - clearance;
    const routeBlocked = sampleFloor === null && y < targetFloor + 3.2;
    const objectBlocked = colliders.some(
      ([minX, maxX, minZ, maxZ]) =>
        x > minX - clearance &&
        x < maxX + clearance &&
        z > minZ - clearance &&
        z < maxZ + clearance &&
        y < (sampleFloor ?? targetFloor) + 3.2,
    );
    if (worldBlocked || routeBlocked || objectBlocked) {
      allowed = Math.max(0.7, (length * (index - 1)) / steps - 0.15);
      break;
    }
  }
  return allowed;
}

export function playerWeaponVisibility(aim, playerAnimation) {
  const bowEquipped =
    aim || ["aim", "fire", "archerWarn"].includes(playerAnimation);
  return { bowEquipped, swordEquipped: !bowEquipped };
}

export function desktopPixelRatio(devicePixelRatio) {
  return Math.min(1, devicePixelRatio);
}

export function installLoop(rt) {
  const { state, ui, pc, canvas, mats } = rt;
  const WORLD_BOUNDS = rt.WORLD_BOUNDS;
  const WORLD_COLLIDERS = rt.WORLD_COLLIDERS;
  const FLOOR_REGIONS = rt.FLOOR_REGIONS;
  const ROUTE_SEGMENTS = rt.ROUTE_SEGMENTS;
  const ENVIRONMENT_PLACEMENTS = rt.ENVIRONMENT_PLACEMENTS;
  const STREET_HOUSE_BAYS = rt.STREET_HOUSE_BAYS;
  const TALL_HOUSE_BAYS = rt.TALL_HOUSE_BAYS;
  const SETBACK_HOUSE_BAYS = rt.SETBACK_HOUSE_BAYS;
  const STREET_HOUSE_MODEL_KEYS = rt.STREET_HOUSE_MODEL_KEYS;
  const UPPER_HOUSE_MODEL_KEYS = rt.UPPER_HOUSE_MODEL_KEYS;
  const UPPER_HOUSE_FRONTS = rt.UPPER_HOUSE_FRONTS;
  const GROUND_ALIGNED_MODELS = rt.GROUND_ALIGNED_MODELS;
  const STREET_SURFACE_Y = rt.STREET_SURFACE_Y;
  const CHARACTER_GROUND_LIFT = rt.CHARACTER_GROUND_LIFT;
  const floorHeightAt = rt.floorHeightAt;
  const STORY = rt.STORY;
  const STORY_VOICE_LINES = rt.STORY_VOICE_LINES;
  const EFFECT_URLS = rt.EFFECT_URLS;
  const TUTORIAL_STEPS = rt.TUTORIAL_STEPS;
  const PLAYABLE_PHASES = rt.PLAYABLE_PHASES;
  const MODEL_URLS = rt.MODEL_URLS;
  const CHAPTER_CONFIG = rt.CHAPTER_CONFIG;
  const ChapterSimulation = rt.ChapterSimulation;
  const CHARACTER_ANIMATIONS = rt.CHARACTER_ANIMATIONS;
  const PHASE_DETAILS = rt.PHASE_DETAILS;
  const UI_MESSAGES = rt.UI_MESSAGES;
  const assetUrl = rt.assetUrl;
  const chapterAssetRevision = rt.chapterAssetRevision;
  const angleDifference = rt.angleDifference;
  const targetLineBlocked = rt.targetLineBlocked;
  const safeWebSocketEndpoint = rt.safeWebSocketEndpoint;
  const CHARACTER_ANIMATION_SPEEDS = rt.CHARACTER_ANIMATION_SPEEDS;
  const characterStateGraph = rt.characterStateGraph;
  const animationSpeeds = rt.animationSpeeds;
  const t = rt.t;
  const sendParent = rt.sendParent;
  const strings = rt.strings;
  const localizedMessage = rt.localizedMessage;
  const clearInput = rt.clearInput;
  const queuePressed = rt.queuePressed;

  function segmentCameraDistance(target, desired) {
    return safeCameraDistance({
      target,
      desired,
      bounds: WORLD_BOUNDS,
      colliders: WORLD_COLLIDERS,
      floorAt: floorHeightAt,
    });
  }

  function springCameraAxis(
    axis,
    target,
    dt,
    frequency = CHAPTER_CONFIG.feel.cameraSpringFrequency,
  ) {
    const position = state.cameraSpring[axis];
    const velocity = state.cameraSpringVelocity[axis];
    const damping = 1 + 2 * dt * frequency;
    const spring = frequency * frequency;
    const impulse = dt * spring;
    const inverse = 1 / (damping + dt * impulse);
    state.cameraSpring[axis] =
      (damping * position + dt * velocity + dt * impulse * target) * inverse;
    state.cameraSpringVelocity[axis] =
      (velocity + impulse * (target - position)) * inverse;
  }

  function enforceNativeResolution() {
    if (!state.app) return;
    const nativeRatio = desktopPixelRatio(window.devicePixelRatio);
    if (
      state.renderScale === 1 &&
      state.app.graphicsDevice.maxPixelRatio === nativeRatio
    )
      return;
    state.renderScale = 1;
    state.app.graphicsDevice.maxPixelRatio = nativeRatio;
    state.app.resizeCanvas();
  }

  function updateScene(dt) {
    state.fpsFrames += 1;
    state.fpsElapsed += dt;
    if (state.fpsElapsed >= 0.5) {
      state.fpsLast = Math.round(state.fpsFrames / state.fpsElapsed);
      ui.fps.textContent = String(state.fpsLast);
      state.fpsFrames = 0;
      state.fpsElapsed = 0;
      enforceNativeResolution();
    }
    state.captionTimer -= dt;
    if (state.captionTimer <= 0) ui.caption.hidden = true;
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) ui.toast.hidden = true;
    const simulationDt = Math.min(0.05, Math.max(0, dt));
    rt.tickLocalSimulation(simulationDt);
    const animationFrozen =
      state.paused || performance.now() < state.hitStopUntil;
    const visualDt = animationFrozen ? 0 : simulationDt;
    state.interpolationClockMs += visualDt * 1000;
    const lookBlend = 1 - Math.exp(-visualDt * 38);
    state.yaw += angleDifference(state.lookYaw, state.yaw) * lookBlend;
    state.pitch = pc.math.lerp(state.pitch, state.lookPitch, lookBlend);
    const snapshot = state.snapshot;
    if (!snapshot?.player) return;
    rt.updateDoorPresentation(snapshot, visualDt);
    const visualPlayer = state.predictedPlayer || snapshot.player;
    state.visibilityElapsed += dt;
    if (state.visibilityElapsed >= 0.5) {
      state.visibilityElapsed = 0;
      rt.updateEnvironmentVisibility(visualPlayer);
    }
    const targetX = visualPlayer.x;
    const targetZ = visualPlayer.z;
    const current = state.playerEntity.getPosition();
    const blend = 1 - Math.exp(-visualDt * 20);
    const nextX = pc.math.lerp(current.x, targetX, blend);
    const nextZ = pc.math.lerp(current.z, targetZ, blend);
    const playerVelocity = state.localSimulation
      ? state.predictedVelocity
      : state.snapshotVelocity;
    const planarSpeed = Math.hypot(playerVelocity.x, playerVelocity.z);
    const localAction =
      state.localAction && performance.now() < state.localAction.until
        ? state.localAction.name
        : null;
    if (!localAction) state.localAction = null;
    const authoritativeAction = ["down", "hit", "dodge", "interact"].includes(
      snapshot.player.state,
    )
      ? snapshot.player.state
      : null;
    const locomotionAnim =
      planarSpeed <= 0.35 ? "idle" : planarSpeed >= 5.3 ? "sprint" : "walk";
    const playerAnim =
      state.qaAnimationPreviews.get("Vrishaketu") ||
      authoritativeAction ||
      localAction ||
      (snapshot.player.state === "locomotion"
        ? locomotionAnim
        : snapshot.player.state === "melee"
          ? "melee"
          : snapshot.player.state === "fire"
            ? "fire"
            : state.aim
              ? "aim"
              : "idle");
    const faceView =
      state.aim || ["aim", "fire", "melee", "attack"].includes(playerAnim);
    let desiredVisualYaw = state.visualYaw;
    if (faceView) desiredVisualYaw = state.yaw;
    else if (planarSpeed > 0.35)
      desiredVisualYaw = Math.atan2(playerVelocity.x, -playerVelocity.z);
    const turnBlend = 1 - Math.exp(-visualDt * (faceView ? 18 : 11));
    state.visualYaw +=
      angleDifference(desiredVisualYaw, state.visualYaw) * turnBlend;
    const playerFloorY = visualPlayer.y ?? floorHeightAt(nextX, nextZ);
    state.playerEntity.dwarkaFloorY = playerFloorY;
    state.playerEntity.setPosition(
      nextX,
      playerFloorY +
        CHARACTER_GROUND_LIFT * (state.playerEntity.dwarkaScale || 1),
      nextZ,
    );
    const renderedPosition = state.playerEntity.getPosition();
    state.meshSnapshotDistance = Math.hypot(
      renderedPosition.x - snapshot.player.x,
      renderedPosition.z - snapshot.player.z,
    );
    state.meshSnapshotMaxDistance = Math.max(
      state.meshSnapshotMaxDistance,
      state.meshSnapshotDistance,
    );
    if (
      !state.localMode &&
      state.playing &&
      state.meshSnapshotDistance >= 0.3 &&
      performance.now() - state.meshSnapshotLastWarningAt >= 1000
    ) {
      state.meshSnapshotLastWarningAt = performance.now();
      console.error("DWARKA mesh/snapshot assertion failed", {
        distance: state.meshSnapshotDistance,
        mesh: { x: renderedPosition.x, z: renderedPosition.z },
        snapshot: { x: snapshot.player.x, z: snapshot.player.z },
      });
    }
    state.playerEntity.setEulerAngles(0, (-state.visualYaw * 180) / Math.PI, 0);
    rt.setCharacterAnimation(state.playerEntity, playerAnim, planarSpeed);
    rt.groundAnimatedCharacter(state.playerEntity, visualDt);
    const { bowEquipped, swordEquipped } = playerWeaponVisibility(
      state.aim,
      playerAnim,
    );
    if (state.playerEntity.dwarkaBow)
      state.playerEntity.dwarkaBow.enabled = bowEquipped;
    if (state.playerEntity.dwarkaSword)
      state.playerEntity.dwarkaSword.enabled = swordEquipped;
    rt.syncEquipmentSockets(state.playerEntity);
    rt.updateWeaponEffects(state.playerEntity);
    if (
      state.playing &&
      snapshot.player.state === "locomotion" &&
      planarSpeed > 0.65
    ) {
      const gait = pc.math.clamp((planarSpeed - 3.2) / 3.3, 0, 1);
      const interval = pc.math.lerp(410, 275, gait);
      if (performance.now() - state.lastFootstepAt >= interval) {
        state.lastFootstepAt = performance.now();
        state.footstepIndex = (state.footstepIndex % 3) + 1;
        rt.playEffect(`footstep${state.footstepIndex}`, 0.32);
      }
    }
    rt.syncEnemies(rt.bufferedEnemies(snapshot), visualDt);
    rt.groundAnimatedCharacter(state.chitra, visualDt);
    for (const family of state.familyEntities)
      rt.groundAnimatedCharacter(family, visualDt);
    rt.applyAnimationFreeze(
      state.paused || performance.now() < state.hitStopUntil,
    );
    rt.updateBowTargeting(snapshot, dt);
    const forward = { x: Math.sin(state.yaw), z: -Math.cos(state.yaw) },
      right = { x: Math.cos(state.yaw), z: Math.sin(state.yaw) };
    const aimBlendRate = 1 - Math.exp(-visualDt * (state.aim ? 14 : 10));
    state.aimBlend = pc.math.lerp(
      state.aimBlend,
      state.aim ? 1 : 0,
      aimBlendRate,
    );
    const targetOffset = pc.math.lerp(0.42, 0.28, state.aimBlend);
    const target = {
      x: nextX + right.x * targetOffset,
      y: playerFloorY + 1.6,
      z: nextZ + right.z * targetOffset,
    };
    const baseDistance = pc.math.lerp(4.5, 0.78, state.aimBlend);
    const shoulderOffset = pc.math.lerp(0.72, 0.55, state.aimBlend);
    const cameraHeight = pc.math.lerp(1.25, 0.35, state.aimBlend);
    const pitchScale = pc.math.lerp(2.1, 1.25, state.aimBlend);
    const desired = {
      x: target.x - forward.x * baseDistance + right.x * shoulderOffset,
      y: target.y + cameraHeight + Math.sin(state.pitch) * pitchScale,
      z: target.z - forward.z * baseDistance + right.z * shoulderOffset,
    };
    const safe = segmentCameraDistance(target, desired);
    state.cameraDistance =
      safe < state.cameraDistance
        ? safe
        : Math.min(baseDistance, state.cameraDistance + dt * 3.2);
    const ratio = Math.min(
      1,
      state.cameraDistance /
        Math.max(
          0.001,
          Math.hypot(
            desired.x - target.x,
            desired.y - target.y,
            desired.z - target.z,
          ),
        ),
    );
    const safeDesired = {
      x: target.x + (desired.x - target.x) * ratio,
      y: target.y + (desired.y - target.y) * ratio,
      z: target.z + (desired.z - target.z) * ratio,
    };
    if (
      !state.cameraSpring ||
      Math.hypot(
        state.cameraSpring.x - safeDesired.x,
        state.cameraSpring.y - safeDesired.y,
        state.cameraSpring.z - safeDesired.z,
      ) > 8
    ) {
      state.cameraSpring = { ...safeDesired };
      state.cameraSpringVelocity = { x: 0, y: 0, z: 0 };
    }
    for (const axis of ["x", "y", "z"])
      springCameraAxis(axis, safeDesired[axis], visualDt);
    const springDistance = segmentCameraDistance(target, state.cameraSpring);
    const springLength = Math.max(
      0.001,
      Math.hypot(
        state.cameraSpring.x - target.x,
        state.cameraSpring.y - target.y,
        state.cameraSpring.z - target.z,
      ),
    );
    const springRatio = Math.min(1, springDistance / springLength);
    state.camera.setPosition(
      target.x + (state.cameraSpring.x - target.x) * springRatio,
      target.y + (state.cameraSpring.y - target.y) * springRatio,
      target.z + (state.cameraSpring.z - target.z) * springRatio,
    );
    if (
      performance.now() < state.damageFlashUntil &&
      state.settings.cameraShake !== false
    )
      state.camera.translateLocal(
        Math.sin(performance.now() * 0.19) * 0.026,
        Math.cos(performance.now() * 0.23) * 0.018,
        0,
      );
    state.camera.lookAt(
      target.x + forward.x * 4,
      target.y + state.pitch * 2,
      target.z + forward.z * 4,
    );
    state.camera.camera.fov = state.qaFocusName
      ? 42
      : pc.math.lerp(63, 55, state.aimBlend);
    if (state.qaFocusName) {
      const actor = state.app.root.findByName(state.qaFocusName);
      const head = actor?.dwarkaVisual?.findByName("Head");
      if (actor && head) {
        const face = head.getPosition();
        const facing = actor.forward;
        const right = actor.right;
        const radians = (state.qaFocusAngle * Math.PI) / 180;
        state.camera.setPosition(
          face.x +
            (facing.x * Math.cos(radians) + right.x * Math.sin(radians)) *
              state.qaFocusDistance,
          face.y + 0.03,
          face.z +
            (facing.z * Math.cos(radians) + right.z * Math.sin(radians)) *
              state.qaFocusDistance,
        );
        state.camera.lookAt(face.x, face.y + 0.05, face.z);
      }
    }
    ui.damageFlash?.classList.toggle(
      "damaged",
      performance.now() < state.damageFlashUntil,
    );
    if (state.objectiveMarker?.enabled && state.objectiveTarget) {
      const bob = Math.sin(performance.now() * 0.0032) * 0.13;
      state.objectiveMarker.setPosition(
        state.objectiveTarget[0],
        state.objectiveTarget[1] + bob,
        state.objectiveTarget[2],
      );
      state.objectiveMarker.rotateLocal(0, dt * 38, 0);
    }
    rt.updateObjectiveGuidance(snapshot);
    for (const fire of state.fireEffects) {
      if (!fire?.parent) continue;
      const pulse =
        1 + Math.sin(performance.now() * 0.006 + fire.getPosition().x) * 0.05;
      fire.setLocalScale(pulse, 0.96 + pulse * 0.04, pulse);
    }
    for (const light of state.fireLights) {
      if (!light?.light) continue;
      rt.flickerFireLight(light, performance.now());
    }
    for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = state.projectiles[index];
      projectile.elapsed += dt;
      const progress = Math.min(1, projectile.elapsed / projectile.duration);
      const currentX = pc.math.lerp(
        projectile.start.x,
        projectile.end.x,
        progress,
      );
      const currentY = pc.math.lerp(
        projectile.start.y,
        projectile.end.y,
        progress,
      );
      const currentZ = pc.math.lerp(
        projectile.start.z,
        projectile.end.z,
        progress,
      );
      projectile.entity.setPosition(currentX, currentY, currentZ);
      projectile.trailStart.set(
        projectile.previous.x,
        projectile.previous.y,
        projectile.previous.z,
      );
      projectile.trailEnd.set(currentX, currentY, currentZ);
      rt.boxBetweenLocal(
        projectile.trail,
        state.app.root,
        projectile.trailStart,
        projectile.trailEnd,
        0.012,
      );
      projectile.previous.x = currentX;
      projectile.previous.y = currentY;
      projectile.previous.z = currentZ;
      if (progress >= 1) {
        rt.releaseProjectile(projectile);
        state.projectiles.splice(index, 1);
      }
    }
    for (let index = state.impacts.length - 1; index >= 0; index -= 1) {
      const impact = state.impacts[index];
      impact.life += dt;
      impact.velocity.y -= 5.4 * dt;
      impact.entity.translate(
        impact.velocity.x * dt,
        impact.velocity.y * dt,
        impact.velocity.z * dt,
      );
      const fadeScale = Math.max(0.01, 1 - impact.life / impact.duration);
      impact.entity.setLocalScale(
        0.045 * fadeScale,
        0.045 * fadeScale,
        0.045 * fadeScale,
      );
      if (impact.life >= impact.duration) {
        rt.releaseImpact(impact);
        state.impacts.splice(index, 1);
      }
    }
    if (state.qaVisible) {
      const x =
          (state.keys.has("KeyD") ? 1 : 0) - (state.keys.has("KeyA") ? 1 : 0),
        z = (state.keys.has("KeyW") ? 1 : 0) - (state.keys.has("KeyS") ? 1 : 0);
      ui.qa.textContent = [
        `phase ${snapshot.phase} · tick ${snapshot.serverTick}`,
        `keys ${[...state.keys].join(" ") || "none"}`,
        `raw move ${x}, ${z} · speed ${planarSpeed.toFixed(2)} m/s · yaw ${state.yaw.toFixed(2)}`,
        `pos ${snapshot.player.x.toFixed(2)}, ${snapshot.player.z.toFixed(2)}`,
        `state ${snapshot.player.state} · camera ${state.cameraDistance.toFixed(2)}m`,
        `pointer ${document.pointerLockElement === canvas} · ${state.fpsLast} fps`,
      ].join("\n");
    }
  }

  rt.segmentCameraDistance = segmentCameraDistance;
  rt.springCameraAxis = springCameraAxis;
  rt.enforceNativeResolution = enforceNativeResolution;
  rt.updateScene = updateScene;
}
