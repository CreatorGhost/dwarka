import assert from "node:assert/strict";
import test from "node:test";

import {
  collides,
  moveWithCollision,
  segmentBlocked,
} from "../src/chapter-1/collision.ts";
import { ChapterSimulation } from "../src/chapter-1/simulation.ts";

const COURTYARD_DOOR = "courtyard-rescue-door";
const DOORWAY_DOOR = "doorway-rescue-door";
const PLAYER_RADIUS = 0.55;

test("the courtyard door leaf stays solid at mid-swing", () => {
  const midSwingLeafCentre = {
    x: 10.534137230841267,
    y: 0,
    z: -1.1757908249469016,
  };

  assert.equal(
    collides(midSwingLeafCentre, 0.05, new Set(), {
      [COURTYARD_DOOR]: 0.5,
    }),
    true,
  );
});

test("the courtyard aperture grows behind the moving mid-swing leaf", () => {
  const clearedPartOfAperture = { x: 10.12, y: 0, z: -0.45 };

  assert.equal(
    collides(clearedPartOfAperture, 0.05, new Set(), {
      [COURTYARD_DOOR]: 0.5,
    }),
    false,
  );
});

test("the player can cross the cleared side of the mid-swing aperture", () => {
  const moved = moveWithCollision(
    { x: 9, y: 0, z: -0.1 },
    { x: 2.5, z: 0 },
    PLAYER_RADIUS,
    new Set(),
    { [COURTYARD_DOOR]: 0.5 },
  );

  assert.ok(moved.x > 11.2, `stopped at x=${moved.x}`);
});

test("the player cannot cross the same aperture while the door is closed", () => {
  const moved = moveWithCollision(
    { x: 9, y: 0, z: -0.1 },
    { x: 2.5, z: 0 },
    PLAYER_RADIUS,
    new Set(),
    { [COURTYARD_DOOR]: 0 },
  );

  assert.ok(moved.x < 10, `crossed to x=${moved.x}`);
});

test("the player can cross the aperture after the door finishes opening", () => {
  const openDoors = new Set([COURTYARD_DOOR]);
  const moved = moveWithCollision(
    { x: 9, y: 0, z: -0.1 },
    { x: 2.5, z: 0 },
    PLAYER_RADIUS,
    openDoors,
    { [COURTYARD_DOOR]: 1 },
  );

  assert.ok(moved.x > 11.2, `stopped at x=${moved.x}`);
});

test("the fully open courtyard door leaf remains solid", () => {
  const openLeafCentre = {
    x: 10.695367787845193,
    y: 0,
    z: -1.5958107858923185,
  };

  assert.equal(
    collides(openLeafCentre, 0.05, new Set([COURTYARD_DOOR]), {
      [COURTYARD_DOOR]: 1,
    }),
    true,
  );
});

test("the fully open courtyard door leaf still blocks line of sight", () => {
  assert.equal(
    segmentBlocked(
      { x: 10.695, y: 0, z: -2.5 },
      { x: 10.695, y: 0, z: -0.8 },
      new Set([COURTYARD_DOOR]),
      { [COURTYARD_DOOR]: 1 },
    ),
    true,
  );
});

test("the open doorway door does not create a path beyond the world floor", () => {
  const moved = moveWithCollision(
    { x: 12, y: 6, z: -55.3 },
    { x: 0, z: -3 },
    0.55,
    new Set([DOORWAY_DOOR]),
    { [DOORWAY_DOOR]: 1 },
  );

  assert.ok(moved.z >= -55.46, `left the authored floor at z=${moved.z}`);
  assert.equal(moved.y, 6);
});

test("a movement predictor preserves authoritative mid-swing progress", () => {
  const simulation = new ChapterSimulation("door-predictor", "courtyard", true);
  simulation.adoptDoorState([
    { id: COURTYARD_DOOR, progress: 0.5, open: false },
  ]);
  simulation.player = {
    ...simulation.player,
    x: 9,
    y: 0,
    z: -0.1,
  };

  for (let tick = 0; tick < 12; tick += 1) {
    simulation.acceptInput({
      seq: tick + 1,
      move: [1, 0],
      aimYaw: 0,
      aimPitch: 0,
      held: ["sprint"],
      pressed: [],
    });
    simulation.tick(0.05);
  }

  assert.equal(simulation.doorProgress[COURTYARD_DOOR], 0.5);
  assert.equal(simulation.openDoorIds.has(COURTYARD_DOOR), false);
  assert.ok(simulation.player.x > 11.2, `stopped at x=${simulation.player.x}`);
});
