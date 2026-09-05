import {
  bowReticlePresentation,
  targetRimColor,
  visibleArrowEuler,
} from "./reticle.js";
import { createObjectPool } from "../runtime/object-pool.js";
import {
  DOORS,
  doorColliderAtProgress,
  segmentBlocked as targetLineBlocked,
} from "../../server/src/chapter-1/collision.ts";

export function angleDifference(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

export function selectBowTarget({
  origin,
  yaw,
  pitch,
  enemies,
  blocked = () => false,
}) {
  const forward = { x: Math.sin(yaw), z: -Math.cos(yaw) };
  let target = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const enemy of enemies || []) {
    if (enemy.dead) continue;
    const dx = enemy.x - origin.x;
    const dz = enemy.z - origin.z;
    const distance = Math.hypot(dx, dz);
    const dot = distance > 0 ? (dx * forward.x + dz * forward.z) / distance : 1;
    const arrowHeight = 1.42 + Math.tan(pitch) * distance;
    const heightError = Math.abs(arrowHeight - 1.1);
    if (
      distance > 22 ||
      dot <= 0.83 ||
      heightError > 0.85 ||
      blocked(enemy)
    )
      continue;
    const angularError = Math.acos(Math.max(-1, Math.min(1, dot)));
    const score = angularError * 5 + heightError * 0.42 + distance * 0.006;
    if (score < bestScore) {
      bestScore = score;
      target = { ...enemy, distance, dot, heightError, score };
    }
  }
  return target;
}

export function openDoorIdsForSnapshot(snapshot) {
  return new Set(
    (snapshot?.doors || []).filter(({ open }) => open).map(({ id }) => id),
  );
}

export function doorProgressForSnapshot(snapshot) {
  return Object.fromEntries(
    (snapshot?.doors || []).map((door) => {
      const progress = door.open ? 1 : Number(door.progress);
      return [
        door.id,
        Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0,
      ];
    }),
  );
}

export function collidersForSnapshot(colliders, snapshot) {
  const doorStates = new Map(
    (snapshot?.doors || []).map((door) => [door.id, door]),
  );
  if (doorStates.size === 0) return colliders;
  const doors = new Map(DOORS.map((door) => [door.id, door]));
  return colliders.map((collider) => {
    const id = Array.isArray(collider) ? collider[5] : collider.id;
    const state = doorStates.get(id);
    const door = doors.get(id);
    if (!state || !door) return collider;
    const progress = state.open ? 1 : state.progress;
    const box = doorColliderAtProgress(door, progress);
    if (!Array.isArray(collider)) return { ...collider, ...box };
    return [
      box.minX,
      box.maxX,
      box.minZ,
      box.maxZ,
      collider[4],
      collider[5],
      collider[6],
    ];
  });
}

export function visibleProjectileDistance({
  start,
  direction,
  maxDistance = 22,
  bounds,
  colliders,
}) {
  for (let step = 0.15; step <= maxDistance; step += 0.15) {
    const x = start.x + direction.x * step;
    const z = start.z + direction.z * step;
    const blocked =
      x < bounds.minX + 0.15 ||
      x > bounds.maxX - 0.15 ||
      z < bounds.minZ + 0.15 ||
      z > bounds.maxZ - 0.15 ||
      colliders.some(
        ([minX, maxX, minZ, maxZ]) =>
          x > minX - 0.05 &&
          x < maxX + 0.05 &&
          z > minZ - 0.05 &&
          z < maxZ + 0.05,
      );
    if (blocked) return Math.max(0.2, step - 0.15);
  }
  return maxDistance;
}

export { targetLineBlocked };

