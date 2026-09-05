import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ChapterSimulation } from "../../game/server/src/chapter-1/simulation.ts";
import {
  COLLIDERS,
  DOORS,
  DOOR_COLLIDERS,
  WORLD_BOUNDS,
  doorColliderAtProgress,
  segmentBlocked,
} from "../../game/server/src/chapter-1/collision.ts";

const targetingUrl = new URL(
  "../../game/client-scripts/combat/targeting.js",
  import.meta.url,
);
const loopUrl = new URL(
  "../../game/client-scripts/runtime/loop.js",
  import.meta.url,
);

function replaceRequired(source, current, replacement) {
  assert.ok(source.includes(current), `negative-control seam missing: ${current}`);
  return source.replace(current, replacement);
}

function absoluteTargetingImports(source) {
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
  return replaceRequired(
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
}

async function loadRuntimeModules() {
  if (process.env.DWARKA_DOOR_NEGATIVE_CONTROL !== "legacy-raw-colliders")
    return Promise.all([import(targetingUrl.href), import(loopUrl.href)]);

  let targetingSource = absoluteTargetingImports(readFileSync(targetingUrl, "utf8"));
  targetingSource = replaceRequired(
    targetingSource,
    `blocked: (enemy) =>
        segmentBlocked(origin, enemy, openDoorIds, doorProgress),`,
    "blocked: (enemy) => segmentBlocked(origin, enemy),",
  );
  targetingSource = replaceRequired(
    targetingSource,
    "colliders: collidersForSnapshot(WORLD_COLLIDERS, state.snapshot),",
    "colliders: WORLD_COLLIDERS,",
  );

  let loopSource = readFileSync(loopUrl, "utf8");
  loopSource = replaceRequired(
    loopSource,
    'import { collidersForSnapshot } from "../combat/targeting.js";',
    "const collidersForSnapshot = (colliders) => colliders;",
  );
  loopSource = replaceRequired(
    loopSource,
    "colliders: collidersForSnapshot(WORLD_COLLIDERS, state.snapshot),",
    "colliders: WORLD_COLLIDERS,",
  );

  return Promise.all(
    [targetingSource, loopSource].map((source) =>
      import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`),
    ),
  );
}

const [{ angleDifference, installTargeting }, { installLoop }] =
  await loadRuntimeModules();
const clientColliders = COLLIDERS.map((box) => [
  box.minX,
  box.maxX,
  box.minZ,
  box.maxZ,
  box.id,
  box.id,
]);
const phaseOrder = ["arrival", "courtyard", "market", "doorway", "ending"];

class Vec3 {
  set(x, y, z) {
    Object.assign(this, { x, y, z });
    return this;
  }
}

function fakeEntity() {
  return {
    enabled: false,
    castShadows: true,
    setPosition(x, y, z) {
      this.position = { x, y, z };
    },
    setEulerAngles(...euler) {
      this.euler = euler;
    },
  };
}

function crossingForBox(box, margin = 0.7) {
  const centreX = (box.minX + box.maxX) / 2;
  const centreZ = (box.minZ + box.maxZ) / 2;
  const thinX = box.maxX - box.minX < box.maxZ - box.minZ;
  const start = thinX
    ? { x: box.minX - margin, y: box.y, z: centreZ }
    : { x: centreX, y: box.y, z: box.minZ - margin };
  const end = thinX
    ? { x: box.maxX + margin, y: box.y, z: centreZ }
    : { x: centreX, y: box.y, z: box.maxZ + margin };
  const distance = Math.hypot(end.x - start.x, end.z - start.z);
  return {
    box,
    start,
    end,
    distance,
    yaw: Math.atan2(end.x - start.x, -(end.z - start.z)),
    pitch: Math.atan2(1.1 - 1.42, distance),
  };
}

function crossingFor(doorId, margin = 0.7) {
  const box = DOOR_COLLIDERS.find(({ id }) => id === doorId);
  assert.ok(box);
  return crossingForBox(box, margin);
}

function captureAtCrossing(simulation, crossing, doorId) {
  Object.assign(simulation.player, crossing.start);
  const priorEnemies = simulation.enemies;
  simulation.enemies = [
    {
      id: `${doorId}-target`,
      kind: "skirmisher",
      ...crossing.end,
      yaw: 0,
      health: 60,
      maxHealth: 60,
      warning: 0,
      attackCooldown: 0,
      dead: false,
    },
  ];
  const snapshot = simulation.snapshot();
  simulation.enemies = priorEnemies;
  return snapshot;
}

function snapshotAtCrossing(snapshot, crossing, targetId) {
  return {
    ...snapshot,
    player: { ...snapshot.player, ...crossing.start },
    enemies: [
      {
        id: targetId,
        kind: "skirmisher",
        ...crossing.end,
        yaw: 0,
        health: 60,
        maxHealth: 60,
        warning: 0,
        attackCooldown: 0,
        dead: false,
      },
    ],
  };
}

function doorSnapshots(door, crossing) {
  const simulation = new ChapterSimulation(
    `door-regression-${door.id}`,
    door.openFromPhase,
  );
  simulation.loadPhase(door.openFromPhase, { activateEncounter: false });
  const closed = captureAtCrossing(simulation, crossing, door.id);

  Object.assign(simulation.player, {
    x: door.position[0],
    y: crossing.box.y,
    z: door.position[2],
  });
  const ticksToOpen = Math.ceil((door.swingSeconds ?? 0.45) / 0.05);
  for (let tick = 0; tick < Math.floor(ticksToOpen / 2); tick += 1)
    simulation.tick(0.05);
  const opening = captureAtCrossing(simulation, crossing, door.id);
  for (let tick = Math.floor(ticksToOpen / 2); tick < ticksToOpen; tick += 1)
    simulation.tick(0.05);
  const open = captureAtCrossing(simulation, crossing, door.id);

  simulation.loadPhase(door.openFromPhase, { activateEncounter: false });
  const retry = captureAtCrossing(simulation, crossing, door.id);
  const priorPhase = phaseOrder[phaseOrder.indexOf(door.openFromPhase) - 1];
  simulation.loadPhase(priorPhase, { activateEncounter: false });
  const phaseReset = captureAtCrossing(simulation, crossing, door.id);
  return { closed, opening, open, retry, phaseReset };
}

function installedRuntime(snapshot, crossing) {
  const state = {
    aim: true,
    playing: true,
    qaAimPreview: false,
    predictedPlayer: null,
    yaw: crossing.yaw,
    pitch: crossing.pitch,
    lookYaw: crossing.yaw,
    lookPitch: crossing.pitch,
    targetEnemyId: null,
    glowingTargetId: null,
    enemyEntities: new Map(),
    projectiles: [],
    playerEntity: {},
    lastMouseAt: performance.now(),
    lastVisualActionAt: { fire: Number.NEGATIVE_INFINITY },
    snapshot,
  };
  const rt = {
    state,
    ui: {
      reticle: {
        classList: { add() {}, remove() {} },
        removeAttribute() {},
        setAttribute() {},
      },
    },
    pc: {
      Vec3,
      math: { clamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
    },
    mats: { gold: {}, weaponTrail: {} },
    WORLD_BOUNDS,
    WORLD_COLLIDERS: clientColliders,
    floorHeightAt: () => crossing.box.y,
    angleDifference,
    segmentBlocked,
    primitive: fakeEntity,
    t: (key) => key,
  };
  installTargeting(rt);
  installLoop(rt);
  return rt;
}

function projectileDistance(projectile) {
  return Math.hypot(
    projectile.end.x - projectile.start.x,
    projectile.end.y - projectile.start.y,
    projectile.end.z - projectile.start.z,
  );
}

function doorState(snapshot, doorId) {
  return snapshot.doors.find(({ id }) => id === doorId);
}

for (const door of DOORS.filter(({ openFromPhase }) => openFromPhase)) {
  const crossing = crossingFor(door.id);
  const snapshots = doorSnapshots(door, crossing);

  test(`${door.id} simulation snapshots cover closed, opening, open, retry, and phase reset`, () => {
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(snapshots).map(([name, snapshot]) => [
          name,
          doorState(snapshot, door.id).open,
        ]),
      ),
      {
        closed: false,
        opening: false,
        open: true,
        retry: false,
        phaseReset: false,
      },
    );
    assert.ok(doorState(snapshots.opening, door.id).progress > 0);
    assert.ok(doorState(snapshots.opening, door.id).progress < 1);
  });

  test(`${door.id} installed targeting follows simulation open/reset state`, () => {
    const rt = installedRuntime(snapshots.closed, crossing);
    const targetByState = {};
    for (const [name, snapshot] of Object.entries(snapshots)) {
      rt.state.snapshot = snapshot;
      rt.state.lastMouseAt = performance.now();
      rt.updateBowTargeting(snapshot, 0);
      targetByState[name] = rt.state.targetEnemyId;
    }
    const targetId = `${door.id}-target`;
    assert.deepEqual(targetByState, {
      closed: null,
      opening: null,
      open: targetId,
      retry: null,
      phaseReset: null,
    });
  });

  test(`${door.id} installed visible-arrow path follows simulation open/reset state`, () => {
    const rt = installedRuntime(snapshots.closed, crossing);
    const arrowByState = {};
    for (const [name, snapshot] of Object.entries(snapshots)) {
      rt.state.snapshot = snapshot;
      rt.spawnArrow();
      arrowByState[name] = projectileDistance(rt.state.projectiles.at(-1));
    }
    assert.ok(arrowByState.open > arrowByState.closed + 0.3);
    assert.ok(arrowByState.open > arrowByState.opening + 0.3);
    assert.equal(arrowByState.retry, arrowByState.closed);
    assert.equal(arrowByState.phaseReset, arrowByState.closed);
  });

  test(`${door.id} installed camera path follows simulation open/reset state`, () => {
    const rt = installedRuntime(snapshots.closed, crossing);
    const cameraByState = {};
    const cameraTarget = { ...crossing.start, y: crossing.start.y + 1.6 };
    const cameraDesired = { ...crossing.end, y: crossing.end.y + 1.6 };
    for (const [name, snapshot] of Object.entries(snapshots)) {
      rt.state.snapshot = snapshot;
      cameraByState[name] = rt.segmentCameraDistance(
        cameraTarget,
        cameraDesired,
      );
    }
    assert.equal(cameraByState.open, crossing.distance);
    assert.ok(cameraByState.closed < cameraByState.open);
    assert.equal(cameraByState.opening, cameraByState.closed);
    assert.equal(cameraByState.retry, cameraByState.closed);
    assert.equal(cameraByState.phaseReset, cameraByState.closed);
  });

  test(`${door.id} open leaf remains solid beside the cleared aperture`, () => {
    const leafCrossing = crossingForBox(doorColliderAtProgress(door, 1));
    const snapshot = snapshotAtCrossing(
      snapshots.open,
      leafCrossing,
      `${door.id}-leaf-target`,
    );
    const rt = installedRuntime(snapshot, leafCrossing);

    rt.updateBowTargeting(snapshot, 0);
    assert.equal(rt.state.targetEnemyId, null);

    rt.spawnArrow();
    assert.ok(
      projectileDistance(rt.state.projectiles.at(-1)) < leafCrossing.distance,
    );

    const cameraTarget = {
      ...leafCrossing.start,
      y: leafCrossing.start.y + 1.6,
    };
    const cameraDesired = {
      ...leafCrossing.end,
      y: leafCrossing.end.y + 1.6,
    };
    assert.ok(
      rt.segmentCameraDistance(cameraTarget, cameraDesired) <
        leafCrossing.distance,
    );
  });
}
