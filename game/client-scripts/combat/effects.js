import { attackWarningGlyph } from "./reticle.js";
import { createObjectPool } from "../runtime/object-pool.js";

export function separateEnemyVisuals(enemies, minimumDistance = 1.35) {
  const separated = enemies.map((enemy) => ({ ...enemy }));
  for (let pass = 0; pass < 6; pass += 1)
    for (let first = 0; first < separated.length; first += 1)
      for (let second = first + 1; second < separated.length; second += 1) {
        const a = separated[first];
        const b = separated[second];
        if (a.dead || b.dead) continue;
        let dx = a.x - b.x;
        let dz = a.z - b.z;
        let distance = Math.hypot(dx, dz);
        if (distance >= minimumDistance) continue;
        if (distance < 0.0001) {
          dx = String(a.id).localeCompare(String(b.id)) <= 0 ? -1 : 1;
          dz = 0;
          distance = 1;
        }
        const correction = (minimumDistance - distance) * 0.5 + 0.0005;
        const normalX = dx / distance;
        const normalZ = dz / distance;
        a.x += normalX * correction;
        a.z += normalZ * correction;
        b.x -= normalX * correction;
        b.z -= normalZ * correction;
      }
  return separated;
}

export function enemyActionAnimation({
  kind,
  dead,
  hitActive,
  warningActive,
  impactActive,
  visualSpeed,
}) {
  if (dead) return "down";
  if (hitActive) return "hit";
  if (warningActive)
    return kind === "archer"
      ? "archerWarn"
      : kind === "brute"
        ? "bruteWarn"
        : "melee";
  if (impactActive)
    return kind === "archer"
      ? "fire"
      : kind === "brute"
        ? "bruteWarn"
        : "melee";
  return visualSpeed > 0.18 ? "enemyWalk" : "idle";
}

export function visibleEnemyStates(snapshot) {
  const gatedEncounter = ["courtyard", "market", "doorway"].includes(
    snapshot?.phase,
  );
  return gatedEncounter && !snapshot?.family?.active
    ? []
    : snapshot?.enemies || [];
}

