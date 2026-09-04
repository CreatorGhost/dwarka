import assert from "node:assert/strict";
import test from "node:test";
import {
  COLLIDERS,
  collides,
  DOOR_COLLIDERS,
  DOORS,
  doorColliderFromTransform,
  floorHeightAt,
  moveWithCollision,
  segmentBlocked,
} from "../src/chapter-1/collision.ts";
import {
  CHECKPOINTS,
  FAMILY_POSITIONS,
  PHASES,
  type CombatPhase,
  type PhaseId,
} from "../src/chapter-1/phases.ts";
import {
  ChapterSimulation,
  sanitizeInput,
} from "../src/chapter-1/simulation.ts";
import worldLayout from "../../client-scripts/world-layout.json" with { type: "json" };

const playerId = "12345678-1234-4234-9234-123456789abc";

function yawToTarget(
  from: { x: number; z: number },
  target: { x: number; z: number },
): number {
  return Math.atan2(target.x - from.x, -(target.z - from.z));
}

function angleError(target: number, current: number): number {
  return Math.abs(
    Math.atan2(Math.sin(target - current), Math.cos(target - current)),
  );
}

test("the canonical world layout has valid placements and uniquely named colliders", () => {
  assert.equal(
    new Set(worldLayout.colliders.map(({ id }) => id)).size,
    worldLayout.colliders.length,
  );
  for (const collider of worldLayout.colliders) {
    assert.ok(
      [collider.minX, collider.maxX, collider.minZ, collider.maxZ].every(
        Number.isFinite,
      ),
      `${collider.id} has a non-finite bound`,
    );
    assert.ok(
      collider.minX < collider.maxX && collider.minZ < collider.maxZ,
      `${collider.id} has an inverted or empty bound`,
    );
    if ("visual" in collider && collider.visual)
      assert.ok(
        collider.visual in worldLayout.placements,
        `${collider.id} references a missing visual prefab`,
      );
  }
  for (const [model, placements] of Object.entries(worldLayout.placements)) {
    assert.ok(placements.length > 0, `${model} has no placements`);
    for (const placement of placements) {
      assert.equal(
        placement.length,
        5,
        `${model} placement must be [x,y,z,yaw,scale]`,
      );
      assert.ok(
        placement.every(Number.isFinite),
        `${model} placement has a non-finite transform`,
      );
      assert.ok(placement[4] > 0, `${model} placement scale must be positive`);
    }
  }
  for (const model of worldLayout.groundAlignedModels)
    assert.ok(
      model in worldLayout.placements,
      `${model} is ground-aligned but never placed`,
    );
});

test("normalizes diagonal input and rejects duplicates", () => {
  const input = sanitizeInput(
    {
      seq: 1,
      move: [1, 1],
      aimYaw: 0,
      aimPitch: 0,
      held: ["sprint", "bogus"],
      pressed: ["fire", "fire"],
    },
    0,
  );
  assert.ok(input);
  assert.ok(Math.abs(Math.hypot(...input.move) - 1) < 0.0001);
  assert.deepEqual(input.held, ["sprint"]);
  assert.deepEqual(input.pressed, ["fire"]);
  assert.equal(sanitizeInput({ seq: 1, move: [0, 1] }, 1), null);
});

test("server accepts legal client movement and rejects impossible displacement", () => {
  const simulation = new ChapterSimulation(playerId, "arrival");
  assert.equal(
    simulation.acceptInput({
      seq: 1,
      move: [1, 0],
      aimYaw: 0,
      aimPitch: 0,
      held: [],
      pressed: [],
      position: { x: 0.2, y: 0, z: 28 },
    }),
    true,
  );
  assert.equal(simulation.player.x, 0.2);
  assert.equal(simulation.positionCorrection, false);

  assert.equal(
    simulation.acceptInput({
      seq: 2,
      move: [1, 0],
      aimYaw: 0,
      aimPitch: 0,
      held: ["sprint"],
      pressed: [],
      position: { x: 5, y: 0, z: 28 },
    }),
    false,
  );
  assert.equal(simulation.player.x, 0.2);
  assert.equal(simulation.positionCorrection, true);
});

test("connected movement prediction cannot produce outcome-bearing events", () => {
  const prediction = new ChapterSimulation(playerId, "courtyard", true);
  prediction.setPaused(false);
  assert.equal(prediction.enemies.length, 0);
  assert.equal(prediction.family.active, false);
  for (let index = 0; index < 500; index += 1) prediction.tick(0.05);
  assert.equal(prediction.phase, "courtyard");
  assert.deepEqual(prediction.drainEvents(), []);
});

test("keeps pressed actions until a simulation tick consumes them", () => {
  const simulation = new ChapterSimulation(playerId, "arrival");
  simulation.player.z = 16;
  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["interact"],
  });
  simulation.acceptInput({
    seq: 2,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: [],
  });
  simulation.tick();
  assert.equal(simulation.phase, "courtyard");
  assert.equal(simulation.player.x, 0);
  assert.equal(
    simulation.player.z,
    16,
    "phase completion must preserve the player's route position",
  );
  assert.equal(simulation.family.active, false);
});

