import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  COLLIDERS,
  collides,
  floorHeightAt,
  moveWithCollision,
} from "../src/chapter-1/collision.ts";
import worldLayout from "../../client-scripts/world-layout.json" with { type: "json" };

// The environment revamp swapped greybox buildings for imported house models and
// declared them "visual-only". Nothing then stopped a placement from being dropped
// on top of the authored route, and that is exactly what happened on the two legs
// after Chitra: the player had to walk through RevampFortificationGate,
// RevampHouse30D, RevampHouse20 and RevampHouse31H to reach the courtyard.
// These checks fail if an imported building is moved back onto the route, or if a
// collider added for one of them seals a leg.

const MODEL_FILES: Record<string, string> = {
  RevampHouse18A: "civilian_house_18_a.glb",
  RevampHouse20: "civilian_house_20.glb",
  RevampHouse30D: "civilian_house_30_d.glb",
  RevampHouse31H: "civilian_house_31_h.glb",
  RevampHouse37H: "civilian_house_37_h.glb",
  RevampHouse41C: "civilian_house_41_c.glb",
  RevampFortificationGate: "fortification_gate.glb",
  RevampTentA: "tent_a.glb",
  RevampTentB: "tent_b.glb",
};

const MODEL_DIR = fileURLToPath(
  new URL(
    "../../../site/public/playcanvas/chapter-1/assets/models/env-revamp/",
    import.meta.url,
  ),
);

type Matrix = number[];
const IDENTITY: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(a: Matrix, b: Matrix): Matrix {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1)
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  return out;
}

function nodeMatrix(node: Record<string, number[]>): Matrix {
  if (node.matrix) return node.matrix.slice();
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const scale = node.scale ?? [1, 1, 1];
  const matrix = [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1,
  ];
  for (let column = 0; column < 3; column += 1)
    for (let row = 0; row < 3; row += 1) matrix[column * 4 + row] *= scale[column];
  matrix[12] = tx;
  matrix[13] = ty;
  matrix[14] = tz;
  return matrix;
}

const COMPONENT_ARRAYS: Record<number, {
  new (b: ArrayBufferLike, o: number, l: number): ArrayLike<number>;
  readonly BYTES_PER_ELEMENT: number;
}> = {
  5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
  5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array,
};

// XZ bounds of the geometry a walking body would hit, in local space. Roofs and
// eaves overhang the walls by metres on these models, so a whole-model AABB would
// report a wall where there is only sky.
function groundBandBounds(file: string): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const buffer = readFileSync(MODEL_DIR + file);
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(
    new TextDecoder().decode(buffer.subarray(20, 20 + jsonLength)),
  );
  const binaryOffset = 20 + jsonLength + ((4 - (jsonLength % 4)) % 4);
  const binary = buffer.subarray(
    binaryOffset + 8,
    binaryOffset + 8 + buffer.readUInt32LE(binaryOffset),
  );
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const visit = (index: number, parent: Matrix) => {
    const node = gltf.nodes[index];
    const matrix = multiply(parent, nodeMatrix(node));
    if (node.mesh !== undefined)
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        const accessor = gltf.accessors[primitive.attributes.POSITION];
        const view = gltf.bufferViews[accessor.bufferView];
        const Component = COMPONENT_ARRAYS[accessor.componentType];
        const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        const stride = view.byteStride ?? 3 * Component.BYTES_PER_ELEMENT;
        for (let i = 0; i < accessor.count; i += 1) {
          const local = new Component(binary.buffer, binary.byteOffset + start + i * stride, 3);
          const x = matrix[0] * local[0] + matrix[4] * local[1] + matrix[8] * local[2] + matrix[12];
          const y = matrix[1] * local[0] + matrix[5] * local[1] + matrix[9] * local[2] + matrix[13];
          const z = matrix[2] * local[0] + matrix[6] * local[1] + matrix[10] * local[2] + matrix[14];
          // Everything from the base up to head height. A wall is often a single
          // quad with no vertex at chest height, so this cannot be a band —
          // it has to run from the ground up, and only the roof gets dropped.
          // Models are placed at scale ~0.6-0.7, so 2.6 local is ~1.8 metres.
          if (y > 2.6) continue;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }
      }
    for (const child of node.children ?? []) visit(child, matrix);
  };
  for (const root of gltf.scenes[gltf.scene ?? 0].nodes) visit(root, IDENTITY);
  return { minX, maxX, minZ, maxZ };
}