export function installEffects(rt) {
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

  const impactPool = createObjectPool({
    create: () => {
      const entity = rt.primitive(
        "sphere",
        "Pooled hit spark",
        [0, 0, 0],
        [0.045, 0.045, 0.045],
        mats.hitImpact,
      );
      entity.castShadows = false;
      return {
        entity,
        velocity: new pc.Vec3(),
        life: 0,
        duration: 0.46,
      };
    },
    activate: (impact, spec) => {
      impact.entity.name = spec.name;
      impact.entity.setPosition(...spec.position);
      impact.entity.setLocalScale(0.045, 0.045, 0.045);
      impact.entity.enabled = true;
      impact.velocity.set(...spec.velocity);
      impact.life = 0;
      impact.duration = spec.duration;
    },
    deactivate: (impact) => {
      impact.entity.enabled = false;
    },
  });

  function registerFireLight(light, baseIntensity, phase = 0) {
    light.tags.add("fire-light");
    light.dwarkaBaseIntensity = baseIntensity;
    light.dwarkaFlickerPhase = phase;
    if (!state.fireLights.includes(light)) state.fireLights.push(light);
  }

  function flickerFireLight(light, timeMs) {
    const phase = light.dwarkaFlickerPhase || 0;
    const lowFrequency = Math.sin(timeMs * 0.0067 + phase);
    const highFrequency = Math.sin(timeMs * 0.0173 + phase * 1.7);
    light.light.intensity =
      light.dwarkaBaseIntensity *
      (1 + lowFrequency * 0.12 + highFrequency * 0.045);
  }

  function upgradeFireEffect(root) {
    if (
      !root ||
      root.dwarkaParticleReady ||
      !state.vfxAssets.fire ||
      !state.vfxAssets.smoke
    )
      return false;
    for (const fallback of root.dwarkaFallback || []) fallback.destroy();
    root.dwarkaFallback = [];
    const size = root.dwarkaFireKind === "torch" ? 0.52 : 1;
    const flame = new pc.Entity("Kenney animated fire particles");
    flame.addComponent("particlesystem", {
      numParticles: root.dwarkaFireKind === "torch" ? 8 : 18,
      lifetime: 0.72,
      rate: 0.055,
      emitterShape: pc.EMITTERSHAPE_SPHERE,
      emitterRadius: 0.13 * size,
      colorMap: state.vfxAssets.fire.resource,
      animTilesX: 3,
      animTilesY: 3,
      animNumFrames: 9,
      animSpeed: 8,
      animLoop: true,
      localVelocityGraph: new pc.CurveSet(
        [0, 0, 1, 0],
        [0, 0.55 * size, 1, 1.15 * size],
        [0, 0, 1, 0],
      ),
      scaleGraph: new pc.Curve([
        0,
        0.22 * size,
        0.25,
        0.62 * size,
        0.72,
        0.42 * size,
        1,
        0,
      ]),
      alphaGraph: new pc.Curve([0, 0, 0.08, 1, 0.7, 0.82, 1, 0]),
      colorGraph: new pc.CurveSet(
        [0, 1, 1, 1],
        [0, 0.48, 1, 0.12],
        [0, 0.04, 1, 0],
      ),
      blendType: pc.BLEND_ADDITIVE,
      depthWrite: false,
      lighting: false,
      halfLambert: false,
    });
    flame.setLocalPosition(0, root.dwarkaFireKind === "torch" ? 0.08 : 0.14, 0);
    root.addChild(flame);
    const smoke = new pc.Entity("Kenney animated smoke particles");
    smoke.tags.add("smoke");
    smoke.addComponent("particlesystem", {
      numParticles: root.dwarkaFireKind === "torch" ? 5 : 12,
      lifetime: 2.6,
      rate: 0.24,
      emitterShape: pc.EMITTERSHAPE_SPHERE,
      emitterRadius: 0.1 * size,
      colorMap: state.vfxAssets.smoke.resource,
      animTilesX: 5,
      animTilesY: 5,
      animNumFrames: 25,
      animSpeed: 9,
      animLoop: false,
      localVelocityGraph: new pc.CurveSet(
        [0, -0.05, 1, 0.13],
        [0, 0.48 * size, 1, 0.9 * size],
        [0, -0.04, 1, 0.12],
      ),
      scaleGraph: new pc.Curve([
        0,
        0.16 * size,
        0.45,
        0.42 * size,
        1,
        0.7 * size,
      ]),
      alphaGraph: new pc.Curve([0, 0, 0.12, 0.32, 0.72, 0.18, 1, 0]),
      colorGraph: new pc.CurveSet(
        [0, 0.22, 1, 0.08],
        [0, 0.18, 1, 0.07],
        [0, 0.16, 1, 0.1],
      ),
      blendType: pc.BLEND_NORMAL,
      depthWrite: false,
      lighting: false,
      depthSoftening: 1,
    });
    smoke.setLocalPosition(0, root.dwarkaFireKind === "torch" ? 0.22 : 0.48, 0);
    root.addChild(smoke);
    root.dwarkaParticleReady = true;
    root.dwarkaFlameEmitter = flame;
    root.dwarkaSmokeEmitter = smoke;
    return true;
  }

  function createFireEffect(parent, position, kind) {
    const root = new pc.Entity(
      kind === "torch" ? "Torch fire particles" : "Brazier fire particles",
    );
    root.setLocalPosition(...position);
    root.tags.add("fire");
    root.dwarkaFireKind = kind;
    parent.addChild(root);
    const scale = kind === "torch" ? 0.55 : 1;
    const fallback = rt.primitive(
      "cone",
      "Loading flame",
      [0, kind === "torch" ? 0.05 : 0.34, 0],
      [0.3 * scale, 0.62 * scale, 0.3 * scale],
      mats.fireHot,
      root,
    );
    fallback.castShadows = false;
    root.dwarkaFallback = [fallback];
    state.fireEffects.push(root);
    upgradeFireEffect(root);
    return root;
  }

  function upgradeFireEffects() {
    for (const root of state.fireEffects) upgradeFireEffect(root);
  }

  function createBrazier(x, z, y = 0) {
    const bowl = rt.primitive(
      "cylinder",
      "Iron fire bowl",
      [x, y + 0.48, z],
      [0.72, 0.18, 0.72],
      mats.iron,
    );
    bowl.setLocalEulerAngles(0, 0, 0);
    rt.primitive(
      "cylinder",
      "Brazier stem",
      [x, y + 0.25, z],
      [0.12, 0.28, 0.12],
      mats.iron,
    );
    createFireEffect(state.app.root, [x, y + 0.73, z], "brazier");
    const light = new pc.Entity("Fire light");
    light.addComponent("light", {
      type: "omni",
      color: new pc.Color(1, 0.48, 0.18),
      intensity: 1.25,
      range: 7,
      castShadows: false,
    });
    light.setPosition(x, y + 1.35, z);
    registerFireLight(light, 1.25, x * 0.31 + z * 0.17);
    state.app.root.addChild(light);
  }

  function createWallTorch(x, y, z, facing = 0) {
    const torch = new pc.Entity("Wall torch");
    torch.setPosition(x, y, z);
    torch.setEulerAngles(0, facing, 0);
    state.app.root.addChild(torch);
    rt.primitive(
      "cylinder",
      "Torch bracket",
      [0, -0.28, 0.05],
      [0.045, 0.34, 0.045],
      mats.iron,
      torch,
    );
    createFireEffect(torch, [0, 0.15, 0], "torch");
    const light = new pc.Entity("Torch glow");
    light.addComponent("light", {
      type: "omni",
      color: new pc.Color(1, 0.52, 0.24),
      intensity: 0.9,
      range: 5.8,
      castShadows: false,
    });
    light.setPosition(x, y + 0.25, z);
    registerFireLight(light, 0.9, x * 0.23 + z * 0.19);
    state.app.root.addChild(light);
  }

  function syncEnemyWarning(enemy, entity) {
    let warning = state.enemyWarnings.get(enemy.id);
    if (!(enemy.warning > 0)) {
      if (warning) {
        warning.destroy();
        state.enemyWarnings.delete(enemy.id);
      }
      return;
    }
    const player = state.snapshot?.player;
    if (!player) return;
    if (!warning) {
      warning = new pc.Entity(`${enemy.kind} attack warning`);
      state.app.root.addChild(warning);
      state.enemyWarnings.set(enemy.id, warning);
      const glyphMaterial =
        enemy.kind === "archer"
          ? mats.warningWhite
          : enemy.kind === "brute"
            ? mats.warningRed
            : mats.warningAmber;
      const glyphRoot = new pc.Entity(
        `${attackWarningGlyph(enemy.kind)} warning glyph`,
      );
      warning.addChild(glyphRoot);
      glyphRoot.setLocalPosition(0, 2.5, 0);
      warning.dwarkaGlyphRoot = glyphRoot;
      warning.dwarkaGlyphs = [];
      const addGlyphPart = (name, position, scale, rotation = 0) => {
        const part = rt.primitive(
          "box",
          name,
          position,
          scale,
          glyphMaterial,
          glyphRoot,
        );
        part.setLocalEulerAngles(0, 0, rotation);
        part.castShadows = false;
        warning.dwarkaGlyphs.push(part);
      };
      if (enemy.kind === "archer") {
        addGlyphPart("Archer warning eye", [0, 0, 0], [0.42, 0.12, 0.025], 45);
        addGlyphPart(
          "Archer warning eye cross",
          [0, 0, 0],
          [0.42, 0.12, 0.025],
          -45,
        );
        addGlyphPart(
          "Archer warning arrow shaft",
          [0, -0.35, 0],
          [0.055, 0.27, 0.025],
        );
        addGlyphPart(
          "Archer warning arrow left",
          [-0.1, -0.55, 0],
          [0.055, 0.18, 0.025],
          45,
        );
        addGlyphPart(
          "Archer warning arrow right",
          [0.1, -0.55, 0],
          [0.055, 0.18, 0.025],
          -45,
        );
      } else if (enemy.kind === "brute") {
        addGlyphPart(
          "Brute warning mace head",
          [0, 0.03, 0],
          [0.35, 0.35, 0.03],
          45,
        );
        addGlyphPart(
          "Brute warning mace bar",
          [0, -0.18, 0],
          [0.42, 0.09, 0.03],
        );
        addGlyphPart(
          "Brute warning mace handle",
          [0, -0.43, 0],
          [0.075, 0.34, 0.03],
        );
      } else {
        addGlyphPart("Blade warning diamond", [0, 0, 0], [0.3, 0.3, 0.025], 45);
        addGlyphPart(
          "Blade warning exclamation",
          [0, -0.34, 0],
          [0.07, 0.26, 0.025],
        );
        addGlyphPart(
          "Blade warning point",
          [0, -0.63, 0],
          [0.09, 0.09, 0.025],
          45,
        );
      }
      if (enemy.kind === "archer") {
        warning.dwarkaTracerSegments = [];
        for (let index = 0; index < 7; index += 1) {
          const segment = rt.primitive(
            "box",
            "Archer dashed tracer",
            [0, 0.02, 0],
            [0.075, 0.018, 0.2],
            mats.warningWhite,
            warning,
          );
          segment.castShadows = false;
          warning.dwarkaTracerSegments.push(segment);
        }
      } else if (enemy.kind === "brute") {
        warning.dwarkaGroundDisc = rt.primitive(
          "plane",
          "Heavy strike radial decal",
          [0, 0.025, 0],
          [2.2, 1, 2.2],
          mats.warningGround,
          warning,
        );
        warning.dwarkaGroundDisc.castShadows = false;
      }
    }
    const floorY = enemy.y ?? floorHeightAt(enemy.x, enemy.z);
    warning.setPosition(enemy.x, floorY + 0.02, enemy.z);
    const windup = CHAPTER_CONFIG.enemyStats[enemy.kind]?.windup || 1;
    const progress = pc.math.clamp(1 - enemy.warning / windup, 0, 1);
    const glyphScale =
      0.82 + progress * 0.18 + Math.sin(performance.now() * 0.018) * 0.04;
    warning.dwarkaGlyphRoot?.setLocalScale(glyphScale, glyphScale, 1);
    if (warning.dwarkaGroundDisc) {
      const diameter = pc.math.lerp(2.2, 4.9, progress);
      warning.dwarkaGroundDisc.setLocalScale(diameter, 1, diameter);
    }
    if (enemy.kind === "archer") {
      const dx = player.x - enemy.x,
        dz = player.z - enemy.z,
        distance = Math.max(0.1, Math.hypot(dx, dz));
      warning.setEulerAngles(0, (Math.atan2(dx, dz) * 180) / Math.PI, 0);
      for (const [index, segment] of (
        warning.dwarkaTracerSegments || []
      ).entries()) {
        const stride = distance / 7;
        segment.setLocalPosition(0, 0.02, -(index + 0.55) * stride);
        segment.setLocalScale(0.075, 0.018, Math.max(0.12, stride * 0.44));
      }
    }
    warning.dwarkaGlyphRoot?.lookAt(state.camera.getPosition());
    warning.dwarkaGlyphRoot?.rotateLocal(0, 180, 0);
  }

  function ensureEnemyHealthBar(entity) {
    if (entity.dwarkaHealthBar) return entity.dwarkaHealthBar;
    const anchor = new pc.Entity("Enemy health bar");
    entity.addChild(anchor);
    anchor.setLocalPosition(0, 2.18, 0);
    const background = rt.primitive(
      "box",
      "Enemy health track",
      [0, 0, 0],
      [0.96, 0.075, 0.045],
      mats.healthBack,
      anchor,
    );
    background.castShadows = false;
    const fill = rt.primitive(
      "box",
      "Enemy health remaining",
      [0, 0, -0.03],
      [0.88, 0.045, 0.055],
      mats.healthEnemy,
      anchor,
    );
    fill.castShadows = false;
    entity.dwarkaHealthBar = { anchor, fill };
    return entity.dwarkaHealthBar;
  }

  function spawnImpactBurst(enemy, defeated = false) {
    const count = defeated ? 9 : 6;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + (defeated ? 0.2 : 0);
      const speed = (defeated ? 1.65 : 1.15) + (index % 3) * 0.24;
      state.impacts.push(
        impactPool.acquire({
          name: defeated ? "Defeat spark" : "Confirmed hit spark",
          position: [
            enemy.x,
            (enemy.y ?? floorHeightAt(enemy.x, enemy.z)) +
              1.15 +
              (index % 2) * 0.13,
            enemy.z,
          ],
          velocity: [
            Math.cos(angle) * speed,
            1.35 + (index % 4) * 0.22,
            Math.sin(angle) * speed,
          ],
          duration: defeated ? 0.68 : 0.46,
        }),
      );
    }
    rt.playEffect(defeated ? "hitHeavy" : "hitLight", defeated ? 0.84 : 0.66);
  }

  function prewarmImpactPool() {
    impactPool.warm(18);
    const probe = impactPool.acquire({
      name: "Hit shader warmup",
      position: [0.12, 1, -2],
      velocity: [0, 0, 0],
      duration: 0.08,
    });
    state.app.once("postrender", () => impactPool.release(probe));
  }

  function syncEnemyHealth(enemy, entity) {
    const healthBar = ensureEnemyHealthBar(entity);
    const maxHealth = Math.max(
      1,
      Number(enemy.maxHealth) ||
        (enemy.kind === "brute" ? 110 : enemy.kind === "archer" ? 45 : 60),
    );
    const ratio = pc.math.clamp((Number(enemy.health) || 0) / maxHealth, 0, 1);
    healthBar.fill.setLocalScale(0.88 * ratio, 0.045, 0.055);
    healthBar.fill.setLocalPosition(-0.44 * (1 - ratio), 0, -0.03);
    healthBar.anchor.enabled = !enemy.dead && (ratio < 1 || enemy.warning > 0);
    const previous = state.enemyHealth.get(enemy.id);
    if (Number.isFinite(previous) && enemy.health < previous) {
      spawnImpactBurst(enemy, Boolean(enemy.dead));
      entity.dwarkaHitUntil = performance.now() + 420;
      state.hitStopUntil = Math.max(
        state.hitStopUntil,
        performance.now() + (enemy.dead ? 88 : 75),
      );
    }
    state.enemyHealth.set(enemy.id, enemy.health);
  }

  function smoothEnemyFacing(entity, targetX, targetZ, dt) {
    const position = entity.getPosition();
    if (Math.hypot(targetX - position.x, targetZ - position.z) < 0.001) return;
    const current = entity.getEulerAngles().y;
    entity.lookAt(targetX, position.y, targetZ);
    const desired = entity.getEulerAngles().y;
    const delta = ((desired - current + 540) % 360) - 180;
    const blend = 1 - Math.exp(-Math.min(0.05, dt) / 0.15);
    entity.setEulerAngles(0, current + delta * blend, 0);
  }

  function bufferedEnemies(snapshot) {
    const visibleEnemies = visibleEnemyStates(snapshot);
    if (state.localMode || state.networkSnapshots.length < 2)
      return separateEnemyVisuals(visibleEnemies);
    const targetTime =
      state.interpolationClockMs - CHAPTER_CONFIG.network.enemyInterpolationMs;
    let before = state.networkSnapshots[0];
    let after = state.networkSnapshots[state.networkSnapshots.length - 1];
    for (let index = 1; index < state.networkSnapshots.length; index += 1) {
      if (state.networkSnapshots[index].receivedAt >= targetTime) {
        after = state.networkSnapshots[index];
        before = state.networkSnapshots[index - 1];
        break;
      }
      before = state.networkSnapshots[index];
    }
    if (before.snapshot.phase !== after.snapshot.phase)
      return separateEnemyVisuals(visibleEnemyStates(after.snapshot));
    const span = Math.max(1, after.receivedAt - before.receivedAt);
    const amount = pc.math.clamp((targetTime - before.receivedAt) / span, 0, 1);
    const prior = new Map(
      visibleEnemyStates(before.snapshot).map((enemy) => [enemy.id, enemy]),
    );
    const seconds = span / 1000;
    const velocities = new Map();
    const sampled = visibleEnemyStates(after.snapshot).map((enemy) => {
      const start = prior.get(enemy.id);
      if (!start) return enemy;
      const velocity = {
        x: (enemy.x - start.x) / seconds,
        z: (enemy.z - start.z) / seconds,
      };
      velocities.set(enemy.id, velocity);
      return {
        ...enemy,
        x: pc.math.lerp(start.x, enemy.x, amount),
        z: pc.math.lerp(start.z, enemy.z, amount),
      };
    });
    state.enemySnapshotVelocities = velocities;
    return separateEnemyVisuals(sampled);
  }

  function syncEnemies(enemies, dt) {
    const active = new Set();
    for (const enemy of enemies || []) {
      active.add(enemy.id);
      let entity = state.enemyEntities.get(enemy.id);
      if (!entity) {
        entity = rt.createCharacter(
          enemy.kind,
          enemy.kind === "archer"
            ? mats.archer
            : enemy.kind === "brute"
              ? mats.brute
              : mats.enemy,
          enemy.kind === "brute" ? 1.22 : 0.92,
        );
        entity.dwarkaFloorY = enemy.y ?? floorHeightAt(enemy.x, enemy.z);
        entity.setPosition(
          enemy.x,
          entity.dwarkaFloorY + CHARACTER_GROUND_LIFT * entity.dwarkaScale,
          enemy.z,
        );
        state.enemyEntities.set(enemy.id, entity);
      }
      const visualNow = performance.now();
      if (enemy.dead && !entity.dwarkaDeadAt) entity.dwarkaDeadAt = visualNow;
      else if (!enemy.dead) entity.dwarkaDeadAt = 0;
      entity.enabled = !enemy.dead || visualNow - entity.dwarkaDeadAt < 800;
      const previousPosition = entity.getPosition().clone();
      entity.dwarkaFloorY = enemy.y ?? floorHeightAt(enemy.x, enemy.z);
      entity.setPosition(
        enemy.x,
        entity.dwarkaFloorY + CHARACTER_GROUND_LIFT * entity.dwarkaScale,
        enemy.z,
      );
      const measuredVelocity =
        dt > 0.0001
          ? {
              x: (enemy.x - previousPosition.x) / dt,
              z: (enemy.z - previousPosition.z) / dt,
            }
          : state.enemySnapshotVelocities.get(enemy.id) || { x: 0, z: 0 };
      const velocity = (entity.dwarkaVisualVelocity ||= { x: 0, z: 0 });
      const velocityBlend =
        1 - Math.exp(-Math.min(0.05, Math.max(0, dt)) / 0.12);
      velocity.x += (measuredVelocity.x - velocity.x) * velocityBlend;
      velocity.z += (measuredVelocity.z - velocity.z) * velocityBlend;
      const visualSpeed = Math.hypot(velocity.x, velocity.z);
      if (enemy.warning > 0) {
        const pulse = 1 + Math.sin(performance.now() * 0.025) * 0.06;
        entity.setLocalScale(pulse, pulse, pulse);
      } else entity.setLocalScale(1, 1, 1);
      const warningActive = enemy.warning > 0;
      if (entity.dwarkaWarningActive && !warningActive && !enemy.dead)
        entity.dwarkaImpactUntil =
          performance.now() + (enemy.kind === "brute" ? 760 : 520);
      entity.dwarkaWarningActive = warningActive;
      syncEnemyHealth(enemy, entity);
      const hitActive = performance.now() < (entity.dwarkaHitUntil || 0);
      const impactActive = performance.now() < (entity.dwarkaImpactUntil || 0);
      const actionAnimation = enemyActionAnimation({
        kind: enemy.kind,
        dead: enemy.dead,
        hitActive,
        warningActive,
        impactActive,
        visualSpeed,
      });
      rt.setCharacterAnimation(
        entity,
        state.qaAnimationPreviews.get(enemy.kind) || actionAnimation,
        visualSpeed,
      );
      rt.groundAnimatedCharacter(entity, dt);
      rt.syncEquipmentSockets(entity);
      rt.updateWeaponEffects(entity);
      syncEnemyWarning(enemy, entity);
      const player = state.snapshot?.player;
      if (warningActive || impactActive || visualSpeed <= 0.18) {
        if (player) smoothEnemyFacing(entity, player.x, player.z, dt);
      } else
        smoothEnemyFacing(
          entity,
          entity.getPosition().x + velocity.x,
          entity.getPosition().z + velocity.z,
          dt,
        );
    }
    for (const [id, entity] of state.enemyEntities)
      if (!active.has(id)) {
        state.characterRoots.delete(entity);
        entity.destroy();
        state.enemyEntities.delete(id);
        state.enemyHealth.delete(id);
        const warning = state.enemyWarnings.get(id);
        warning?.destroy();
        state.enemyWarnings.delete(id);
      }
  }

  rt.registerFireLight = registerFireLight;
  rt.flickerFireLight = flickerFireLight;
  rt.upgradeFireEffect = upgradeFireEffect;
  rt.createFireEffect = createFireEffect;
  rt.upgradeFireEffects = upgradeFireEffects;
  rt.createBrazier = createBrazier;
  rt.createWallTorch = createWallTorch;
  rt.syncEnemyWarning = syncEnemyWarning;
  rt.ensureEnemyHealthBar = ensureEnemyHealthBar;
  rt.spawnImpactBurst = spawnImpactBurst;
  rt.prewarmImpactPool = prewarmImpactPool;
  rt.releaseImpact = (impact) => impactPool.release(impact);
  rt.impactPoolStats = impactPool.stats;
  rt.syncEnemyHealth = syncEnemyHealth;
  rt.smoothEnemyFacing = smoothEnemyFacing;
  rt.bufferedEnemies = bufferedEnemies;
  rt.syncEnemies = syncEnemies;
}
