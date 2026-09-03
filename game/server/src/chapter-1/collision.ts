import worldLayout from "../../../client-scripts/world-layout.json" with { type: "json" };

export type Point = { x: number; z: number; y?: number };
export type Box = {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
};
export type FloorRegion = Box & { y: number };
export type DoorSpec = {
  id: string;
  label: string;
  entity: string;
  position: [number, number, number];
  yaw: number;
  scale: number;
  width?: number;
  depth?: number;
  floorY?: number;
  openFromPhase?: string;
  swingSeconds?: number;
};

const finiteBox = (box: Omit<Box, "y">) =>
  [box.minX, box.maxX, box.minZ, box.maxZ].every(Number.isFinite) &&
  box.minX < box.maxX &&
  box.minZ < box.maxZ;
const NO_OPEN_DOORS: ReadonlySet<string> = new Set();

export const WORLD_BOUNDS = Object.freeze({ ...worldLayout.worldBounds });
export const FLOOR_REGIONS: FloorRegion[] = worldLayout.floorRegions.map(
  ({ id, minX, maxX, minZ, maxZ, y }) => ({ id, minX, maxX, minZ, maxZ, y }),
);

const floorForBounds = (
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
) =>
  FLOOR_REGIONS.find(
    (floor) =>
      (minX + maxX) / 2 >= floor.minX &&
      (minX + maxX) / 2 <= floor.maxX &&
      (minZ + maxZ) / 2 >= floor.minZ &&
      (minZ + maxZ) / 2 <= floor.maxZ,
  )?.y ?? 0;

export const DOORS: DoorSpec[] = (worldLayout.doors as DoorSpec[]) ?? [];

export function doorColliderFromTransform(door: DoorSpec): Box {
  const asset =
    worldLayout.doorAssets[door.entity as keyof typeof worldLayout.doorAssets];
  const width = (door.width ?? asset?.width ?? 0) * door.scale;
  const depth = (door.depth ?? asset?.depth ?? 0) * door.scale;
  const yaw = (door.yaw * Math.PI) / 180;
  const halfX =
    (Math.abs(Math.cos(yaw)) * width + Math.abs(Math.sin(yaw)) * depth) / 2;
  const halfZ =
    (Math.abs(Math.sin(yaw)) * width + Math.abs(Math.cos(yaw)) * depth) / 2;
  const [x, , z] = door.position;
  return {
    id: door.id,
    minX: x - halfX,
    maxX: x + halfX,
    minZ: z - halfZ,
    maxZ: z + halfZ,
    y:
      door.floorY ?? floorForBounds(x - halfX, x + halfX, z - halfZ, z + halfZ),
  };
}

export const DOOR_COLLIDERS: Box[] = DOORS.map(doorColliderFromTransform);
export const COLLIDERS: Box[] = [
  ...worldLayout.colliders.map(({ id, minX, maxX, minZ, maxZ }) => ({
    id,
    minX,
    maxX,
    minZ,
    maxZ,
    y: floorForBounds(minX, maxX, minZ, maxZ),
  })),
  ...DOOR_COLLIDERS,
];

if (
  !finiteBox({ id: "world", ...WORLD_BOUNDS }) ||
  new Set(COLLIDERS.map(({ id }) => id)).size !== COLLIDERS.length ||
  COLLIDERS.some((box) => !finiteBox(box) || !Number.isFinite(box.y)) ||
  FLOOR_REGIONS.some(
    (region) => !finiteBox(region) || !Number.isFinite(region.y),
  )
) {
  throw new Error("Invalid shared Chapter 1 world layout");
}

export function floorHeightAt(point: Point): number | null {
  const region = FLOOR_REGIONS.find(
    (floor) =>
      point.x >= floor.minX &&
      point.x <= floor.maxX &&
      point.z >= floor.minZ &&
      point.z <= floor.maxZ,
  );
  return region?.y ?? null;
}