const boundsCache = new Map<string, ReturnType<typeof groundBandBounds>>();

function footprint(model: string, placement: number[]) {
  const [x, , z, yawDegrees, scale] = placement;
  const file = MODEL_FILES[model];
  if (!boundsCache.has(file)) boundsCache.set(file, groundBandBounds(file));
  const local = boundsCache.get(file)!;
  const yaw = (yawDegrees * Math.PI) / 180;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const localX of [local.minX, local.maxX])
    for (const localZ of [local.minZ, local.maxZ]) {
      const worldX = (localX * cos + localZ * sin) * scale + x;
      const worldZ = (-localX * sin + localZ * cos) * scale + z;
      minX = Math.min(minX, worldX);
      maxX = Math.max(maxX, worldX);
      minZ = Math.min(minZ, worldZ);
      maxZ = Math.max(maxZ, worldZ);
    }
  return { minX, maxX, minZ, maxZ };
}

function distanceToSegment(
  x: number,
  z: number,
  a: { x: number; z: number },
  b: { x: number; z: number },
): number {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const length = vx * vx + vz * vz;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / length));
  return Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t));
}

const PLAYER_RADIUS = 0.55;
// The authored centreline must never run closer to a wall than the player is wide.
// Before this fix RevampFortificationGate sat 0.05 m from it, RevampHouse31H 0.08 m
// and RevampHouse30D 0.45 m — the player walked straight through all three.
const REQUIRED_CLEARANCE = 1.1;

test("no imported building stands on the authored route centreline", () => {
  const waypoints = worldLayout.routeWaypoints;
  const offenders: string[] = [];
  for (const [model, placements] of Object.entries(worldLayout.placements)) {
    if (!(model in MODEL_FILES)) continue;
    placements.forEach((placement, index) => {
      const box = footprint(model, placement);
      const baseY = placement[1];
      let nearest = Infinity;
      let nearestLeg = "";
      const edge: Array<[number, number]> = [];
      for (let t = 0; t <= 1.0001; t += 0.02) {
        edge.push([box.minX + (box.maxX - box.minX) * t, box.minZ]);
        edge.push([box.minX + (box.maxX - box.minX) * t, box.maxZ]);
        edge.push([box.minX, box.minZ + (box.maxZ - box.minZ) * t]);
        edge.push([box.maxX, box.minZ + (box.maxZ - box.minZ) * t]);
      }
      for (let leg = 0; leg + 1 < waypoints.length; leg += 1) {
        const a = waypoints[leg];
        const b = waypoints[leg + 1];
        // Only compare against legs on the building's own terrace.
        if (Math.abs((a.y + b.y) / 2 - (baseY + 0.5)) > 2) continue;
        for (const [x, z] of edge) {
          const distance = distanceToSegment(x, z, a, b);
          if (distance < nearest) {
            nearest = distance;
            nearestLeg = `(${a.x},${a.z})->(${b.x},${b.z})`;
          }
        }
        // Edge distance alone would score a leg that runs clean through the
        // middle of a house as comfortably clear of its walls.
        for (let t = 0; t <= 1.0001; t += 0.01) {
          const x = a.x + (b.x - a.x) * t;
          const z = a.z + (b.z - a.z) * t;
          if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) {
            nearest = 0;
            nearestLeg = `(${a.x},${a.z})->(${b.x},${b.z})`;
          }
        }
      }
      if (nearest < REQUIRED_CLEARANCE)
        offenders.push(
          `${model}:${index} ${JSON.stringify(placement)} is ${nearest.toFixed(2)}m from leg ${nearestLeg}`,
        );
    });
  }
  assert.deepEqual(offenders, []);
});

