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
  swingDirection?: number;
};
export type DoorProgress = Readonly<Record<string, number>>;
export type DoorPose = { x: number; y: number; z: number; yaw: number };

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

function doorDimensions(door: DoorSpec) {
  const asset =
    worldLayout.doorAssets[door.entity as keyof typeof worldLayout.doorAssets];
  return {
    width: (door.width ?? asset?.width ?? 0) * door.scale,
    depth: (door.depth ?? asset?.depth ?? 0) * door.scale,
  };
}

export function doorPoseAtProgress(
  door: DoorSpec,
  progress: number,
): DoorPose {
  const { width } = doorDimensions(door);
  const closedYaw = door.yaw || 0;
  const clamped = Math.max(0, Math.min(1, Number(progress) || 0));
  const openYaw = closedYaw + clamped * 92 * (door.swingDirection || 1);
  const closedRadians = (closedYaw * Math.PI) / 180;
  const openRadians = (openYaw * Math.PI) / 180;
  const halfWidth = width / 2;
  const [x, y, z] = door.position;
  const hingeX = x - Math.cos(closedRadians) * halfWidth;
  const hingeZ = z + Math.sin(closedRadians) * halfWidth;
  return {
    x: hingeX + Math.cos(openRadians) * halfWidth,
    y,
    z: hingeZ - Math.sin(openRadians) * halfWidth,
    yaw: openYaw,
  };
}

function circleIntersectsDoor(
  point: Point,
  radius: number,
  door: DoorSpec,
  progress: number,
): boolean {
  const pose = doorPoseAtProgress(door, progress);
  const { width, depth } = doorDimensions(door);
  const yaw = (pose.yaw * Math.PI) / 180;
  const dx = point.x - pose.x;
  const dz = point.z - pose.z;
  const localX = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const localZ = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  const nearestX = Math.max(-width / 2, Math.min(localX, width / 2));
  const nearestZ = Math.max(-depth / 2, Math.min(localZ, depth / 2));
  return (
    (localX - nearestX) ** 2 + (localZ - nearestZ) ** 2 < radius * radius
  );
}

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

export function doorColliderAtProgress(
  door: DoorSpec,
  progress: number,
): Box {
  const pose = doorPoseAtProgress(door, progress);
  const { width, depth } = doorDimensions(door);
  const yaw = (pose.yaw * Math.PI) / 180;
  const halfX =
    (Math.abs(Math.cos(yaw)) * width + Math.abs(Math.sin(yaw)) * depth) / 2;
  const halfZ =
    (Math.abs(Math.sin(yaw)) * width + Math.abs(Math.cos(yaw)) * depth) / 2;
  const closedCollider = doorColliderFromTransform(door);
  return {
    id: door.id,
    minX: pose.x - halfX,
    maxX: pose.x + halfX,
    minZ: pose.z - halfZ,
    maxZ: pose.z + halfZ,
    y: closedCollider.y,
  };
}

export const DOOR_COLLIDERS: Box[] = DOORS.map(doorColliderFromTransform);
const DOOR_IDS = new Set(DOORS.map(({ id }) => id));
const DOOR_COLLIDER_BY_ID = new Map(
  DOOR_COLLIDERS.map((box) => [box.id, box] as const),
);
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
  doorProgress?: DoorProgress,
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
  const staticCollision = COLLIDERS.some((box) => {
    if (
      doorProgress &&
      DOOR_IDS.has(box.id) &&
      Object.hasOwn(doorProgress, box.id)
    )
      return false;
    if (openDoorIds.has(box.id)) return false;
    if (pointFloor === null || Math.abs(pointFloor - box.y) > 0.75)
      return false;
    const x = Math.max(box.minX, Math.min(point.x, box.maxX));
    const z = Math.max(box.minZ, Math.min(point.z, box.maxZ));
    const dx = point.x - x;
    const dz = point.z - z;
    return dx * dx + dz * dz < radius * radius;
  });
  if (staticCollision) return true;
  if (!doorProgress) return false;
  return DOORS.some((door) => {
    if (!Object.hasOwn(doorProgress, door.id)) return false;
    const box = DOOR_COLLIDER_BY_ID.get(door.id);
    if (
      !box ||
      pointFloor === null ||
      Math.abs(pointFloor - box.y) > 0.75
    )
      return false;
    return circleIntersectsDoor(point, radius, door, doorProgress[door.id]);
  });
}