function circleHasFloor(point: Point, radius: number): boolean {
  const samples = [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
    [radius * 0.7, radius * 0.7],
    [-radius * 0.7, radius * 0.7],
    [radius * 0.7, -radius * 0.7],
    [-radius * 0.7, -radius * 0.7],
  ];
  return samples.every(
    ([dx, dz]) => floorHeightAt({ x: point.x + dx, z: point.z + dz }) !== null,
  );
}

export function collides(
  point: Point,
  radius = 0.55,
  openDoorIds: ReadonlySet<string> = NO_OPEN_DOORS,
): boolean {
  if (
    point.x - radius < WORLD_BOUNDS.minX ||
    point.x + radius > WORLD_BOUNDS.maxX ||
    point.z - radius < WORLD_BOUNDS.minZ ||
    point.z + radius > WORLD_BOUNDS.maxZ
  )
    return true;
  if (!circleHasFloor(point, radius)) return true;
  const pointFloor = point.y ?? floorHeightAt(point);
  return COLLIDERS.some((box) => {
    if (openDoorIds.has(box.id)) return false;
    if (pointFloor === null || Math.abs(pointFloor - box.y) > 0.75)
      return false;
    const x = Math.max(box.minX, Math.min(point.x, box.maxX));
    const z = Math.max(box.minZ, Math.min(point.z, box.maxZ));
    const dx = point.x - x;
    const dz = point.z - z;
    return dx * dx + dz * dz < radius * radius;
  });
}

export function moveWithCollision(
  start: Point,
  delta: Point,
  radius = 0.55,
  openDoorIds: ReadonlySet<string> = NO_OPEN_DOORS,
): Point {
  const distance = Math.hypot(delta.x, delta.z);
  const steps = Math.max(1, Math.ceil(distance / Math.max(0.1, radius * 0.45)));
  const stepX = delta.x / steps;
  const stepZ = delta.z / steps;
  const result = { ...start };
  for (let index = 0; index < steps; index += 1) {
    const currentFloor = floorHeightAt(result) ?? result.y ?? 0;
    const candidateX = { x: result.x + stepX, z: result.z };
    const floorX = floorHeightAt(candidateX);
    if (
      floorX !== null &&
      Math.abs(floorX - currentFloor) <= 1.05 &&
      !collides(candidateX, radius, openDoorIds)
    ) {
      result.x = candidateX.x;
      result.y = floorX;
    }
    const candidateZ = { x: result.x, z: result.z + stepZ };
    const floorZ = floorHeightAt(candidateZ);
    if (
      floorZ !== null &&
      Math.abs(floorZ - (floorHeightAt(result) ?? result.y ?? 0)) <= 1.05 &&
      !collides(candidateZ, radius, openDoorIds)
    ) {
      result.z = candidateZ.z;
      result.y = floorZ;
    }
  }
  return { ...result, y: floorHeightAt(result) ?? start.y ?? 0 };
}

export function segmentBlocked(
  a: Point,
  b: Point,
  openDoorIds: ReadonlySet<string> = NO_OPEN_DOORS,
): boolean {
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(2, Math.ceil(distance / 0.25));
  const startY = a.y ?? floorHeightAt(a);
  const endY = b.y ?? floorHeightAt(b);
  for (let index = 1; index < steps; index += 1) {
    const t = index / steps;
    const point = {
      x: a.x + (b.x - a.x) * t,
      y:
        startY === null || endY === null
          ? floorHeightAt({
              x: a.x + (b.x - a.x) * t,
              z: a.z + (b.z - a.z) * t,
            })
          : startY + (endY - startY) * t,
      z: a.z + (b.z - a.z) * t,
    };
    if (
      COLLIDERS.some(
        (box) =>
          !openDoorIds.has(box.id) &&
          point.y !== null &&
          Math.abs(point.y - box.y) <= 0.75 &&
          point.x >= box.minX &&
          point.x <= box.maxX &&
          point.z >= box.minZ &&
          point.z <= box.maxZ,
      )
    )
      return true;
  }
  return false;
}