test("W moves forward, A left, and D right at yaw zero", () => {
  const forward = new ChapterSimulation(playerId, "arrival");
  forward.acceptInput({
    seq: 1,
    move: [0, 1],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: [],
  });
  forward.tick();
  assert.ok(
    forward.player.z < CHECKPOINTS.arrival.z,
    `expected W to reduce z, got ${forward.player.z}`,
  );

  const left = new ChapterSimulation(playerId, "arrival");
  left.acceptInput({
    seq: 1,
    move: [-1, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: [],
  });
  left.tick();
  assert.ok(left.player.x < 0, `expected A to reduce x, got ${left.player.x}`);

  const right = new ChapterSimulation(playerId, "arrival");
  right.acceptInput({
    seq: 1,
    move: [1, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: [],
  });
  right.tick();
  assert.ok(
    right.player.x > 0,
    `expected D to increase x, got ${right.player.x}`,
  );
});

test("camera-relative W, A, and D retain their screen directions after a quarter turn", () => {
  const yaw = Math.PI / 2;
  const forward = new ChapterSimulation(playerId, "arrival");
  forward.acceptInput({
    seq: 1,
    move: [0, 1],
    aimYaw: yaw,
    aimPitch: 0,
    held: [],
    pressed: [],
  });
  forward.tick();
  assert.ok(
    forward.player.x > 0,
    `expected W to follow the camera toward +x, got ${forward.player.x}`,
  );

  const left = new ChapterSimulation(playerId, "arrival");
  left.acceptInput({
    seq: 1,
    move: [-1, 0],
    aimYaw: yaw,
    aimPitch: 0,
    held: [],
    pressed: [],
  });
  left.tick();
  assert.ok(
    left.player.z < CHECKPOINTS.arrival.z,
    `expected A to remain camera-left toward -z, got ${left.player.z}`,
  );

  const right = new ChapterSimulation(playerId, "arrival");
  right.acceptInput({
    seq: 1,
    move: [1, 0],
    aimYaw: yaw,
    aimPitch: 0,
    held: [],
    pressed: [],
  });
  right.tick();
  assert.ok(
    right.player.z > CHECKPOINTS.arrival.z,
    `expected D to remain camera-right toward +z, got ${right.player.z}`,
  );
});

test("cardinal and diagonal speed are equal", () => {
  const cardinal = new ChapterSimulation(playerId, "arrival");
  const diagonal = new ChapterSimulation(playerId, "arrival");
  cardinal.acceptInput({
    seq: 1,
    move: [0, 1],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: [],
  });
  diagonal.acceptInput({
    seq: 1,
    move: [1, 1],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: [],
  });
  for (let index = 0; index < 10; index += 1) {
    cardinal.tick();
    diagonal.tick();
  }
  const cardinalDistance = Math.hypot(
    cardinal.player.x,
    cardinal.player.z - CHECKPOINTS.arrival.z,
  );
  const diagonalDistance = Math.hypot(
    diagonal.player.x,
    diagonal.player.z - CHECKPOINTS.arrival.z,
  );
  assert.ok(Math.abs(cardinalDistance - diagonalDistance) < 0.02);
});

test("substepped collision prevents sprint and dodge tunneling through the well", () => {
  const start = { x: 0, z: 14 };
  const moved = moveWithCollision(start, { x: 8, z: 0 }, 0.55);
  assert.ok(moved.x < 2.31, `crossed well at x=${moved.x}`);
  assert.equal(collides(moved, 0.55), false);
});

test("all nine freestanding door colliders are derived from their rendered transforms", () => {
  assert.equal(DOORS.length, 9);
  assert.equal(DOOR_COLLIDERS.length, 9);
  for (const door of DOORS) {
    const collider = doorColliderFromTransform(door);
    const asset =
      worldLayout.doorAssets[
        door.entity as keyof typeof worldLayout.doorAssets
      ];
    const expectedWidth = (door.width ?? asset?.width ?? 0) * door.scale;
    const expectedDepth = (door.depth ?? asset?.depth ?? 0) * door.scale;
    const colliderWidth = collider.maxX - collider.minX;
    const colliderDepth = collider.maxZ - collider.minZ;
    const quarterTurn = Math.abs(door.yaw) % 180 === 90;
    assert.ok(
      Math.abs(colliderWidth - (quarterTurn ? expectedDepth : expectedWidth)) <
        0.0001,
      `${door.id} width was not derived from the entity transform`,
    );
    assert.ok(
      Math.abs(colliderDepth - (quarterTurn ? expectedWidth : expectedDepth)) <
        0.0001,
      `${door.id} depth was not derived from the entity transform`,
    );
    assert.equal(
      collides(
        { x: door.position[0], y: collider.y, z: door.position[2] },
        0.05,
      ),
      true,
      `${door.id} remained passable while visibly closed`,
    );
  }
});

test("rescue doors stay solid throughout their short swing and open after it completes", () => {
  const simulation = new ChapterSimulation(playerId, "arrival");
  simulation.loadPhase("courtyard", {
    resetPlayer: false,
    activateEncounter: false,
  });
  simulation.player = {
    ...simulation.player,
    x: 8.6,
    y: 0,
    z: -1,
  };
  const closedMove = moveWithCollision(
    simulation.player,
    { x: 2.4, z: 0 },
    0.3,
    simulation.openDoorIds,
  );
  const rescueDoor = DOORS.find(({ id }) => id === "courtyard-rescue-door");
  assert.ok(rescueDoor);
  const rescueCollider = doorColliderFromTransform(rescueDoor);
  assert.ok(
    closedMove.x <= rescueCollider.minX - 0.3,
    `closed door allowed x=${closedMove.x}`,
  );

  for (let tick = 0; tick < 8; tick += 1) simulation.tick(0.05);
  assert.ok(simulation.doorProgress["courtyard-rescue-door"] < 1);
  assert.equal(simulation.openDoorIds.has("courtyard-rescue-door"), false);
  const swingingMove = moveWithCollision(
    simulation.player,
    { x: 2.4, z: 0 },
    0.3,
    simulation.openDoorIds,
  );
  assert.ok(
    swingingMove.x <= rescueCollider.minX - 0.3,
    `swinging door allowed x=${swingingMove.x}`,
  );

  simulation.tick(0.05);
  assert.equal(simulation.doorProgress["courtyard-rescue-door"], 1);
  assert.equal(simulation.openDoorIds.has("courtyard-rescue-door"), true);
  const openMove = moveWithCollision(
    simulation.player,
    { x: 2.4, z: 0 },
    0.3,
    simulation.openDoorIds,
  );
  assert.ok(openMove.x > 10.8, `open door still blocked at x=${openMove.x}`);
});

test("the doorway rescue door is already open when a doorway checkpoint resumes", () => {
  const simulation = new ChapterSimulation(playerId, "doorway");
  const door = simulation
    .snapshot()
    .doors.find(({ id }) => id === "doorway-rescue-door");
  assert.deepEqual(door, {
    id: "doorway-rescue-door",
    progress: 1,
    open: true,
  });
});

test("terrace perimeters reject six-metre drops while authored stairs remain traversable", () => {
  const terraceEdges = [
    [
      { x: -14.6, y: 6, z: -15 },
      { x: 2, z: 0 },
    ],
    [
      { x: -14.6, y: 6, z: -35 },
      { x: 2, z: 0 },
    ],
    [
      { x: 15.4, y: 6, z: -31 },
      { x: 2, z: 0 },
    ],
    [
      { x: 17.4, y: 6, z: -45 },
      { x: 2, z: 0 },
    ],
  ] as const;
  for (const [start, delta] of terraceEdges) {
    const moved = moveWithCollision(start, delta, 0.55);
    assert.equal(moved.y, 6, `fell from terrace near ${start.x},${start.z}`);
  }
  const stairStep = moveWithCollision(
    { x: -5.5, y: 5, z: -16 },
    { x: 2.1, z: 0 },
    0.45,
  );
  assert.equal(stairStep.y, 4);
});

test("the recut route gives every checkpoint and spawn a valid authored floor", () => {
  for (const [phase, checkpoint] of Object.entries(CHECKPOINTS)) {
    assert.equal(
      floorHeightAt(checkpoint),
      checkpoint.y,
      `${phase} checkpoint height disagrees with the floor table`,
    );
    assert.equal(
      collides(checkpoint, 0.46),
      false,
      `${phase} checkpoint intersects route geometry`,
    );
  }
  for (const phase of [
    "courtyard",
    "market",
    "doorway",
  ] satisfies CombatPhase[]) {
    const simulation = new ChapterSimulation(playerId, phase);
    for (const enemy of simulation.enemies) {
      assert.equal(
        floorHeightAt(enemy),
        enemy.y,
        `${phase} enemy height disagrees with the floor table`,
      );
      assert.equal(
        collides(enemy, 0.46),
        false,
        `${phase} enemy intersects route geometry`,
      );
    }
  }
  assert.equal(floorHeightAt({ x: 3, z: -16 }), 1);
  assert.equal(floorHeightAt({ x: -5, z: -16 }), 5);
  assert.equal(floorHeightAt({ x: -8, z: -16 }), 6);
});

test("arrival interaction is proximity gated and advances once", () => {
  const simulation = new ChapterSimulation(playerId, "arrival");
  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["interact"],
  });
  simulation.tick();
  assert.equal(simulation.phase, "arrival");
  simulation.player.z = 16;
  simulation.acceptInput({
    seq: 2,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["interact"],
  });
  simulation.tick();
  assert.equal(simulation.phase, "courtyard");
  const completed = simulation
    .drainEvents()
    .filter((event) => event.type === "phase.completed");
  assert.equal(completed.length, 1);
});