export function moveWithCollision(
  start: Point,
  delta: Point,
  radius = 0.55,
  openDoorIds: ReadonlySet<string> = NO_OPEN_DOORS,
  doorProgress?: DoorProgress,
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
      !collides(candidateX, radius, openDoorIds, doorProgress)
    ) {
      result.x = candidateX.x;
      result.y = floorX;
    }
    const candidateZ = { x: result.x, z: result.z + stepZ };
    const floorZ = floorHeightAt(candidateZ);
    if (
      floorZ !== null &&
      Math.abs(floorZ - (floorHeightAt(result) ?? result.y ?? 0)) <= 1.05 &&
      !collides(candidateZ, radius, openDoorIds, doorProgress)
    ) {
      result.z = candidateZ.z;
      result.y = floorZ;
    }
  }
  return { ...result, y: floorHeightAt(result) ?? start.y ?? 0 };
}

const SEGMENT_EPSILON = 1e-9;

function segmentBoxInterval(
  a: Point,
  b: Point,
  box: Box,
): [number, number] | null {
  let enter = 0;
  let exit = 1;
  for (const [start, delta, minimum, maximum] of [
    [a.x, b.x - a.x, box.minX, box.maxX],
    [a.z, b.z - a.z, box.minZ, box.maxZ],
  ] as const) {
    if (Math.abs(delta) <= SEGMENT_EPSILON) {
      if (start < minimum || start > maximum) return null;
      continue;
    }
    const first = (minimum - start) / delta;
    const second = (maximum - start) / delta;
    enter = Math.max(enter, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (enter > exit) return null;
  }

  const stationary =
    Math.abs(b.x - a.x) <= SEGMENT_EPSILON &&
    Math.abs(b.z - a.z) <= SEGMENT_EPSILON;
  if (
    !stationary &&
    (exit <= SEGMENT_EPSILON || enter >= 1 - SEGMENT_EPSILON)
  )
    return null;
  return [
    stationary ? SEGMENT_EPSILON : Math.max(SEGMENT_EPSILON, enter),
    stationary ? 1 - SEGMENT_EPSILON : Math.min(1 - SEGMENT_EPSILON, exit),
  ];
}

function segmentMeetsColliderElevation(
  a: Point,
  b: Point,
  box: Box,
  [enter, exit]: [number, number],
): boolean {
  const startY = a.y ?? floorHeightAt(a);
  const endY = b.y ?? floorHeightAt(b);
  if (startY !== null && endY !== null) {
    const enterY = startY + (endY - startY) * enter;
    const exitY = startY + (endY - startY) * exit;
    return (
      Math.max(enterY, exitY) >= box.y - 0.75 &&
      Math.min(enterY, exitY) <= box.y + 0.75
    );
  }

  const midpoint = (enter + exit) / 2;
  const floor = floorHeightAt({
    x: a.x + (b.x - a.x) * midpoint,
    z: a.z + (b.z - a.z) * midpoint,
  });
  return floor !== null && Math.abs(floor - box.y) <= 0.75;
}

function segmentDoorInterval(
  a: Point,
  b: Point,
  door: DoorSpec,
  progress: number,
): [number, number] | null {
  const pose = doorPoseAtProgress(door, progress);
  const { width, depth } = doorDimensions(door);
  const yaw = (pose.yaw * Math.PI) / 180;
  const toLocal = (point: Point): Point => {
    const dx = point.x - pose.x;
    const dz = point.z - pose.z;
    return {
      x: dx * Math.cos(yaw) - dz * Math.sin(yaw),
      y: point.y,
      z: dx * Math.sin(yaw) + dz * Math.cos(yaw),
    };
  };
  return segmentBoxInterval(toLocal(a), toLocal(b), {
    id: door.id,
    minX: -width / 2,
    maxX: width / 2,
    minZ: -depth / 2,
    maxZ: depth / 2,
    y: 0,
  });
}

export function segmentBlocked(
  a: Point,
  b: Point,
  openDoorIds: ReadonlySet<string> = NO_OPEN_DOORS,
  doorProgress?: DoorProgress,
): boolean {
  const staticBlock = COLLIDERS.some((box) => {
    if (
      doorProgress &&
      DOOR_IDS.has(box.id) &&
      Object.hasOwn(doorProgress, box.id)
    )
      return false;
    if (openDoorIds.has(box.id)) return false;
    const interval = segmentBoxInterval(a, b, box);
    return (
      interval !== null && segmentMeetsColliderElevation(a, b, box, interval)
    );
  });
  if (staticBlock) return true;
  if (!doorProgress) return false;
  return DOORS.some((door) => {
    if (!Object.hasOwn(doorProgress, door.id)) return false;
    const box = DOOR_COLLIDER_BY_ID.get(door.id);
    const interval = segmentDoorInterval(a, b, door, doorProgress[door.id]);
    return (
      box !== undefined &&
      interval !== null &&
      segmentMeetsColliderElevation(a, b, box, interval)
    );
  });
}
