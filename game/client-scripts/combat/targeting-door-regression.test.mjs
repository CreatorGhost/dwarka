import assert from "node:assert/strict";
import test from "node:test";

import {
  collidersForSnapshot,
  doorProgressForSnapshot,
  openDoorIdsForSnapshot,
  targetLineBlocked,
} from "./targeting.js";
import { doorVisualPose } from "../scene/doors.js";
import {
  DOORS,
  doorPoseAtProgress,
} from "../../server/src/chapter-1/collision.ts";

const COURTYARD_DOOR = "courtyard-rescue-door";

test("camera and projectile collision retain the opened door leaf", () => {
  const closedLeaf = [
    9.95,
    10.29,
    -1.58,
    -0.42,
    "Courtyard rescue door",
    COURTYARD_DOOR,
  ];
  const colliders = collidersForSnapshot([closedLeaf], {
    doors: [{ id: COURTYARD_DOOR, progress: 1, open: true }],
  });

  assert.equal(colliders.length, 1);
  assert.equal(colliders[0][5], COURTYARD_DOOR);
  assert.notDeepEqual(colliders[0].slice(0, 4), closedLeaf.slice(0, 4));
});

test("targeting clears the aperture but still respects the opened leaf", () => {
  const snapshot = {
    doors: [{ id: COURTYARD_DOOR, progress: 1, open: true }],
  };
  const openDoorIds = openDoorIdsForSnapshot(snapshot);
  const doorProgress = doorProgressForSnapshot(snapshot);

  assert.equal(
    targetLineBlocked(
      { x: 9, y: 0, z: -0.1 },
      { x: 11.5, y: 0, z: -0.1 },
      openDoorIds,
      doorProgress,
    ),
    false,
  );
  assert.equal(
    targetLineBlocked(
      { x: 10.695, y: 0, z: -2.5 },
      { x: 10.695, y: 0, z: -0.8 },
      openDoorIds,
      doorProgress,
    ),
    true,
  );
});

test("the rendered door pose matches the shared collision pose", () => {
  const door = DOORS.find(({ id }) => id === COURTYARD_DOOR);
  assert.ok(door);
  const assets = { Door_4_Flat: { width: 1.1179 } };

  for (const progress of [0, 0.5, 0.95, 1]) {
    assert.deepEqual(
      doorVisualPose(door, progress, assets),
      doorPoseAtProgress(door, progress),
    );
  }
});