test("combat rosters are exact and full before completion", () => {
  const courtyard = new ChapterSimulation(playerId, "courtyard");
  const market = new ChapterSimulation(playerId, "market");
  const doorway = new ChapterSimulation(playerId, "doorway");
  assert.deepEqual(
    courtyard.enemies.map((enemy) => enemy.kind),
    ["skirmisher", "skirmisher", "archer"],
  );
  assert.deepEqual(
    market.enemies.map((enemy) => enemy.kind),
    ["skirmisher", "skirmisher", "skirmisher", "archer"],
  );
  assert.deepEqual(
    doorway.enemies.map((enemy) => enemy.kind),
    ["skirmisher", "skirmisher", "archer", "brute"],
  );
});

test("doorway enemies spawn outside every solid collider", () => {
  const doorway = new ChapterSimulation(playerId, "doorway");
  for (const enemy of doorway.enemies)
    assert.equal(
      collides(enemy, 0.46),
      false,
      `${enemy.kind} spawned inside world geometry at ${enemy.x},${enemy.z}`,
    );
});

test("the doorway brute steers around the torana post to reach the player", () => {
  const doorway = new ChapterSimulation(playerId, "doorway");
  doorway.player.x = FAMILY_POSITIONS.doorway.x;
  doorway.player.y = 6;
  doorway.player.z = FAMILY_POSITIONS.doorway.z;
  doorway.player.invulnerable = 999;
  const brute = doorway.enemies.find((enemy) => enemy.kind === "brute");
  assert.ok(brute);
  doorway.enemies = [brute];

  for (let index = 0; index < 240; index += 1) doorway.tick();

  assert.ok(
    Math.hypot(brute.x - doorway.player.x, brute.z - doorway.player.z) <= 2.05,
    `brute stalled ${Math.hypot(brute.x - doorway.player.x, brute.z - doorway.player.z).toFixed(2)}m from player`,
  );
});

test("the doorway brute reaches the player with the full roster active", () => {
  const doorway = new ChapterSimulation(playerId, "doorway");
  doorway.player.x = FAMILY_POSITIONS.doorway.x;
  doorway.player.y = 6;
  doorway.player.z = FAMILY_POSITIONS.doorway.z;
  doorway.player.invulnerable = 999;
  const brute = doorway.enemies.find((enemy) => enemy.kind === "brute");
  assert.ok(brute);

  for (let index = 0; index < 260; index += 1) doorway.tick();

  const distance = Math.hypot(
    brute.x - doorway.player.x,
    brute.z - doorway.player.z,
  );
  assert.ok(
    distance <= 2.05,
    `full-roster brute stalled ${distance.toFixed(2)}m from player`,
  );
});

test("pause freezes player, enemies, and family timer", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.family.dangerStarted = true;
  const before = simulation.snapshot();
  const graceBefore = simulation.combatGraceRemaining;
  simulation.setPaused(true);
  for (let index = 0; index < 30; index += 1) simulation.tick();
  const after = simulation.snapshot();
  assert.deepEqual(after.player, before.player);
  assert.deepEqual(after.enemies, before.enemies);
  assert.equal(after.family.remaining, before.family.remaining);
  assert.equal(simulation.combatGraceRemaining, graceBefore);
});

test("starting or resuming every phase loads at full health", () => {
  for (const phase of PHASES) {
    const simulation = new ChapterSimulation(playerId, phase);
    assert.equal(simulation.phase, phase);
    assert.equal(
      simulation.player.health,
      100,
      `${phase} did not load at full health`,
    );
  }
});

test("every confirmed phase advancement preserves position and restores full health", () => {
  const expectedTransitions: Array<[PhaseId, PhaseId]> = [
    ["arrival", "courtyard"],
    ["courtyard", "market"],
    ["market", "doorway"],
    ["doorway", "ending"],
    ["ending", "complete"],
  ];

  for (const [phase, following] of expectedTransitions) {
    const simulation = new ChapterSimulation(playerId, phase);
    simulation.player.health = 23;
    const positionBeforeAdvance = {
      x: simulation.player.x,
      y: simulation.player.y,
      z: simulation.player.z,
    };
    if (phase === "arrival") {
      simulation.player.z = 16;
      positionBeforeAdvance.z = 16;
      simulation.acceptInput({
        seq: 1,
        move: [0, 0],
        aimYaw: 0,
        aimPitch: 0,
        held: [],
        pressed: ["interact"],
      });
      simulation.tick();
    } else if (phase === "ending") {
      simulation.completeEnding();
    } else {
      simulation.enemies.forEach((enemy) => {
        enemy.dead = true;
        enemy.health = 0;
      });
      for (let index = 0; index < 20; index += 1) simulation.tick();
    }
    assert.equal(
      simulation.phase,
      following,
      `${phase} did not advance to ${following}`,
    );
    assert.equal(
      simulation.player.health,
      100,
      `${following} did not begin at full health`,
    );
    assert.deepEqual(
      {
        x: simulation.player.x,
        y: simulation.player.y,
        z: simulation.player.z,
      },
      positionBeforeAdvance,
      `${phase} completion teleported the player to ${following}`,
    );
    assert.ok(
      simulation
        .drainEvents()
        .some(
          (event) =>
            event.type === "phase.completed" &&
            event.completedPhase === phase &&
            event.nextPhase === following,
        ),
    );
  }
});

