import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ENVIRONMENT_TONES } from "../../game/client-scripts/scene/materials.js";
import { MODEL_URLS, REVAMP_ENVIRONMENT_MODELS } from "../../game/client-scripts/scene/assets.js";
import {
  AGED_TRIM_MODELS,
  environmentGroundCorrection,
} from "../../game/client-scripts/scene/build.js";

const sourceLayoutUrl = new URL("../../game/client-scripts/world-layout.json", import.meta.url);

async function readSourceLayout() {
  return JSON.parse(await readFile(sourceLayoutUrl, "utf8"));
}

function distanceToCollider([x, , z], collider) {
  const nearestX = Math.max(collider.minX, Math.min(x, collider.maxX));
  const nearestZ = Math.max(collider.minZ, Math.min(z, collider.maxZ));
  return Math.hypot(x - nearestX, z - nearestZ);
}

test("every visible door is human-scaled and seated inside its authored wall plane", async () => {
  const layout = await readSourceLayout();
  const flatDoor = layout.doorAssets.Door_4_Flat;

  assert.ok(flatDoor.height > 0);
  for (const door of layout.doors) {
    const height = (door.height ?? flatDoor.height) * (door.scale ?? 1);
    assert.ok(height >= 2.1 && height <= 2.3, `${door.id} is ${height.toFixed(3)}m high`);
    if (door.entity === "Door_4_Flat" && Math.abs(door.position[1]) < 0.01)
      assert.equal(Math.abs(door.position[0]), 10.12);
  }

  const palaceWall = layout.landmarks.doorway.primitives.find(
    ({ name }) => name === "Distant palace wall west",
  );
  const palaceDoor = layout.landmarks.doorway.primitives.find(
    ({ name }) => name === "Distant palace door",
  );
  const palaceFloorY = 6;
  assert.ok(palaceDoor);
  assert.ok(
    palaceDoor.scale[1] >= 2.1 && palaceDoor.scale[1] <= 2.3,
    `palace door is ${palaceDoor.scale[1]}m high`,
  );
  assert.equal(palaceDoor.position[1], palaceFloorY + palaceDoor.scale[1] / 2);
  const wallFront = palaceWall.position[2] + palaceWall.scale[2] / 2;
  const doorBack = palaceDoor.position[2] - palaceDoor.scale[2] / 2;
  assert.ok(
    doorBack <= wallFront,
    `palace door back ${doorBack} sits proud of wall front ${wallFront}`,
  );
});

test("family and Chitra silhouettes stay clear of walls and one another", async () => {
  const layout = await readSourceLayout();
  for (const phase of ["courtyard", "market", "doorway", "ending"])
    assert.equal(layout.familyStaging[phase].members.length, 2);
  const staged = Object.values(layout.familyStaging).flatMap(({ members = [] }) =>
    members.map(({ position }) => position),
  );
  const chitraArrival = layout.landmarks.chitraArrival;
  const chitraEnding = layout.landmarks.chitraEnding;
  const characters = [...staged, chitraArrival, chitraEnding];

  for (const position of characters) {
    const nearestWall = Math.min(
      ...layout.colliders
        .filter(({ label }) => /wall|frontage|post/i.test(label))
        .map((collider) => distanceToCollider(position, collider)),
    );
    assert.ok(
      nearestWall >= 0.75,
      `NPC at ${position.join(",")} is only ${nearestWall.toFixed(2)}m from a wall`,
    );
  }

  const endingMembers = layout.familyStaging.ending.members.map(({ position }) => position);
  for (const member of endingMembers) {
    assert.ok(
      Math.hypot(member[0] - chitraEnding[0], member[2] - chitraEnding[2]) >= 1.1,
      "an ending family member overlaps Chitra",
    );
  }
});

test("architecture and street props use a restrained period palette", async () => {
  const layout = await readSourceLayout();
  for (const name of ["houseLime", "houseOchre", "houseRose"]) {
    const color = ENVIRONMENT_TONES[name];
    const maximum = Math.max(...color);
    const minimum = Math.min(...color);
    assert.ok(maximum <= 0.34, `${name} is too bright`);
    assert.ok((maximum - minimum) / maximum <= 0.25, `${name} is too saturated`);
  }
  assert.equal(layout.placements.Bench, undefined);
  assert.ok(
    ENVIRONMENT_TONES.agedTimber[0] >= ENVIRONMENT_TONES.agedTimber[1] &&
      ENVIRONMENT_TONES.agedTimber[1] >= ENVIRONMENT_TONES.agedTimber[2],
    "cart timber must read warm brown rather than black",
  );
  assert.ok(
    ENVIRONMENT_TONES.marketCanopy[0] >= ENVIRONMENT_TONES.marketCanopy[1],
    "market canopy must not read as a modern green bench",
  );
  assert.ok(
    Math.max(...ENVIRONMENT_TONES.agedTrim) <= 0.2,
    "roof trim must not blow out white under the moon light",
  );
  assert.deepEqual([...AGED_TRIM_MODELS].sort(), [
    "Kenney_roof_flat_square",
    "Overhang_Plaster_Short",
  ]);
});

test("ground alignment seats both street-level and elevated models", () => {
  for (const [minimumY, requestedY] of [
    [0.18, 0],
    [6.18, 6],
    [9.18, 9],
  ])
    assert.ok(
      Math.abs(environmentGroundCorrection(minimumY, requestedY, 0.035) + 0.145) < 0.000001,
    );
  assert.equal(environmentGroundCorrection(7, 6, 0.035), 0);
});

test("the guarded arrival revamp is a visual-only coherent asset slice", async () => {
  const layout = await readSourceLayout();
  const revamp = layout.environmentRevamp;

  assert.equal(revamp.mode, "arrival-candidate");
  assert.equal(revamp.collisionContract, "visual-only");
  assert.equal(revamp.visibilityRadius, 60);
  assert.equal(layout.colliders.length, 19);
  assert.deepEqual(revamp.preservedSystems, [
    "colliders",
    "floorRegions",
    "spawns",
    "familyStaging",
    "encounterTriggers",
  ]);
  assert.deepEqual(revamp.models, [...REVAMP_ENVIRONMENT_MODELS]);

  for (const key of REVAMP_ENVIRONMENT_MODELS) {
    assert.match(MODEL_URLS[key], /\.glb$/);
    assert.ok(layout.placements[key]?.length > 0, `${key} needs an authored placement`);
    const asset = await readFile(
      new URL(`../public/playcanvas/chapter-1/${MODEL_URLS[key]}`, import.meta.url),
    );
    assert.ok(asset.length > 50_000, `${key} is not a usable GLB`);
  }

  const arrivalPlacements = REVAMP_ENVIRONMENT_MODELS.flatMap((key) => layout.placements[key]);
  assert.equal(arrivalPlacements.length, 18);
  assert.ok(
    arrivalPlacements.every(([x, y, z]) => Math.abs(x) >= 10 && y === 0 && z >= -26),
    "the candidate must dress the arrival perimeter without entering its walkable spine",
  );
});
