import assert from "node:assert/strict";
import test from "node:test";
import { floorHeightAt, moveWithCollision } from "../src/chapter-1/collision.ts";
import layout from "../../client-scripts/world-layout.json" with { type: "json" };

// Walk the full route, including the approaches around the well, closed rescue
// door and gate posts. These are the detours used by the browser QA traversal.
const route = layout.routeWaypoints.flatMap((point, index) => {
  const detours: Record<number, Array<{ x: number; z: number }>> = {
    2: [{ x: 0, z: 11.5 }, { x: 22, z: 11.5 }],
    4: [{ x: 22, z: -3.2 }, { x: 4, z: -3.2 }],
    6: [{ x: -12.5, z: -15 }, { x: -20, z: -15 }],
    8: [{ x: -20, z: -30.5 }, { x: 12, z: -30.5 }],
  };
  return [...(detours[index] ?? []), point];
});

for (const speed of [3.2, 6.5]) {
  for (const reverse of [false, true]) {
    test(`the full route is walkable ${reverse ? "backward" : "forward"} at ${speed} m/s`, () => {
      const points = reverse ? [...route].reverse() : route;
      let position = { ...points[0], y: floorHeightAt(points[0])! };
      for (const target of points.slice(1)) {
        const initialDistance = Math.hypot(target.x - position.x, target.z - position.z);
        const frameLimit = Math.ceil(initialDistance / speed * 30) + 90;
        for (let frame = 0; frame < frameLimit; frame += 1) {
          const dx = target.x - position.x;
          const dz = target.z - position.z;
          const distance = Math.hypot(dx, dz);
          if (distance < 0.15) break;
          const step = Math.min(speed / 30, distance);
          const moved = moveWithCollision(position, {
            x: dx / distance * step,
            z: dz / distance * step,
          });
          position = { ...moved, y: moved.y! };
          assert.equal(position.y, floorHeightAt(position), "movement left the authored floor");
        }
        assert.ok(
          Math.hypot(target.x - position.x, target.z - position.z) < 0.15,
          `blocked approaching (${target.x}, ${target.z}) from ${JSON.stringify(position)}`,
        );
      }
    });
  }
}