test("advanced encounters wait for region entry before aggression and family danger", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 22;
  simulation.player.y = 0;
  simulation.player.z = -2;
  simulation.enemies.forEach((enemy) => {
    enemy.dead = true;
    enemy.health = 0;
  });
  for (let index = 0; index < 20; index += 1) simulation.tick();

  assert.equal(simulation.phase, "market");
  assert.deepEqual(
    { x: simulation.player.x, y: simulation.player.y, z: simulation.player.z },
    { x: 22, y: 0, z: -2 },
  );
  assert.equal(simulation.family.active, false);
  assert.equal(simulation.family.dangerStarted, false);
  const enemiesBeforeEntry = simulation.enemies.map(({ x, z }) => ({ x, z }));
  simulation.tick();
  assert.deepEqual(
    simulation.enemies.map(({ x, z }) => ({ x, z })),
    enemiesBeforeEntry,
    "the next roster moved before the player entered its region",
  );

  simulation.player.x = -20;
  simulation.player.y = 6;
  simulation.player.z = -20;
  simulation.tick();
  assert.equal(simulation.family.active, true);
  assert.equal(simulation.family.dangerStarted, true);
  assert.ok(simulation.combatGraceRemaining > 0);
});

test("resumed and restarted encounters still restore their authored checkpoint", () => {
  const resumed = new ChapterSimulation(playerId, "market");
  assert.deepEqual(
    {
      x: resumed.player.x,
      y: resumed.player.y,
      z: resumed.player.z,
      yaw: resumed.player.yaw,
    },
    CHECKPOINTS.market,
  );
  resumed.player.x = -14;
  resumed.player.z = -20;
  resumed.player.health = 0;
  for (let index = 0; index < 20; index += 1) resumed.tick();
  assert.equal(resumed.player.x, CHECKPOINTS.market.x);
  assert.equal(resumed.player.z, CHECKPOINTS.market.z);
  assert.equal(resumed.player.health, 100);
});

test("death restarts each combat phase at full health without losing the current phase", () => {
  for (const phase of [
    "courtyard",
    "market",
    "doorway",
  ] satisfies CombatPhase[]) {
    const simulation = new ChapterSimulation(playerId, phase);
    simulation.player.health = 0;
    simulation.tick();
    assert.equal(
      simulation.player.state,
      "down",
      `${phase} skipped the visible down state`,
    );
    assert.equal(
      simulation.player.health,
      0,
      `${phase} healed before the down animation finished`,
    );
    for (let index = 0; index < 18; index += 1) simulation.tick();
    assert.equal(simulation.phase, phase);
    assert.equal(simulation.player.health, 100);
    assert.ok(
      simulation
        .drainEvents()
        .some(
          (event) =>
            event.type === "phase.restarted" &&
            event.phase === phase &&
            event.reason === "down",
        ),
    );
  }
});

test("family failure restarts each combat phase at full health", () => {
  for (const phase of [
    "courtyard",
    "market",
    "doorway",
  ] satisfies CombatPhase[]) {
    const simulation = new ChapterSimulation(playerId, phase);
    simulation.player.health = 29;
    simulation.combatGraceRemaining = 0;
    simulation.family.dangerStarted = true;
    simulation.family.remaining = 0.01;
    simulation.tick();
    assert.equal(simulation.phase, phase);
    assert.equal(simulation.player.health, 100);
    assert.ok(
      simulation
        .drainEvents()
        .some(
          (event) =>
            event.type === "phase.restarted" &&
            event.phase === phase &&
            event.reason === "family",
        ),
    );
  }
});

test("family danger starts only after a raider enters the authored safety radius", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.family.dangerStarted = false;
  const family = FAMILY_POSITIONS.courtyard;
  simulation.enemies = [
    simulation.enemies.find((enemy) => enemy.kind === "archer")!,
  ];
  simulation.enemies[0].x = family.x;
  simulation.enemies[0].z = family.z + 3;
  simulation.enemies[0].attackCooldown = 999;
  for (let index = 0; index < 32; index += 1) simulation.tick();
  assert.equal(simulation.family.dangerStarted, false);

  simulation.enemies[0].z = family.z + 2;
  simulation.tick();
  assert.equal(simulation.family.dangerStarted, true);
});

test("health does not regenerate during an active encounter", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.health = 41;
  simulation.enemies.forEach((enemy) => {
    enemy.attackCooldown = 999;
  });
  for (let index = 0; index < 100; index += 1) simulation.tick();
  assert.equal(simulation.phase, "courtyard");
  assert.equal(simulation.player.health, 41);
});

test("an enemy warning deals damage exactly once when its wind-up finishes", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.combatGraceRemaining = 0;
  simulation.player.x = 0;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  const enemy = simulation.enemies[0];
  enemy.x = 0;
  enemy.z = -1;
  enemy.yaw = Math.PI;
  enemy.attackCooldown = 0;

  simulation.tick();
  assert.equal(
    simulation.player.health,
    100,
    "damage landed when the warning began",
  );
  assert.equal(enemy.warning, 0.65);
  for (let index = 0; index < 13; index += 1) simulation.tick();
  assert.equal(enemy.warning, 0);
  assert.equal(
    simulation.player.health,
    85,
    "the 15-damage skirmisher warning did not land exactly once",
  );
  simulation.tick();
  assert.equal(
    simulation.player.health,
    85,
    "the completed warning dealt damage on a second tick",
  );
});

test("a fresh combat checkpoint gives the player 1.5 seconds before an enemy can begin an attack", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 0;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  const enemy = simulation.enemies[0];
  enemy.x = 0;
  enemy.z = -1;
  enemy.attackCooldown = 0;

  for (let index = 0; index < 29; index += 1) simulation.tick();
  assert.equal(
    enemy.warning,
    0,
    "enemy began its wind-up during the initial player grace period",
  );
  assert.equal(simulation.player.health, 100);

  simulation.tick();
  assert.ok(
    enemy.warning > 0,
    "enemy did not engage when the initial grace period ended",
  );
});

test("initial grace preserves enemy attack staggering instead of synchronizing the whole group", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 4.5;
  simulation.player.z = 0;
  const positions = [
    { x: 4.5, z: -7 },
    { x: 9, z: 0 },
    { x: -3, z: 0 },
  ];
  simulation.enemies.forEach((enemy, index) => {
    enemy.kind = "archer";
    enemy.x = positions[index].x;
    enemy.z = positions[index].z;
  });

  for (let index = 0; index < 30; index += 1) simulation.tick();
  assert.equal(
    simulation.enemies.filter((enemy) => enemy.warning > 0).length,
    0,
    "starting cooldowns expired behind the grace clock",
  );
  assert.ok(simulation.enemies[0].attackCooldown > 0);

  for (let index = 0; index < 11; index += 1) simulation.tick();
  assert.equal(
    simulation.enemies.filter((enemy) => enemy.warning > 0).length,
    1,
    "the stagger did not produce a single opening attacker",
  );
});

