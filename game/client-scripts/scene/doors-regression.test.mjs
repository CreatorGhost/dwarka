import assert from "node:assert/strict";
import test from "node:test";
import { doorVisualPose, installDoors } from "./doors.js";

const door = {
  id: "courtyard-rescue-door",
  entity: "Door_4_Flat",
  position: [10.12, 0, -1],
  yaw: -90,
  scale: 1.03,
  width: 1.1179,
  openFromPhase: "courtyard",
};

function createHarness() {
  const state = {
    snapshot: null,
    doorEntities: new Map(),
  };
  const transform = {
    x: door.position[0],
    y: door.position[1],
    z: door.position[2],
    yaw: door.yaw,
  };
  const entity = {
    parent: {},
    getPosition() {
      return transform;
    },
    setPosition(x, y, z) {
      Object.assign(transform, { x, y, z });
    },
    setEulerAngles(_x, yaw) {
      transform.yaw = yaw;
    },
  };
  const rt = {
    state,
    DOORS: [door],
    WORLD_LAYOUT: {
      doorAssets: {
        Door_4_Flat: {
          width: door.width,
        },
      },
    },
  };
  installDoors(rt);
  assert.equal(rt.registerDoorEntity(entity, door.entity, door.position), true);
  return { rt, transform };
}

test("a door follows authoritative progress through its swing", () => {
  const { rt, transform } = createHarness();
  const expected = doorVisualPose(door, 0.95, rt.WORLD_LAYOUT.doorAssets);

  rt.updateDoorPresentation(
    {
      doors: [{ id: door.id, progress: 0.95, open: false }],
    },
    0.5,
  );

  assert.ok(Math.abs(transform.x - expected.x) < 1e-9);
  assert.equal(transform.y, expected.y);
  assert.ok(Math.abs(transform.z - expected.z) < 1e-9);
  assert.equal(transform.yaw, expected.yaw);
});

test("a door opens visually when the authoritative collider opens", () => {
  const { rt, transform } = createHarness();
  const expected = doorVisualPose(door, 1, rt.WORLD_LAYOUT.doorAssets);

  rt.updateDoorPresentation(
    {
      doors: [{ id: door.id, progress: 1, open: true }],
    },
    0.01,
  );

  assert.ok(Math.abs(transform.x - expected.x) < 1e-9);
  assert.equal(transform.y, expected.y);
  assert.ok(Math.abs(transform.z - expected.z) < 1e-9);
  assert.equal(transform.yaw, expected.yaw);
});
