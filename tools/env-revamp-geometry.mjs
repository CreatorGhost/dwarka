import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const COMPONENTS = {
  5121: { bytes: 1, read: "readUInt8" },
  5123: { bytes: 2, read: "readUInt16LE" },
  5125: { bytes: 4, read: "readUInt32LE" },
  5126: { bytes: 4, read: "readFloatLE" },
};

const TYPE_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

const HOUSE_FILES = {
  RevampHouse18A: "civilian_house_18_a.glb",
  RevampHouse20: "civilian_house_20.glb",
  RevampHouse30D: "civilian_house_30_d.glb",
  RevampHouse31H: "civilian_house_31_h.glb",
  RevampHouse37H: "civilian_house_37_h.glb",
  RevampHouse41C: "civilian_house_41_c.glb",
  RevampFortificationGate: "fortification_gate.glb",
};

function glbChunks(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "glTF")
    throw new Error("Expected a GLB container");
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
  const binaryHeader = 20 + jsonLength;
  const binaryLength = buffer.readUInt32LE(binaryHeader);
  const binaryOffset = binaryHeader + 8;
  return { json, binary: buffer.subarray(binaryOffset, binaryOffset + binaryLength) };
}

function accessorValues(document, binary, accessorIndex) {
  const accessor = document.accessors[accessorIndex];
  const view = document.bufferViews[accessor.bufferView];
  const component = COMPONENTS[accessor.componentType];
  const width = TYPE_SIZE[accessor.type];
  if (!component || !width) throw new Error(`Unsupported accessor ${accessorIndex}`);
  const stride = view.byteStride || component.bytes * width;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  return Array.from({ length: accessor.count }, (_, index) => {
    const offset = start + index * stride;
    const value = Array.from({ length: width }, (__, componentIndex) =>
      binary[component.read](offset + componentIndex * component.bytes),
    );
    return width === 1 ? value[0] : value;
  });
}

function transformPoint(point, placement) {
  const [x, y, z, yawDegrees, scale] = placement;
  const radians = (yawDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const localX = point[0] * scale;
  const localY = point[1] * scale;
  const localZ = point[2] * scale;
  return [
    x + localX * cosine + localZ * sine,
    y + localY,
    z - localX * sine + localZ * cosine,
  ];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function rayTriangle(origin, direction, triangle) {
  const edge1 = subtract(triangle[1], triangle[0]);
  const edge2 = subtract(triangle[2], triangle[0]);
  const p = cross(direction, edge2);
  const determinant = dot(edge1, p);
  if (Math.abs(determinant) < 1e-7) return null;
  const inverse = 1 / determinant;
  const tVector = subtract(origin, triangle[0]);
  const u = dot(tVector, p) * inverse;
  if (u < -1e-6 || u > 1 + 1e-6) return null;
  const q = cross(tVector, edge1);
  const v = dot(direction, q) * inverse;
  if (v < -1e-6 || u + v > 1 + 1e-6) return null;
  const distance = dot(edge2, q) * inverse;
  return distance >= 0 ? distance : null;
}

export async function loadWallTriangles(file, placement) {
  const { json, binary } = glbChunks(await readFile(file));
  const triangles = [];
  for (const primitive of json.meshes[0].primitives) {
    const material = json.materials?.[primitive.material]?.name || "";
    if (!material.toLowerCase().startsWith("wall")) continue;
    const positions = accessorValues(json, binary, primitive.attributes.POSITION);
    const indices = accessorValues(json, binary, primitive.indices);
    for (let index = 0; index < indices.length; index += 3)
      triangles.push([
        transformPoint(positions[indices[index]], placement),
        transformPoint(positions[indices[index + 1]], placement),
        transformPoint(positions[indices[index + 2]], placement),
      ]);
  }
  return triangles;
}

export async function loadModelBounds(file, placement) {
  const { json, binary } = glbChunks(await readFile(file));
  const points = [];
  for (const mesh of json.meshes || [])
    for (const primitive of mesh.primitives || []) {
      const positions = accessorValues(json, binary, primitive.attributes.POSITION);
      points.push(...positions.map((position) => transformPoint(position, placement)));
    }
  return {
    min: [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis]))),
  };
}

function wallHitsAt(triangles, door, y, z, planeTolerance = 0.9) {
  const direction = [Math.sign(door.position[0]) || 1, 0, 0];
  const origin = [0, y, z];
  return triangles
    .map((triangle) => rayTriangle(origin, direction, triangle))
    .filter((distance) => distance !== null)
    .map((distance) => origin[0] + direction[0] * distance)
    .filter((x) => Math.abs(x - door.position[0]) <= planeTolerance)
    .sort((a, b) => Math.abs(a - door.position[0]) - Math.abs(b - door.position[0]));
}

function contiguousClearRange(values, clear, centre) {
  const centreIndex = values.reduce(
    (best, value, index) =>
      Math.abs(value - centre) < Math.abs(values[best] - centre) ? index : best,
    0,
  );
  if (!clear[centreIndex]) return null;
  let start = centreIndex;
  let end = centreIndex;
  while (start > 0 && clear[start - 1]) start -= 1;
  while (end < clear.length - 1 && clear[end + 1]) end += 1;
  return [values[start], values[end]];
}