test("the family danger timer does not consume the initial player grace period", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.enemies = [simulation.enemies[0]];
  simulation.enemies[0].x = FAMILY_POSITIONS.courtyard.x;
  simulation.enemies[0].y = FAMILY_POSITIONS.courtyard.y;
  simulation.enemies[0].z = FAMILY_POSITIONS.courtyard.z;
  simulation.enemies[0].attackCooldown = 999;

  for (let index = 0; index < 29; index += 1) simulation.tick();
  assert.equal(simulation.family.dangerStarted, true);
  assert.equal(
    simulation.family.remaining,
    20,
    "the objective timer burned while attacks were still grace-locked",
  );

  simulation.tick();
  assert.equal(simulation.family.dangerStarted, true);
  assert.equal(
    simulation.family.remaining,
    20,
    "the objective timer began on the final grace tick",
  );
  simulation.tick();
  assert.equal(
    simulation.family.remaining,
    19.95,
    "the objective timer did not begin when grace ended",
  );
});

test("an active raider commits to the player from 25 metres instead of drifting toward the family", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  const enemy = simulation.enemies[0];
  simulation.enemies = [enemy];
  simulation.player.x = 22;
  simulation.player.z = 20;
  enemy.x = 22;
  enemy.z = 8;
  enemy.attackCooldown = 999;

  for (let index = 0; index < 10; index += 1) simulation.tick();

  assert.ok(
    enemy.z > 8.8,
    `raider moved to z=${enemy.z.toFixed(2)} instead of approaching the player`,
  );
});

test("exactly the last-spawned skirmisher threatens the family", () => {
  for (const phase of ["courtyard", "market", "doorway"] as const) {
    const wave = new ChapterSimulation(playerId, phase);
    const threat = wave.enemies
      .filter((enemy) => enemy.kind === "skirmisher")
      .at(-1);
    assert.ok(threat);
    assert.ok(
      Math.hypot(threat.x - wave.player.x, threat.z - wave.player.z) > 6,
      `${phase} family threat spawned inside its player override radius`,
    );
  }

  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 22;
  simulation.player.z = 20;
  const skirmishers = simulation.enemies.filter(
    (enemy) => enemy.kind === "skirmisher",
  );
  simulation.enemies = skirmishers;
  skirmishers.forEach((enemy) => {
    enemy.attackCooldown = 999;
  });

  for (let index = 0; index < 12; index += 1) simulation.tick();

  assert.ok(skirmishers[0].z > 8, "first skirmisher ignored the player");
  assert.ok(skirmishers[1].z < 6, "last skirmisher ignored the family");
});

test("market player-directed spawns begin with a clear lane", () => {
  const simulation = new ChapterSimulation(playerId, "market");
  const skirmishers = simulation.enemies.filter(
    (enemy) => enemy.kind === "skirmisher",
  );

  for (const enemy of skirmishers.slice(0, -1))
    assert.equal(
      segmentBlocked(enemy, simulation.player, simulation.openDoorIds),
      false,
      `${enemy.id} spawned without line of sight to the player`,
    );
});

test("damaging the family threat pulls it back to the player", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  const threat = simulation.enemies
    .filter((enemy) => enemy.kind === "skirmisher")
    .at(-1);
  assert.ok(threat);
  simulation.enemies = [threat];
  simulation.player.x = 22;
  simulation.player.z = 12;
  threat.x = 22;
  threat.z = 4;
  threat.attackCooldown = 999;

  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: ["aim"],
    pressed: ["fire"],
  });
  for (let index = 0; index < 8; index += 1) simulation.tick();
  assert.ok(
    threat.health < threat.maxHealth,
    "arrow did not damage the threat",
  );
  const zAfterHit = threat.z;
  simulation.tick();
  assert.ok(
    threat.z > zAfterHit,
    "damaged threat kept walking toward the family",
  );
});

test("an enemy already facing the player in clear range starts its warning immediately when ready", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  const archer = simulation.enemies.find((enemy) => enemy.kind === "archer");
  assert.ok(archer);
  simulation.enemies = [archer];
  simulation.player.x = 22;
  simulation.player.z = 12;
  archer.x = 22;
  archer.z = 4;
  archer.yaw = yawToTarget(archer, simulation.player);
  archer.attackCooldown = 0;
  simulation.combatGraceRemaining = 0;

  simulation.tick();

  assert.ok(archer.warning > 0, "ready archer idled inside clear attack range");
});

test("an enemy outside the attack arc turns before winding up and whiffs if the player leaves its impact arc", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.combatGraceRemaining = 0;
  simulation.player.x = 0;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  const enemy = simulation.enemies[0];
  enemy.x = 0;
  enemy.z = -1;
  enemy.yaw = 0;
  enemy.attackCooldown = 0;

  simulation.tick();
  assert.equal(enemy.warning, 0, "back-facing enemy began a wind-up");
  assert.equal(simulation.player.health, 100);

  for (let index = 0; index < 20 && enemy.warning === 0; index += 1)
    simulation.tick();
  assert.ok(enemy.warning > 0, "enemy never turned into its start arc");

  enemy.warning = 0.05;
  simulation.player.x = enemy.x - 1;
  simulation.player.z = enemy.z;
  const healthBeforeWhiff = simulation.player.health;
  simulation.tick();
  assert.equal(enemy.warning, 0);
  assert.equal(
    simulation.player.health,
    healthBeforeWhiff,
    "enemy dealt damage outside its impact arc",
  );
});

test("enemy yaw converges without reversing while a skirmisher circles", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.combatGraceRemaining = 0;
  simulation.player.x = 0;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  const enemy = simulation.enemies[0];
  enemy.x = 0;
  enemy.z = -2.8;
  enemy.yaw = 0;
  enemy.attackCooldown = 999;

  const errors: number[] = [];
  const steps: number[] = [];
  for (let index = 0; index < 40; index += 1) {
    const previousYaw = enemy.yaw;
    simulation.tick();
    errors.push(angleError(yawToTarget(enemy, simulation.player), enemy.yaw));
    steps.push(
      Math.atan2(
        Math.sin(enemy.yaw - previousYaw),
        Math.cos(enemy.yaw - previousYaw),
      ),
    );
  }

  const nonZeroDirections = steps
    .filter((step) => Math.abs(step) > 0.0001)
    .map(Math.sign);
  assert.ok(nonZeroDirections.length > 0, "enemy never turned");
  assert.equal(
    new Set(nonZeroDirections).size,
    1,
    "enemy yaw reversed direction while converging",
  );
  assert.ok(errors.at(-1)! < 0.02, `enemy retained ${errors.at(-1)} rad error`);
});

test("enemy yaw is authoritative snapshot state", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  const enemy = simulation.enemies[0];
  enemy.yaw = 1.234;
  const snapshotEnemy = simulation
    .snapshot()
    .enemies.find(({ id }) => id === enemy.id);
  assert.equal(snapshotEnemy?.yaw, 1.234);
});