test("every route waypoint is still reachable from Chitra once the buildings are solid", () => {
  const { minX, maxX, minZ, maxZ } = worldLayout.worldBounds;
  const cell = 0.5;
  const columns = Math.ceil((maxX - minX) / cell);
  const rows = Math.ceil((maxZ - minZ) / cell);
  const at = (column: number, row: number) => ({
    x: minX + column * cell + cell / 2,
    z: minZ + row * cell + cell / 2,
  });
  const standable = (column: number, row: number): number | null => {
    const point = at(column, row);
    const floor = floorHeightAt(point);
    if (floor === null) return null;
    return collides({ ...point, y: floor }, PLAYER_RADIUS) ? null : floor;
  };

  const [chitraX, , chitraZ] = worldLayout.landmarks.chitraArrival;
  const start: [number, number] = [
    Math.floor((chitraX - minX) / cell),
    Math.floor((chitraZ + 0.5 - minZ) / cell),
  ];
  assert.notEqual(standable(...start), null, "Chitra's arrival mark is not standable");

  const key = (column: number, row: number) => row * columns + column;
  const seen = new Set([key(...start)]);
  const queue: Array<[number, number]> = [start];
  while (queue.length) {
    const [column, row] = queue.pop()!;
    const floor = standable(column, row) ?? 0;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nextColumn = column + dc;
      const nextRow = row + dr;
      if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows)
        continue;
      const id = key(nextColumn, nextRow);
      if (seen.has(id)) continue;
      const nextFloor = standable(nextColumn, nextRow);
      // Mirrors the step height moveWithCollision allows.
      if (nextFloor === null || Math.abs(nextFloor - floor) > 1.05) continue;
      seen.add(id);
      queue.push([nextColumn, nextRow]);
    }
  }

  const unreachable = worldLayout.routeWaypoints
    .filter(
      (waypoint) =>
        !seen.has(
          key(
            Math.floor((waypoint.x - minX) / cell),
            Math.floor((waypoint.z - minZ) / cell),
          ),
        ),
    )
    .map((waypoint) => `(${waypoint.x},${waypoint.z})`);
  assert.deepEqual(unreachable, []);
});

test("the houses flanking the post-Chitra route are solid", () => {
  const revampColliders = worldLayout.colliders.filter((collider) =>
    String(collider.visual ?? "").startsWith("Revamp"),
  );
  assert.ok(
    revampColliders.length >= 6,
    "the imported houses lining the route lost their colliders",
  );
  for (const collider of revampColliders) {
    const centre = {
      x: (collider.minX + collider.maxX) / 2,
      z: (collider.minZ + collider.maxZ) / 2,
    };
    const box = COLLIDERS.find(({ id }) => id === collider.id);
    assert.ok(box, `${collider.id} is missing from COLLIDERS`);
    assert.ok(
      collides({ ...centre, y: box.y }, PLAYER_RADIUS),
      `${collider.id} does not block the player`,
    );
  }
});

test("empty visible ground is not blocked by retired scenery", () => {
  for (const sample of [
    { id: "upper street door", x: 10.12, y: 6, z: -32 },
    { id: "doorway torana centreline", x: 1.675, y: 6, z: -50 },
    { id: "market east frontage", x: -13.1, y: 6, z: -18 },
    { id: "market west frontage", x: -25.2, y: 6, z: -26 },
    { id: "courtyard return beyond the replacement house", x: 18, y: 0, z: 3.6 },
    { id: "outside the market stall mesh", x: -25.3, y: 6, z: -28 },
    { id: "outside the rath mesh", x: 14.5, y: 6, z: -47 },
  ])
    assert.equal(
      collides(sample, PLAYER_RADIUS),
      false,
      `${sample.id} is still an invisible wall`,
    );
});

test("colliders still cover the visible architecture", () => {
  for (const sample of [
    { id: "arrival well", x: 4, y: 0, z: 14 },
    { id: "market stall", x: -24.2, y: 6, z: -28 },
    { id: "rath", x: 16.1, y: 6, z: -47 },
    { id: "doorway torana south post", x: 0.03, y: 6, z: -50.92 },
    { id: "gate torana west post", x: 11.08, y: 6, z: -50.77 },
    { id: "replacement courtyard house", x: 17, y: 0, z: 3.6 },
    { id: "gate west house frontage", x: 6.4, y: 6, z: -40 },
    { id: "arrival west rampart", x: -9.8, y: 0, z: 23 },
    { id: "arrival west tent", x: -8.55, y: 0, z: 18.4 },
    { id: "arrival east house", x: 9.8, y: 0, z: 18 },
  ])
    assert.equal(
      collides(sample, PLAYER_RADIUS),
      true,
      `${sample.id} lost its solid footprint`,
    );
});

test("the open arrival shoulders reach the visible facade line", () => {
  for (const targetX of [-8, 8]) {
    const start = { x: 0, y: 0, z: 26 };
    const moved = moveWithCollision(start, { x: targetX, z: 0 }, PLAYER_RADIUS);
    assert.ok(
      Math.abs(moved.x - targetX) < 0.05,
      `arrival shoulder stopped at x=${moved.x} before target x=${targetX}`,
    );
  }
});