export function installTargeting(rt) {
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
  const segmentBlocked = rt.segmentBlocked;
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

  const projectilePool = createObjectPool({
    create: () => {
      const entity = rt.primitive(
        "cylinder",
        "Visible arrow",
        [0, 0, 0],
        [0.022, 0.38, 0.022],
        mats.gold,
      );
      const trail = rt.primitive(
        "box",
        "Arrow ember trail",
        [0, 0, 0],
        [0.012, 0.012, 0.18],
        mats.weaponTrail,
      );
      trail.castShadows = false;
      return {
        entity,
        trail,
        previous: { x: 0, y: 0, z: 0 },
        start: { x: 0, y: 0, z: 0 },
        end: { x: 0, y: 0, z: 0 },
        trailStart: new pc.Vec3(),
        trailEnd: new pc.Vec3(),
        elapsed: 0,
        duration: 0.08,
      };
    },
    activate: (projectile, spec) => {
      for (const point of ["previous", "start", "end"])
        Object.assign(projectile[point], spec[point]);
      projectile.elapsed = 0;
      projectile.duration = spec.duration;
      projectile.entity.setPosition(spec.start.x, spec.start.y, spec.start.z);
      projectile.entity.setEulerAngles(...spec.euler);
      projectile.entity.enabled = true;
      projectile.trail.setPosition(spec.start.x, spec.start.y, spec.start.z);
      projectile.trail.enabled = true;
    },
    deactivate: (projectile) => {
      projectile.entity.enabled = false;
      projectile.trail.enabled = false;
    },
  });
  const objectiveWorld = new pc.Vec3();
  const objectiveDirection = new pc.Vec3();

  function spawnArrow() {
    if (!state.playerEntity || !state.snapshot?.player) return;
    const player = state.predictedPlayer || state.snapshot.player;
    const horizontal = Math.cos(state.pitch);
    const forward = {
      x: Math.sin(state.yaw) * horizontal,
      y: Math.sin(state.pitch),
      z: -Math.cos(state.yaw) * horizontal,
    };
    const right = { x: Math.cos(state.yaw), z: Math.sin(state.yaw) };
    const start = {
      x: player.x + right.x * 0.28 + forward.x * 0.38,
      y: (player.y ?? floorHeightAt(player.x, player.z)) + 1.42,
      z: player.z + right.z * 0.28 + forward.z * 0.38,
    };
    const distance = visibleProjectileDistance({
      start,
      direction: forward,
      bounds: WORLD_BOUNDS,
      colliders: collidersForSnapshot(WORLD_COLLIDERS, state.snapshot),
    });
    state.projectiles.push(
      projectilePool.acquire({
        previous: start,
        start,
        euler: visibleArrowEuler(state.pitch, state.yaw),
        end: {
          x: start.x + forward.x * distance,
          y: start.y + forward.y * distance,
          z: start.z + forward.z * distance,
        },
        duration: Math.max(0.08, distance / 24),
      }),
    );
  }

  function prewarmProjectilePool() {
    projectilePool.warm(4);
    const probe = projectilePool.acquire({
      previous: { x: 0, y: 1, z: -2 },
      start: { x: 0, y: 1, z: -2 },
      end: { x: 0, y: 1, z: -2.1 },
      euler: [90, 0, 0],
      duration: 0.08,
    });
    state.app.once("postrender", () => projectilePool.release(probe));
  }

  function createObjectiveMarker() {
    const marker = new pc.Entity("Objective sun marker");
    state.app.root.addChild(marker);
    const diamond = rt.primitive(
      "box",
      "Objective diamond",
      [0, 0, 0],
      [0.22, 0.22, 0.045],
      mats.objective,
      marker,
    );
    diamond.setLocalEulerAngles(0, 0, 45);
    diamond.castShadows = false;
    const core = rt.primitive(
      "sphere",
      "Objective glow",
      [0, 0, 0],
      [0.34, 0.34, 0.12],
      mats.objectiveGlow,
      marker,
    );
    core.castShadows = false;
    const stem = rt.primitive(
      "box",
      "Objective stem",
      [0, -0.43, 0],
      [0.025, 0.48, 0.025],
      mats.objective,
      marker,
    );
    stem.castShadows = false;
    marker.enabled = false;
    state.objectiveMarker = marker;
  }

  function createTargetMarker() {
    state.targetMarker = null;
  }

  function setTargetRim(enemyId) {
    if (state.glowingTargetId === enemyId) return;
    const setGlow = (id, enabled) => {
      const entity = state.enemyEntities.get(id);
      const kind =
        state.snapshot?.enemies?.find((enemy) => enemy.id === id)?.kind ||
        "skirmisher";
      for (const render of entity?.dwarkaVisual?.findComponents("render") || [])
        for (const instance of render.meshInstances || []) {
          if (!instance.dwarkaTargetBaseMaterial)
            instance.dwarkaTargetBaseMaterial = instance.material;
          if (enabled) {
            instance.dwarkaTargetGlowMaterials ||= {};
            if (!instance.dwarkaTargetGlowMaterials[kind]) {
              const glow = instance.dwarkaTargetBaseMaterial.clone();
              glow.emissive = new pc.Color(...targetRimColor(kind));
              glow.emissiveIntensity = kind === "skirmisher" ? 1.05 : 0.7;
              glow.update();
              instance.dwarkaTargetGlowMaterials[kind] = glow;
            }
            instance.material = instance.dwarkaTargetGlowMaterials[kind];
          } else instance.material = instance.dwarkaTargetBaseMaterial;
        }
    };
    if (state.glowingTargetId) setGlow(state.glowingTargetId, false);
    if (enemyId) setGlow(enemyId, true);
    state.glowingTargetId = enemyId || null;
  }

  function updateBowTargeting(snapshot, dt) {
    ui.reticle.classList.remove("acquiring", "locked");
    ui.reticle.removeAttribute("data-target-label");
    if (
      !state.aim ||
      (!state.playing && !state.qaAimPreview) ||
      !snapshot?.player
    ) {
      state.targetEnemyId = null;
      setTargetRim(null);
      return;
    }
    const origin = state.predictedPlayer || snapshot.player;
    const openDoorIds = openDoorIdsForSnapshot(snapshot);
    const doorProgress = doorProgressForSnapshot(snapshot);
    const target = selectBowTarget({
      origin,
      yaw: state.yaw,
      pitch: state.pitch,
      enemies: snapshot.enemies,
      blocked: (enemy) =>
        segmentBlocked(origin, enemy, openDoorIds, doorProgress),
    });
    if (!target) {
      state.targetEnemyId = null;
      setTargetRim(null);
      const presentation = bowReticlePresentation({
        hasTarget: false,
        locked: false,
        cooldownActive: false,
        flightActive: state.projectiles.length > 0,
      });
      ui.reticle.classList.add(presentation.className);
      ui.reticle.setAttribute("data-target-label", rt.t(presentation.labelKey));
      return;
    }
    const desiredYaw = Math.atan2(target.x - origin.x, -(target.z - origin.z));
    const yawDelta = angleDifference(desiredYaw, state.yaw);
    const desiredPitch = Math.atan2(1.1 - 1.42, target.distance);
    const pitchDelta = desiredPitch - state.pitch;
    const inputIdle = performance.now() - state.lastMouseAt > 70;
    const assistStrength = pc.math.clamp(1 - Math.abs(yawDelta) / 0.42, 0, 1);
    if (inputIdle && Math.abs(yawDelta) < 0.42) {
      const adjustment =
        yawDelta * Math.min(0.22, dt * (2.4 + assistStrength * 2.2));
      state.yaw += adjustment;
      state.lookYaw += adjustment;
    }
    if (inputIdle && Math.abs(pitchDelta) < 0.24) {
      const adjustment = pitchDelta * Math.min(0.18, dt * 3.2);
      state.pitch += adjustment;
      state.lookPitch = Math.max(
        -0.58,
        Math.min(0.42, state.lookPitch + adjustment),
      );
    }
    const assistedForward = { x: Math.sin(state.yaw), z: -Math.cos(state.yaw) };
    const dx = target.x - origin.x,
      dz = target.z - origin.z;
    const assistedDot =
      (dx * assistedForward.x + dz * assistedForward.z) / target.distance;
    const assistedHeight = 1.42 + Math.tan(state.pitch) * target.distance;
    const locked = assistedDot > 0.83 && Math.abs(assistedHeight - 1.1) <= 0.85;
    const cooldownActive =
      performance.now() - state.lastVisualActionAt.fire < 750;
    const presentation = bowReticlePresentation({
      hasTarget: true,
      locked,
      cooldownActive,
      flightActive: state.projectiles.length > 0,
    });
    state.targetEnemyId = target.id;
    setTargetRim(target.id);
    ui.reticle.classList.add(presentation.className);
    ui.reticle.setAttribute(
      "data-target-label",
      `${rt.t(presentation.labelKey)} · ${Math.round(target.distance)} m`,
    );
  }

  function setObjectiveMarker(phase) {
    if (!state.objectiveMarker) return;
    const locations = {
      arrival: [0, 3.18, 14],
      courtyard: [22, 3.05, -2],
      market: [-20, 9.05, -32],
      doorway: [0, 9.05, -50],
      ending: [0, 9.05, -50],
    };
    state.objectiveTarget = locations[phase] || null;
    state.objectiveMarker.enabled = Boolean(state.objectiveTarget);
    if (state.objectiveTarget)
      state.objectiveMarker.setPosition(...state.objectiveTarget);
  }

  function updateObjectiveGuidance(snapshot) {
    if (
      !ui.waypoint ||
      !state.objectiveTarget ||
      !snapshot?.player ||
      !state.camera?.camera ||
      (!state.playing && !state.qaAimPreview)
    ) {
      if (ui.waypoint) ui.waypoint.hidden = true;
      return;
    }
    const distance = Math.hypot(
      state.objectiveTarget[0] - snapshot.player.x,
      state.objectiveTarget[2] - snapshot.player.z,
    );
    ui.waypointDistance.textContent = `${Math.round(distance)} m`;
    const width = canvas.clientWidth || window.innerWidth,
      height = canvas.clientHeight || window.innerHeight;
    const centreX = width / 2,
      centreY = height / 2;
    objectiveWorld.set(...state.objectiveTarget);
    const projected = state.camera.camera.worldToScreen(objectiveWorld);
    const cameraPosition = state.camera.getPosition();
    objectiveDirection.copy(objectiveWorld).sub(cameraPosition);
    const inFront = state.camera.forward.dot(objectiveDirection) > 0;
    let x = (projected.x * width) / Math.max(1, canvas.width),
      y = (projected.y * height) / Math.max(1, canvas.height);
    const minX = 58,
      maxX = width - 58,
      minY = 125,
      maxY = height - 84;
    const visible = inFront && x >= minX && x <= maxX && y >= minY && y <= maxY;
    const desiredYaw = Math.atan2(
      state.objectiveTarget[0] - snapshot.player.x,
      -(state.objectiveTarget[2] - snapshot.player.z),
    );
    const bearing = angleDifference(desiredYaw, state.yaw);
    if (!visible) {
      const vectorX = Math.sin(bearing),
        vectorY = -Math.cos(bearing);
      const availableX = vectorX >= 0 ? maxX - centreX : centreX - minX;
      const availableY = vectorY >= 0 ? maxY - centreY : centreY - minY;
      const amountX =
        Math.abs(vectorX) > 0.001
          ? availableX / Math.abs(vectorX)
          : Number.POSITIVE_INFINITY;
      const amountY =
        Math.abs(vectorY) > 0.001
          ? availableY / Math.abs(vectorY)
          : Number.POSITIVE_INFINITY;
      const amount = Math.min(amountX, amountY);
      x = centreX + vectorX * amount;
      y = centreY + vectorY * amount;
    }
    ui.waypoint.style.left = `${Math.round(x)}px`;
    ui.waypoint.style.top = `${Math.round(y)}px`;
    ui.waypoint.style.setProperty("--bearing", `${bearing}rad`);
    ui.waypoint.classList.toggle("edge", !visible);
    ui.waypoint.hidden = distance < 2.3;
  }

  rt.spawnArrow = spawnArrow;
  rt.createObjectiveMarker = createObjectiveMarker;
  rt.createTargetMarker = createTargetMarker;
  rt.prewarmProjectilePool = prewarmProjectilePool;
  rt.releaseProjectile = (projectile) => projectilePool.release(projectile);
  rt.projectilePoolStats = projectilePool.stats;
  rt.updateBowTargeting = updateBowTargeting;
  rt.setObjectiveMarker = setObjectiveMarker;
  rt.updateObjectiveGuidance = updateObjectiveGuidance;
}