test("skirmisher circles only after reaching three metres and for at most half a second", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  const enemy = simulation.enemies[0];
  simulation.enemies = [enemy];
  simulation.player.x = 22;
  simulation.player.z = 12;
  enemy.x = 22;
  enemy.z = 8.9;
  enemy.attackCooldown = 999;

  simulation.tick();
  assert.ok(
    Math.abs(enemy.x - 22) < 0.0001,
    "skirmisher circled before entering the three-metre envelope",
  );
  for (let index = 0; index < 10; index += 1) simulation.tick();
  const beforeStraightStep = { x: enemy.x, z: enemy.z };
  simulation.tick();
  const step = {
    x: enemy.x - beforeStraightStep.x,
    z: enemy.z - beforeStraightStep.z,
  };
  const toward = {
    x: simulation.player.x - beforeStraightStep.x,
    z: simulation.player.z - beforeStraightStep.z,
  };
  const cross = Math.abs(step.x * toward.z - step.z * toward.x);
  assert.ok(
    cross < 0.001,
    `skirmisher was still circling after 0.5s (${cross})`,
  );
});

test("a retreating archer never enters a closed authored door collider", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  const archer = simulation.enemies.find((enemy) => enemy.kind === "archer");
  assert.ok(archer);
  simulation.enemies = [archer];
  simulation.openDoorIds.delete("courtyard-rescue-door");
  simulation.player.x = 7;
  simulation.player.z = -1;
  archer.x = 9;
  archer.z = -1;
  archer.attackCooldown = 999;

  for (let index = 0; index < 80; index += 1) {
    simulation.tick();
    assert.equal(
      collides(archer, 0.46, simulation.openDoorIds),
      false,
      `archer entered a door collider on tick ${index + 1}`,
    );
  }
});

test("inactive encounter enemies stay at spawn until the player enters the region", () => {
  const simulation = new ChapterSimulation(playerId, "arrival");
  simulation.loadPhase("market", {
    resetPlayer: false,
    activateEncounter: false,
  });
  const initial = simulation.enemies.map(({ x, y, z }) => ({ x, y, z }));

  for (let index = 0; index < 100; index += 1) simulation.tick();

  assert.deepEqual(
    simulation.enemies.map(({ x, y, z }) => ({ x, y, z })),
    initial,
  );
  assert.equal(simulation.family.active, false);
});

test("a skirmisher approaches, circles, then closes to strike instead of walking straight into the player", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 4.5;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  const enemy = simulation.enemies[0];
  enemy.x = 4.5;
  enemy.z = -5;
  enemy.attackCooldown = 999;

  const startingDistance = Math.hypot(
    enemy.x - simulation.player.x,
    enemy.z - simulation.player.z,
  );
  for (let index = 0; index < 30; index += 1) simulation.tick();
  const circlingDistance = Math.hypot(
    enemy.x - simulation.player.x,
    enemy.z - simulation.player.z,
  );
  assert.ok(
    circlingDistance < startingDistance - 1,
    "skirmisher did not approach the player",
  );
  assert.ok(
    Math.abs(enemy.x - simulation.player.x) > 0.2,
    "skirmisher never added a lateral circling step",
  );
  assert.ok(
    circlingDistance > 1.35,
    "skirmisher collapsed into the player's collision space while circling",
  );

  enemy.attackCooldown = 0;
  simulation.combatGraceRemaining = 0;
  for (let index = 0; index < 50; index += 1) simulation.tick();
  assert.ok(
    simulation.player.health < 100,
    "skirmisher circled forever instead of closing to strike",
  );
});

test("an archer retreats from pressure and settles at a stable firing point", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 0;
  simulation.player.z = 0;
  const archer = simulation.enemies.find((enemy) => enemy.kind === "archer");
  assert.ok(archer);
  simulation.enemies = [archer];
  archer.x = 2;
  archer.z = -2;
  archer.attackCooldown = 999;

  for (let index = 0; index < 60; index += 1) simulation.tick();
  const firingPoint = { x: archer.x, z: archer.z };
  const distance = Math.hypot(
    archer.x - simulation.player.x,
    archer.z - simulation.player.z,
  );
  assert.ok(
    distance >= 5.25,
    `archer stopped retreating only ${distance.toFixed(2)} metres from the player`,
  );

  for (let index = 0; index < 20; index += 1) simulation.tick();
  assert.ok(
    Math.hypot(archer.x - firingPoint.x, archer.z - firingPoint.z) < 0.05,
    "archer drifted after reaching its firing point",
  );
});

test("the market archer sidesteps the stall and reaches a fixed point with line of sight", () => {
  const simulation = new ChapterSimulation(playerId, "market");
  const archer = simulation.enemies.find((enemy) => enemy.kind === "archer");
  assert.ok(archer);
  simulation.enemies = [archer];
  archer.attackCooldown = 0;

  for (let index = 0; index < 200; index += 1) simulation.tick();
  assert.equal(
    segmentBlocked(archer, simulation.player),
    false,
    "archer remained pinned behind the market stall",
  );
  assert.ok(
    simulation.player.health < 100,
    "archer never reached a usable firing point",
  );
});

test("nearby enemies separate without introducing nondeterministic movement", () => {
  const prepare = () => {
    const simulation = new ChapterSimulation(playerId, "courtyard");
    simulation.player.x = 4.5;
    simulation.player.z = 0;
    simulation.enemies = simulation.enemies.slice(0, 2);
    simulation.enemies[0].x = 4.47;
    simulation.enemies[0].z = -4;
    simulation.enemies[1].x = 4.53;
    simulation.enemies[1].z = -4;
    simulation.enemies.forEach((enemy) => {
      enemy.attackCooldown = 999;
    });
    return simulation;
  };
  const first = prepare();
  const second = prepare();

  for (let index = 0; index < 30; index += 1) {
    first.tick();
    second.tick();
  }
  const separation = Math.hypot(
    first.enemies[0].x - first.enemies[1].x,
    first.enemies[0].z - first.enemies[1].z,
  );
  assert.ok(
    separation >= 1.3,
    `enemies remained stacked only ${separation.toFixed(2)} metres apart`,
  );
  assert.deepEqual(
    first.snapshot(),
    second.snapshot(),
    "identical enemy scenarios diverged",
  );
});

test("courtyard attackers retain their combat spacing while winding up", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  let minimumSeparation = Number.POSITIVE_INFINITY;

  for (let index = 0; index < 60; index += 1) {
    simulation.tick();
    const skirmishers = simulation.enemies.filter(
      (enemy) => enemy.kind === "skirmisher" && !enemy.dead,
    );
    if (skirmishers.length === 2)
      minimumSeparation = Math.min(
        minimumSeparation,
        Math.hypot(
          skirmishers[0].x - skirmishers[1].x,
          skirmishers[0].z - skirmishers[1].z,
        ),
      );
  }

  assert.ok(
    minimumSeparation >= 1.3,
    `warning attackers overlapped at ${minimumSeparation.toFixed(3)}m`,
  );
});

