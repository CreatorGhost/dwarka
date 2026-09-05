import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ChapterSimulation } from "../../game/server/src/chapter-1/simulation.ts";

const targetingUrl = new URL(
  "../../game/client-scripts/combat/targeting.js",
  import.meta.url,
);

function replaceRequired(source, current, replacement) {
  assert.ok(source.includes(current), `negative-control seam missing: ${current}`);
  return source.replace(current, replacement);
}

async function loadTargeting() {
  if (process.env.DWARKA_TARGET_NEGATIVE_CONTROL !== "legacy-hysteresis")
    return import(targetingUrl.href);

  let source = readFileSync(targetingUrl, "utf8");
  source = replaceRequired(
    source,
    `import {
  bowReticlePresentation,
  targetRimColor,
  visibleArrowEuler,
} from "./reticle.js";`,
    `const bowReticlePresentation = ({ hasTarget, locked }) => ({
  className: hasTarget && locked ? "locked" : "acquiring",
  labelKey: "target",
});
const targetRimColor = () => [1, 1, 1];
const visibleArrowEuler = () => [0, 0, 0];`,
  );
  source = replaceRequired(
    source,
    'import { createObjectPool } from "../runtime/object-pool.js";',
    `const createObjectPool = ({ create, activate, deactivate }) => ({
  acquire(spec) {
    const item = create();
    activate(item, spec);
    return item;
  },
  release(item) {
    deactivate(item);
    return true;
  },
  warm() {},
  stats: () => ({}),
});`,
  );
  source = replaceRequired(
    source,
    `import {
  DOORS,
  doorColliderAtProgress,
  segmentBlocked as targetLineBlocked,
} from "../../server/src/chapter-1/collision.ts";`,
    `const DOORS = [];
const doorColliderAtProgress = () => null;
const targetLineBlocked = () => false;`,
  );
  source = replaceRequired(
    source,
    `    const target = selectBowTarget({
      origin,
      yaw: state.yaw,
      pitch: state.pitch,
      enemies: snapshot.enemies,
      blocked: (enemy) =>
        segmentBlocked(origin, enemy, openDoorIds, doorProgress),
    });`,
    `    let target = selectBowTarget({
      origin,
      yaw: state.yaw,
      pitch: state.pitch,
      enemies: snapshot.enemies,
      blocked: (enemy) =>
        segmentBlocked(origin, enemy, openDoorIds, doorProgress),
    });
    const previousTarget = state.targetEnemyId
      ? selectBowTarget({
          origin,
          yaw: state.yaw,
          pitch: state.pitch,
          enemies: snapshot.enemies.filter(
            (enemy) => enemy.id === state.targetEnemyId,
          ),
          blocked: (enemy) =>
            segmentBlocked(origin, enemy, openDoorIds, doorProgress),
        })
      : null;
    if (
      previousTarget &&
      (!target || previousTarget.score <= target.score + 0.22)
    )
      target = previousTarget;`,
  );
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
}

const { angleDifference, installTargeting } = await loadTargeting();
const origin = { x: 22, y: 0, z: 12 };

class Vec3 {
  set(x, y, z) {
    Object.assign(this, { x, y, z });
    return this;
  }
}

function enemy(id, x, z, overrides = {}) {
  return { id, kind: "skirmisher", x, y: 0, z, dead: false, ...overrides };
}