export function measureCandidate(door, house) {
  const sampleStep = 0.01;
  const playerDiameter = 1.1;
  const width = (door.width || 1.1179) * (door.scale || 1);
  const height = (door.height || 2.0919) * (door.scale || 1);
  const zValues = Array.from(
    { length: 281 },
    (_, index) => door.position[2] - 1.4 + index * sampleStep,
  );
  const zClear = zValues.map(
    (z) => wallHitsAt(house.triangles, door, door.position[1] + height * 0.48, z).length === 0,
  );
  const widthRange = contiguousClearRange(zValues, zClear, door.position[2]);
  const yValues = Array.from(
    { length: 341 },
    (_, index) => door.position[1] + 0.01 + index * sampleStep,
  );
  const yClear = yValues.map(
    (y) => wallHitsAt(house.triangles, door, y, door.position[2]).length === 0,
  );
  const heightRange = contiguousClearRange(yValues, yClear, door.position[1] + 0.1);
  const centreClear = wallHitsAt(
    house.triangles,
    door,
    door.position[1] + height * 0.48,
    door.position[2],
  ).length === 0;
  const sideHits = [-1, 1].map(
    (side) =>
      wallHitsAt(
        house.triangles,
        door,
        door.position[1] + height * 0.48,
        door.position[2] + side * (width / 2 + 0.16),
      )[0] ?? null,
  );
  const headerHits = Array.from({ length: 31 }, (_, index) =>
    wallHitsAt(
      house.triangles,
      door,
      door.position[1] + height + 0.12 + index * sampleStep,
      door.position[2],
    ),
  ).flat();
  const nearbyWallVertices = house.triangles
    .flat()
    .filter(
      ([x, y, z]) =>
        Math.abs(x - door.position[0]) <= 1.1 &&
        y >= door.position[1] &&
        y <= door.position[1] + height + 0.4 &&
        Math.abs(z - door.position[2]) <= width / 2 + 0.3,
    );
  const xValues = nearbyWallVertices.map(([x]) => x);
  const facadeDepth = xValues.length
    ? Math.max(...xValues) - Math.min(...xValues)
    : 0;
  const measuredWidth = widthRange ? widthRange[1] - widthRange[0] : 0;
  const measuredHeight = heightRange ? heightRange[1] - heightRange[0] : 0;
  const planeOffsets = sideHits
    .filter((value) => value !== null)
    .map((value) => Math.abs(value - door.position[0]));
  const planeOffset = planeOffsets.length ? Math.max(...planeOffsets) : Infinity;
  const yaw = ((door.yaw || 0) * Math.PI) / 180;
  const depth = (door.depth || 0.2093) * (door.scale || 1);
  const doorHalfX =
    (Math.abs(Math.cos(yaw)) * width + Math.abs(Math.sin(yaw)) * depth) / 2;
  const side = Math.sign(door.position[0]) || 1;
  const roadmostBound = side > 0 ? house.bounds?.min[0] : house.bounds?.max[0];
  const doorRoadFace = door.position[0] - side * doorHalfX;
  const approachVisualClearance =
    roadmostBound === undefined
      ? -1
      : side > 0
        ? roadmostBound - doorRoadFace
        : doorRoadFace - roadmostBound;
  const passed =
    centreClear &&
    sideHits.every((value) => value !== null) &&
    headerHits.length > 0 &&
    measuredWidth >= width * 0.9 &&
    measuredWidth <= width * 1.55 &&
    measuredHeight >= height * 0.9 &&
    measuredWidth >= playerDiameter + 0.04 &&
    planeOffset <= 0.45 &&
    facadeDepth >= 0.08 &&
    approachVisualClearance >= 0;
  return {
    house: house.key,
    placement: house.placement,
    centreClear,
    measuredOpeningWidth: Number(measuredWidth.toFixed(2)),
    measuredOpeningHeight: Number(measuredHeight.toFixed(2)),
    samplingUncertainty: Number((sampleStep * 2).toFixed(2)),
    playerDiameter,
    sweptLateralClearance: Number(
      Math.max(0, (measuredWidth - playerDiameter) / 2).toFixed(3),
    ),
    roadmostBound: Number((roadmostBound ?? -1).toFixed(3)),
    closedDoorApproachVisualClearance: Number(
      approachVisualClearance.toFixed(3),
    ),
    facadeDepth: Number(facadeDepth.toFixed(2)),
    planeOffset: Number((Number.isFinite(planeOffset) ? planeOffset : -1).toFixed(2)),
    sideWallHits: sideHits.filter((value) => value !== null).length,
    headerHit: headerHits.length > 0,
    passed,
  };
}

export async function inspectImportedDoorOpenings({ root = new URL("../", import.meta.url) } = {}) {
  const publicRoot = new URL("./public/playcanvas/chapter-1/", root);
  const layout = JSON.parse(await readFile(new URL("world-layout.json", publicRoot), "utf8"));
  const houses = [];
  for (const [key, filename] of Object.entries(HOUSE_FILES)) {
    for (const placement of layout.placements[key] || []) {
      const file = new URL(`assets/models/env-revamp/${filename}`, publicRoot);
      houses.push({
        key,
        placement,
        triangles: await loadWallTriangles(file, placement),
        bounds: await loadModelBounds(file, placement),
      });
    }
  }
  const pairs = [];
  for (const door of layout.doors.filter(({ entity }) => entity === "Door_4_Flat")) {
    const candidates = houses
      .filter(
        ({ placement }) =>
          Math.sign(placement[0]) === Math.sign(door.position[0]) &&
          Math.abs(placement[2] - door.position[2]) <= 8.5,
      )
      .map((house) => measureCandidate(door, house))
      .sort(
        (a, b) =>
          Number(b.passed) - Number(a.passed) ||
          Math.abs(a.placement[2] - door.position[2]) -
            Math.abs(b.placement[2] - door.position[2]),
      );
    pairs.push({ id: door.id, ...(candidates[0] || { passed: false }) });
  }
  return {
    generatedFrom: "committed GLB wall triangles and world placements",
    importedDoors: pairs.length,
    passed: pairs.length === 8 && pairs.every((pair) => pair.passed),
    pairs,
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1])
  console.log(JSON.stringify(await inspectImportedDoorOpenings(), null, 2));