test("a landed hit owns the player state and movement for the configured reaction", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.combatGraceRemaining = 0;
  simulation.player.x = 0;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  const enemy = simulation.enemies[0];
  enemy.x = 0;
  enemy.z = -1;
  enemy.yaw = Math.PI;
  enemy.attackCooldown = 0;

  for (let index = 0; index < 14; index += 1) simulation.tick();
  assert.equal(simulation.player.state, "hit");
  const impactX = simulation.player.x;
  simulation.acceptInput({
    seq: 1,
    move: [1, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["melee"],
  });
  for (let index = 0; index < 4; index += 1) {
    simulation.tick();
    assert.equal(simulation.player.state, "hit");
    assert.equal(
      simulation.player.x,
      impactX,
      "hit reaction allowed movement before 0.25 seconds",
    );
  }
  simulation.tick();
  assert.notEqual(simulation.player.state, "hit");
});

test("the blade's second hit remains available after first-hit recovery", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 4.5;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  simulation.enemies[0].x = 4.5;
  simulation.enemies[0].z = -2;

  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["melee"],
  });
  simulation.tick();
  for (let index = 0; index < 4; index += 1) simulation.tick();
  assert.equal(
    simulation.enemies[0].health,
    36,
    "first blade hit did not deal 24 damage",
  );
  for (let index = 0; index < 5; index += 1) {
    simulation.acceptInput({
      seq: index + 2,
      move: [0, 0],
      aimYaw: 0,
      aimPitch: 0,
      held: [],
      pressed: [],
    });
    simulation.tick();
  }
  simulation.acceptInput({
    seq: 7,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["melee"],
  });
  simulation.tick();
  for (let index = 0; index < 4; index += 1) simulation.tick();
  assert.equal(
    simulation.enemies[0].health,
    4,
    "second blade hit missed its 32-damage combo window",
  );
});

test("dodge recovery blocks attacks for 0.25 seconds", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["dodge"],
  });
  simulation.tick();
  for (let index = 0; index < 13; index += 1) simulation.tick();

  simulation.player.x = 4.5;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  simulation.enemies[0].x = 4.5;
  simulation.enemies[0].z = -2;
  const health = simulation.enemies[0].health;
  simulation.acceptInput({
    seq: 2,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["melee"],
  });
  simulation.tick();
  assert.equal(
    simulation.enemies[0].health,
    health,
    "attack bypassed dodge recovery",
  );

  for (let index = 0; index < 4; index += 1) simulation.tick();
  simulation.acceptInput({
    seq: 3,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["melee"],
  });
  simulation.tick();
  for (let index = 0; index < 4; index += 1) simulation.tick();
  assert.equal(
    simulation.enemies[0].health,
    health - 24,
    "attack stayed locked after dodge recovery",
  );
});

test("authoritative bow fire keeps its action state and rejects a skyward shot at a ground target", () => {
  const skyward = new ChapterSimulation(playerId, "courtyard");
  skyward.player.x = 4.5;
  skyward.player.z = 0;
  skyward.enemies = [skyward.enemies[0]];
  skyward.enemies[0].x = 4.5;
  skyward.enemies[0].z = -5;
  const initialHealth = skyward.enemies[0].health;
  skyward.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0.35,
    held: ["aim"],
    pressed: ["fire"],
  });
  skyward.tick();
  assert.equal(skyward.enemies[0].health, initialHealth);
  assert.equal(skyward.player.state, "fire");

  const level = new ChapterSimulation(playerId, "courtyard");
  level.player.x = 4.5;
  level.player.z = 0;
  level.enemies = [level.enemies[0]];
  level.enemies[0].x = 4.5;
  level.enemies[0].z = -5;
  const levelHealth = level.enemies[0].health;
  level.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: ["aim"],
    pressed: ["fire"],
  });
  level.tick();
  for (let index = 0; index < 5; index += 1) level.tick();
  assert.ok(level.enemies[0].health < levelHealth);
  assert.equal(level.player.state, "fire");

  const shallowLongShot = new ChapterSimulation(playerId, "courtyard");
  shallowLongShot.player.x = 4.5;
  shallowLongShot.player.z = 0;
  shallowLongShot.enemies = [shallowLongShot.enemies[0]];
  shallowLongShot.enemies[0].x = 4.5;
  shallowLongShot.enemies[0].z = -10;
  const longHealth = shallowLongShot.enemies[0].health;
  shallowLongShot.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0.12,
    held: ["aim"],
    pressed: ["fire"],
  });
  shallowLongShot.tick();
  assert.equal(
    shallowLongShot.enemies[0].health,
    longHealth,
    "a visibly over-target arrow dealt authoritative damage",
  );

  const shallowCloseShot = new ChapterSimulation(playerId, "courtyard");
  shallowCloseShot.player.x = 4.5;
  shallowCloseShot.player.z = 0;
  shallowCloseShot.enemies = [shallowCloseShot.enemies[0]];
  shallowCloseShot.enemies[0].x = 4.5;
  shallowCloseShot.enemies[0].z = -2;
  const closeHealth = shallowCloseShot.enemies[0].health;
  shallowCloseShot.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0.12,
    held: ["aim"],
    pressed: ["fire"],
  });
  shallowCloseShot.tick();
  for (let index = 0; index < 2; index += 1) shallowCloseShot.tick();
  assert.ok(
    shallowCloseShot.enemies[0].health < closeHealth,
    "a visible close-range torso intersection was rejected",
  );
});

test("authoritative bow selection matches the visible reticle-first target lock", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.loadPhase("courtyard", {
    resetPlayer: false,
    activateEncounter: false,
  });
  simulation.player.x = 4.5;
  simulation.player.z = 0;
  const offAxis = simulation.enemies[0];
  const centred = simulation.enemies[1];
  simulation.enemies = [offAxis, centred];
  offAxis.x = 6.5;
  offAxis.z = -4;
  centred.x = 4.5;
  centred.z = -8;
  offAxis.attackCooldown = 999;
  centred.attackCooldown = 999;
  const offAxisHealth = offAxis.health;
  const centredHealth = centred.health;

  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: ["aim"],
    pressed: ["fire"],
  });
  simulation.tick();
  for (let index = 0; index < 8; index += 1) simulation.tick();

  assert.equal(
    offAxis.health,
    offAxisHealth,
    "a nearer off-axis enemy stole the locked shot",
  );
  assert.equal(
    centred.health,
    centredHealth - 30,
    "the enemy beneath the reticle did not receive the authoritative shot",
  );
});

