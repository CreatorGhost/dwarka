import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ENVIRONMENT_TONES } from "../../game/client-scripts/scene/materials.js";
import { MODEL_URLS, REVAMP_ENVIRONMENT_MODELS } from "../../game/client-scripts/scene/assets.js";
import {
  AGED_TRIM_MODELS,
  environmentGroundCorrection,
} from "../../game/client-scripts/scene/build.js";
import { inspectImportedDoorOpenings } from "../tools/env-revamp-geometry.mjs";

const sourceLayoutUrl = new URL("../../game/client-scripts/world-layout.json", import.meta.url);

async function readSourceLayout() {
  return JSON.parse(await readFile(sourceLayoutUrl, "utf8"));
}

function parseGlb(buffer) {
  assert.equal(buffer.toString("utf8", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const jsonLength = buffer.readUInt32LE(12);
  assert.equal(buffer.toString("utf8", 16, 20), "JSON");
  return JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
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

test("the guarded arrival revamp keeps its explicit collider contract and coherent asset slice", async () => {
  const layout = await readSourceLayout();
  const revamp = layout.environmentRevamp;

  assert.equal(revamp.mode, "arrival-candidate");
  assert.equal(
    revamp.collisionContract,
    "visual-only except the route-flanking houses listed in colliders with a Revamp visual",
  );
  assert.equal(revamp.visibilityRadius, 42);
  assert.equal(layout.colliders.length, 26);
  assert.deepEqual(revamp.preservedSystems, [
    "colliders",
    "floorRegions",
    "spawns",
    "familyStaging",
    "encounterTriggers",
  ]);
  assert.deepEqual(revamp.models, [...REVAMP_ENVIRONMENT_MODELS]);

  const revampColliders = layout.colliders.filter(({ visual }) =>
    visual?.startsWith("Revamp"),
  );
  assert.equal(revampColliders.length, 13);
  for (const collider of revampColliders) {
    assert.ok(
      revamp.models.includes(collider.visual),
      `${collider.id} names an undeclared Revamp model`,
    );
    assert.ok(
      layout.placements[collider.visual]?.length > 0,
      `${collider.id} has no authored ${collider.visual} placement`,
    );
  }

  const bounds = layout.worldBounds;
  assert.ok(bounds.minX < bounds.maxX && bounds.minZ < bounds.maxZ);
  for (const collider of layout.colliders) {
    assert.ok(collider.minX < collider.maxX && collider.minZ < collider.maxZ);
    assert.ok(
      collider.maxX > bounds.minX &&
        collider.minX < bounds.maxX &&
        collider.maxZ > bounds.minZ &&
        collider.minZ < bounds.maxZ,
      `${collider.id} does not intersect the authored world bounds`,
    );
  }
  for (const floor of layout.floorRegions) {
    assert.ok(floor.minX < floor.maxX && floor.minZ < floor.maxZ);
    assert.ok(
      floor.minX >= bounds.minX &&
        floor.maxX <= bounds.maxX &&
        floor.minZ >= bounds.minZ &&
        floor.maxZ <= bounds.maxZ,
      `${floor.id} extends beyond the authored world bounds`,
    );
  }

  let byteCount = 0;
  let uniqueTriangles = 0;
  let primitiveSlots = 0;
  for (const key of REVAMP_ENVIRONMENT_MODELS) {
    assert.match(MODEL_URLS[key], /\.glb$/);
    assert.ok(layout.placements[key]?.length > 0, `${key} needs an authored placement`);
    const asset = await readFile(
      new URL(`../public/playcanvas/chapter-1/${MODEL_URLS[key]}`, import.meta.url),
    );
    assert.ok(asset.length > 50_000, `${key} is not a usable GLB`);
    byteCount += asset.length;
    const gltf = parseGlb(asset);
    assert.ok(gltf.meshes?.length > 0, `${key} has no mesh`);
    assert.equal(gltf.images?.length || 0, 0, `${key} unexpectedly embeds images`);
    for (const mesh of gltf.meshes) {
      for (const primitive of mesh.primitives) {
        primitiveSlots += 1;
        assert.ok(Number.isInteger(primitive.indices), `${key} primitive is not indexed`);
        assert.ok(Number.isInteger(primitive.attributes?.POSITION), `${key} lacks positions`);
        assert.ok(Number.isInteger(primitive.attributes?.NORMAL), `${key} lacks normals`);
        assert.ok(Number.isInteger(primitive.material), `${key} lacks a material reference`);
        assert.ok(primitive.material < gltf.materials.length, `${key} material index is invalid`);
        const indices = gltf.accessors[primitive.indices];
        assert.equal(indices.count % 3, 0, `${key} has a non-triangle index count`);
        uniqueTriangles += indices.count / 3;
        const positions = gltf.accessors[primitive.attributes.POSITION];
        assert.equal(positions.type, "VEC3");
        assert.ok(Array.isArray(positions.min) && Array.isArray(positions.max));
        assert.ok(positions.min.every(Number.isFinite));
        assert.ok(positions.max.every(Number.isFinite));
      }
    }
  }

  assert.equal(byteCount, 2_491_736);
  assert.equal(uniqueTriangles, 30_429);
  assert.equal(primitiveSlots, 58);

  const arrivalPlacements = REVAMP_ENVIRONMENT_MODELS.flatMap((key) => layout.placements[key]);
  assert.equal(arrivalPlacements.length, 33);
  const trianglesByModel = new Map();
  for (const key of REVAMP_ENVIRONMENT_MODELS) {
    const asset = await readFile(
      new URL(`../public/playcanvas/chapter-1/${MODEL_URLS[key]}`, import.meta.url),
    );
    const gltf = parseGlb(asset);
    trianglesByModel.set(
      key,
      gltf.meshes.flatMap(({ primitives }) => primitives).reduce(
        (sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3,
        0,
      ),
    );
  }
  const instancedTriangles = REVAMP_ENVIRONMENT_MODELS.reduce(
    (sum, key) => sum + trianglesByModel.get(key) * layout.placements[key].length,
    0,
  );
  assert.equal(instancedTriangles, 86_358);
  assert.ok(
    layout.placements.RevampTentA.every(([x, y]) => Math.abs(x) >= 8.5 && y === 0) &&
      layout.placements.RevampTentB.every(([x, y]) => Math.abs(x) >= 8.5 && y === 0) &&
      layout.placements.RevampFortificationGate.every(
        ([x, y]) => Math.abs(x) >= 11.5 && y === -0.5,
      ),
    "pack dressing must remain outside the central route and keep its authored ground offsets",
  );
});

test("all authored doors retain a rendered opening and bounded collider pairing", async () => {
  const layout = await readSourceLayout();
  const buildSource = await readFile(
    new URL("../../game/client-scripts/scene/build.js", import.meta.url),
    "utf8",
  );
  const qaSource = await readFile(
    new URL("../../game/client-scripts/runtime/qa.js", import.meta.url),
    "utf8",
  );
  assert.equal(layout.doors.length, 7);
  assert.equal(new Set(layout.doors.map(({ id }) => id)).size, 7);
  assert.equal(
    layout.doors.some(({ id }) => id === "street-door-east-15"),
    false,
    "the detached east-15 door must not regain an invisible collider",
  );
  for (const door of layout.doors) {
    const asset = layout.doorAssets[door.entity] || {};
    const width = (door.width ?? asset.width) * door.scale;
    const depth = (door.depth ?? asset.depth) * door.scale;
    assert.ok(width > 0 && depth > 0, `${door.id} cannot produce a collider`);
    const yaw = (door.yaw * Math.PI) / 180;
    const halfX =
      (Math.abs(Math.cos(yaw)) * width + Math.abs(Math.sin(yaw)) * depth) / 2;
    const halfZ =
      (Math.abs(Math.sin(yaw)) * width + Math.abs(Math.cos(yaw)) * depth) / 2;
    const collider = {
      minX: door.position[0] - halfX,
      maxX: door.position[0] + halfX,
      minZ: door.position[2] - halfZ,
      maxZ: door.position[2] + halfZ,
    };
    const centreX = (collider.minX + collider.maxX) / 2;
    const centreZ = (collider.minZ + collider.maxZ) / 2;
    assert.ok(Math.hypot(centreX - door.position[0], centreZ - door.position[2]) <= 0.12);
  }
  assert.doesNotMatch(buildSource, /createDoorPortal/);
  const cullBlock = buildSource.slice(
    buildSource.indexOf("ENVIRONMENT_REVAMP.mode !== \"arrival-candidate\""),
    buildSource.indexOf("function styleRevampEnvironment"),
  );
  assert.doesNotMatch(cullBlock, /"Door_4_Flat"/);
  assert.match(qaSource, /result\.authored === 7/);
  assert.match(qaSource, /result\.openable === 2/);
  assert.match(qaSource, /positionError <= 0\.12/);
  assert.match(qaSource, /yawError <= 1\.5/);
  assert.match(qaSource, /colliderError <= 0\.12/);

  const geometry = await inspectImportedDoorOpenings({ layout });
  const measured = geometry.pairs.filter(({ passed }) => passed);
  assert.deepEqual(
    measured.map(({ id }) => id),
    ["street-door-west-23"],
  );
  for (const opening of measured) {
    assert.equal(opening.house, "RevampFortificationGate");
    assert.ok(opening.measuredOpeningWidth >= 1.16);
    assert.ok(opening.measuredOpeningHeight >= 2.3);
    assert.equal(opening.playerDiameter, 1.1);
    assert.ok(opening.sweptLateralClearance >= 0.03);
    assert.ok(opening.samplingUncertainty <= 0.02);
    assert.ok(opening.facadeDepth >= 0.09);
    assert.ok(opening.planeOffset <= 0.02);
    assert.ok(opening.closedDoorApproachVisualClearance >= 0);
    assert.equal(opening.sideWallHits, 2);
    assert.equal(opening.headerHit, true);
  }
  assert.equal(
    geometry.pairs.filter(({ passed }) => !passed).length,
    5,
    "five farther imported openings remain explicitly unresolved in this arrival-only checkpoint",
  );
});

test("the revamp uses budgeted architecture shadows without plaster emissive fill", async () => {
  const layout = await readSourceLayout();
  const buildSource = await readFile(
    new URL("../../game/client-scripts/scene/build.js", import.meta.url),
    "utf8",
  );
  assert.equal(layout.environmentRevamp.shadowCastMinZ, 23);
  assert.match(buildSource, /dwarkaArchitectureShadowCaster = castsShadows/);
  assert.doesNotMatch(buildSource, /channel \* 0\.28/);
  assert.match(buildSource, /let emissive = \[0, 0, 0\]/);
});