function targetingRuntime(snapshot, { blocked = () => false } = {}) {
  const classes = new Set();
  const state = {
    aim: true,
    playing: true,
    qaAimPreview: false,
    predictedPlayer: null,
    yaw: 0,
    pitch: -0.032,
    lookYaw: 0,
    lookPitch: -0.032,
    targetEnemyId: null,
    glowingTargetId: null,
    enemyEntities: new Map(),
    projectiles: [],
    lastMouseAt: performance.now(),
    lastVisualActionAt: { fire: Number.NEGATIVE_INFINITY },
    snapshot,
  };
  const rt = {
    state,
    ui: {
      reticle: {
        classList: {
          add: (...names) => names.forEach((name) => classes.add(name)),
          remove: (...names) => names.forEach((name) => classes.delete(name)),
        },
        removeAttribute() {},
        setAttribute() {},
      },
    },
    pc: {
      Vec3,
      math: { clamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
    },
    mats: {},
    angleDifference,
    segmentBlocked: blocked,
    t: (key) => key,
  };
  installTargeting(rt);
  return rt;
}

test("installed bow targeting drops a previous near-equal target when candidates cross", () => {
  const firstFrame = {
    player: { ...origin },
    enemies: [enemy("left", 21.8, 2), enemy("right", 22.05, 2)],
    doors: [],
  };
  const rt = targetingRuntime(firstFrame);
  rt.updateBowTargeting(firstFrame, 0);
  assert.equal(rt.state.targetEnemyId, "right");

  const crossedFrame = {
    ...firstFrame,
    enemies: [enemy("left", 22.02, 2), enemy("right", 22.18, 2)],
  };
  rt.state.snapshot = crossedFrame;
  rt.updateBowTargeting(crossedFrame, 0);
  assert.equal(rt.state.targetEnemyId, "left");
});

test("installed bow targeting rejects blocked, dead, and out-of-range candidates", () => {
  const snapshot = {
    player: { ...origin },
    enemies: [
      enemy("blocked", 22, 2),
      enemy("dead", 22, 4, { dead: true }),
      enemy("distant", 22, -12),
      enemy("valid", 22.1, 1),
    ],
    doors: [],
  };
  const rt = targetingRuntime(snapshot, {
    blocked: (_start, candidate) => candidate.id === "blocked",
  });
  rt.updateBowTargeting(snapshot, 0);
  assert.equal(rt.state.targetEnemyId, "valid");
});

test("installed bow targeting rejects an otherwise valid enemy outside the aim arc", () => {
  const snapshot = {
    player: { ...origin },
    enemies: [enemy("off-arc", 32, 12)],
    doors: [],
  };
  const rt = targetingRuntime(snapshot);
  rt.updateBowTargeting(snapshot, 0);
  assert.equal(rt.state.targetEnemyId, null);
});

test("installed bow targeting accepts and rejects either side of the height boundary", () => {
  const snapshot = {
    player: { ...origin },
    enemies: [enemy("height-boundary", 22, 2)],
    doors: [],
  };
  const distance = 10;

  // 0.85 exactly is unrepresentable after atan; test either side instead.
  for (const arrowHeight of [1.1 - 0.849, 1.1 + 0.849]) {
    const rt = targetingRuntime(snapshot);
    rt.state.pitch = Math.atan((arrowHeight - 1.42) / distance);
    rt.updateBowTargeting(snapshot, 0);
    assert.equal(rt.state.targetEnemyId, "height-boundary");
  }

  for (const arrowHeight of [1.1 - 0.851, 1.1 + 0.851]) {
    const rt = targetingRuntime(snapshot);
    rt.state.pitch = Math.atan((arrowHeight - 1.42) / distance);
    rt.updateBowTargeting(snapshot, 0);
    assert.equal(rt.state.targetEnemyId, null);
  }
});

test("installed bow targeting keeps server roster order on an exact tie", () => {
  const snapshot = {
    player: { ...origin },
    enemies: [enemy("z-first", 22, 2), enemy("a-second", 22, 2)],
    doors: [],
  };
  const rt = targetingRuntime(snapshot);
  rt.updateBowTargeting(snapshot, 0);
  assert.equal(rt.state.targetEnemyId, "z-first");
});

test("the installed client target is the enemy the server damages", () => {
  const simulation = new ChapterSimulation("target-regression", "courtyard");
  Object.assign(simulation.player, origin);
  simulation.enemies = simulation.enemies.slice(0, 2);
  Object.assign(simulation.enemies[0], { x: 22, y: 0, z: 2, health: 60 });
  Object.assign(simulation.enemies[1], { x: 22.2, y: 0, z: 2, health: 60 });
  const snapshot = simulation.snapshot();
  const rt = targetingRuntime(snapshot);
  rt.updateBowTargeting(snapshot, 0);
  const selectedId = rt.state.targetEnemyId;
  assert.ok(selectedId);

  simulation.acceptInput({
    type: "input",
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: -0.032,
    held: ["aim"],
    pressed: ["fire"],
  });
  for (let tick = 0; tick < 10; tick += 1) simulation.tick(0.05);

  assert.equal(
    simulation.enemies.find(({ id }) => id === selectedId)?.health,
    30,
  );
  assert.equal(
    simulation.enemies.find(({ id }) => id !== selectedId)?.health,
    60,
  );
});