test("ten consecutive locked bow shots damage the same reticle-first target", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.loadPhase("courtyard", {
    resetPlayer: false,
    activateEncounter: false,
  });
  simulation.player.x = 4.5;
  simulation.player.z = 0;
  const offAxis = simulation.enemies[0];
  const centred = simulation.enemies[1];
  simulation.enemies = [offAxis, centred];
  offAxis.x = 6.5;
  offAxis.z = -4;
  centred.x = 4.5;
  centred.z = -8;
  offAxis.health = 1_000;
  centred.health = 1_000;
  offAxis.attackCooldown = 999;
  centred.attackCooldown = 999;

  for (let shot = 0; shot < 10; shot += 1) {
    const centredBefore = centred.health;
    const offAxisBefore = offAxis.health;
    simulation.acceptInput({
      seq: shot + 1,
      move: [0, 0],
      aimYaw: 0,
      aimPitch: 0,
      held: ["aim"],
      pressed: ["fire"],
    });
    for (let index = 0; index < 16; index += 1) simulation.tick();
    assert.equal(
      centred.health,
      centredBefore - 30,
      `locked shot ${shot + 1} missed`,
    );
    assert.equal(
      offAxis.health,
      offAxisBefore,
      `locked shot ${shot + 1} hit the wrong enemy`,
    );
  }
});

test("a doorway target locked at release receives the arrow after moving during flight", () => {
  const simulation = new ChapterSimulation(playerId, "doorway");
  const archer = simulation.enemies.find((enemy) => enemy.kind === "archer");
  assert.ok(archer);
  simulation.enemies = [archer];
  simulation.player.x = 12;
  simulation.player.y = 6;
  simulation.player.z = -44;
  archer.x = 8;
  archer.y = 6;
  archer.z = -54;
  archer.attackCooldown = 999;
  const yaw = Math.atan2(
    archer.x - simulation.player.x,
    -(archer.z - simulation.player.z),
  );
  const pitch = Math.atan2(
    1.1 - 1.42,
    Math.hypot(archer.x - 12, archer.z + 44),
  );
  const initialHealth = archer.health;

  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: yaw,
    aimPitch: pitch,
    held: ["aim"],
    pressed: ["fire"],
  });
  simulation.tick();
  archer.x = 17;
  for (let index = 0; index < 12; index += 1) simulation.tick();

  assert.equal(archer.health, initialHealth - 30);
});

test("a second long-range bow shot does not erase an arrow already in flight", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 6;
  simulation.player.z = 15;
  const archer = simulation.enemies.find((enemy) => enemy.kind === "archer");
  assert.ok(archer);
  simulation.enemies = [archer];
  archer.x = 6;
  archer.z = -5;
  archer.attackCooldown = 10;

  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: ["aim"],
    pressed: ["fire"],
  });
  simulation.tick();
  for (let index = 0; index < 14; index += 1) simulation.tick();
  simulation.acceptInput({
    seq: 2,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: ["aim"],
    pressed: ["fire"],
  });
  simulation.tick();
  for (let index = 0; index < 20; index += 1) simulation.tick();

  assert.equal(
    archer.health,
    0,
    "the second shot replaced the first unresolved projectile",
  );
  assert.equal(archer.dead, true);
});

test("melee damage lands on an active frame instead of the input frame", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 4.5;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  simulation.enemies[0].x = 4.5;
  simulation.enemies[0].z = -2;
  const initialHealth = simulation.enemies[0].health;

  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["melee"],
  });
  simulation.tick();
  assert.equal(
    simulation.enemies[0].health,
    initialHealth,
    "blade damage landed before the visible swing could begin",
  );

  for (let index = 0; index < 4; index += 1) simulation.tick();
  assert.ok(
    simulation.enemies[0].health < initialHealth,
    "blade active frame never dealt damage",
  );
});

test("a received hit owns the player state and movement for the configured reaction window", () => {
  const simulation = new ChapterSimulation(playerId, "courtyard");
  simulation.player.x = 0;
  simulation.player.z = 0;
  simulation.enemies = [simulation.enemies[0]];
  const enemy = simulation.enemies[0];
  enemy.x = 0;
  enemy.z = -1;
  enemy.yaw = Math.PI;
  enemy.warning = 0.05;
  enemy.attackCooldown = 1;
  simulation.tick();
  assert.equal(simulation.player.state, "hit");
  const hitPosition = { x: simulation.player.x, z: simulation.player.z };

  simulation.acceptInput({
    seq: 1,
    move: [1, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: ["sprint"],
    pressed: ["melee"],
  });
  for (let index = 0; index < 4; index += 1) simulation.tick();
  assert.equal(
    simulation.player.state,
    "hit",
    "locomotion or attack overwrote the hit reaction too early",
  );
  assert.deepEqual(
    { x: simulation.player.x, z: simulation.player.z },
    hitPosition,
    "player moved during the hit reaction lock",
  );
});

test("dodge recovery prevents a roll from restarting immediately", () => {
  const simulation = new ChapterSimulation(playerId, "arrival");
  simulation.acceptInput({
    seq: 1,
    move: [0, 1],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["dodge"],
  });
  simulation.tick();
  for (let index = 0; index < 13; index += 1) simulation.tick();
  simulation.acceptInput({
    seq: 2,
    move: [0, 1],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["dodge"],
  });
  simulation.tick();
  assert.notEqual(
    simulation.player.state,
    "dodge",
    "a second dodge bypassed the recovery window",
  );
});

test("a dodge press during recovery is buffered and starts once recovery ends", () => {
  const simulation = new ChapterSimulation(playerId, "arrival");
  let sequence = 1;
  let started = 0;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    simulation.acceptInput({
      seq: sequence++,
      move: [0, 1],
      aimYaw: 0,
      aimPitch: 0,
      held: [],
      pressed: ["dodge"],
    });
    let previousState = simulation.player.state;
    for (let tick = 0; tick < 24; tick += 1) {
      simulation.tick();
      if (simulation.player.state === "dodge" && previousState !== "dodge") {
        started += 1;
        break;
      }
      previousState = simulation.player.state;
    }
    assert.equal(started, attempt + 1, `dodge tap ${attempt + 1} was dropped`);
    for (let tick = 0; tick < 12; tick += 1) simulation.tick();
  }

  assert.equal(started, 20);
});

test("dodge invulnerability follows the configured 0.20 to 0.50 second window", () => {
  const simulation = new ChapterSimulation(playerId, "arrival");
  simulation.acceptInput({
    seq: 1,
    move: [0, 0],
    aimYaw: 0,
    aimPitch: 0,
    held: [],
    pressed: ["dodge"],
  });
  simulation.tick();

  for (let index = 0; index < 3; index += 1) simulation.tick();
  assert.equal(
    simulation.player.invulnerable,
    0,
    "i-frames began before 0.20 seconds",
  );
  simulation.tick();
  assert.ok(
    simulation.player.invulnerable > 0,
    "i-frames did not begin at 0.20 seconds",
  );
  for (let index = 0; index < 5; index += 1) simulation.tick();
  assert.ok(
    simulation.player.invulnerable > 0,
    "i-frames ended before 0.50 seconds",
  );
  simulation.tick();
  assert.equal(
    simulation.player.invulnerable,
    0,
    "i-frames remained after 0.50 seconds",
  );
});
