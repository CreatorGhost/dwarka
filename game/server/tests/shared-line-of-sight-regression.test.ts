import assert from "node:assert/strict";
import test from "node:test";

import {
  DOORS,
  DOOR_COLLIDERS,
  segmentBlocked,
  type Box,
  type DoorSpec,
  type Point,
} from "../src/chapter-1/collision.ts";

const dynamicDoors = DOORS.filter(({ openFromPhase }) => openFromPhase);

function doorBox(door: DoorSpec): Box {
  const box = DOOR_COLLIDERS.find(({ id }) => id === door.id);
  assert.ok(box, `${door.id} must have a collider`);
  return box;
}

function perpendicularCrossing(box: Box, margin: number): [Point, Point] {
  const centreX = (box.minX + box.maxX) / 2;
  const centreZ = (box.minZ + box.maxZ) / 2;
  const thinX = box.maxX - box.minX < box.maxZ - box.minZ;
  return thinX
    ? [
        { x: box.minX - margin, y: box.y, z: centreZ },
        { x: box.maxX + margin, y: box.y, z: centreZ },
      ]
    : [
        { x: centreX, y: box.y, z: box.minZ - margin },
        { x: centreX, y: box.y, z: box.maxZ + margin },
      ];
}

for (const door of dynamicDoors) {
  test(`${door.id} blocks continuous crossings at varied distances in both directions`, () => {
    const box = doorBox(door);
    const open = new Set([door.id]);
    for (const margin of [0.3, 0.8, 1, 2, 4]) {
      const [start, end] = perpendicularCrossing(box, margin);
      assert.equal(segmentBlocked(start, end), true, `closed at ${margin}m`);
      assert.equal(
        segmentBlocked(end, start),
        true,
        `closed reversed at ${margin}m`,
      );
      assert.equal(
        segmentBlocked(start, end, open),
        false,
        `open at ${margin}m`,
      );
      assert.equal(
        segmentBlocked(end, start, open),
        false,
        `open reversed at ${margin}m`,
      );
    }
  });

  test(`${door.id} preserves grazing, parallel, zero-length, endpoint, and elevation semantics`, () => {
    const box = doorBox(door);
    const open = new Set([door.id]);
    const thinX = box.maxX - box.minX < box.maxZ - box.minZ;
    const grazing: [Point, Point] = thinX
      ? [
          { x: box.minX, y: box.y, z: box.minZ - 0.2 },
          { x: box.minX, y: box.y, z: box.maxZ + 0.2 },
        ]
      : [
          { x: box.minX - 0.2, y: box.y, z: box.minZ },
          { x: box.maxX + 0.2, y: box.y, z: box.minZ },
        ];
    const parallelOutside: [Point, Point] = thinX
      ? [
          { x: box.minX - 0.05, y: box.y, z: box.minZ + 0.1 },
          { x: box.minX - 0.05, y: box.y, z: box.maxZ - 0.1 },
        ]
      : [
          { x: box.minX + 0.1, y: box.y, z: box.minZ - 0.05 },
          { x: box.maxX - 0.1, y: box.y, z: box.minZ - 0.05 },
        ];
    const centre = {
      x: (box.minX + box.maxX) / 2,
      y: box.y,
      z: (box.minZ + box.maxZ) / 2,
    };
    const [start, end] = perpendicularCrossing(box, 0.8);
    const startAtBoundary = thinX
      ? { ...start, x: box.minX }
      : { ...start, z: box.minZ };
    const endAtBoundary = thinX
      ? { ...end, x: box.maxX }
      : { ...end, z: box.maxZ };

    assert.equal(segmentBlocked(...grazing), true);
    assert.equal(segmentBlocked(...grazing, open), false);
    assert.equal(segmentBlocked(...parallelOutside), false);
    assert.equal(segmentBlocked(centre, centre), true);
    assert.equal(segmentBlocked(centre, centre, open), false);
    assert.equal(segmentBlocked(start, startAtBoundary), false);
    assert.equal(segmentBlocked(endAtBoundary, end), false);

    assert.equal(
      segmentBlocked(
        { ...start, y: box.y + 0.75 },
        { ...end, y: box.y + 0.75 },
      ),
      true,
      "the existing 0.75m inclusive elevation limit still blocks",
    );
    assert.equal(
      segmentBlocked(
        { ...start, y: box.y + 0.751 },
        { ...end, y: box.y + 0.751 },
      ),
      false,
      "a segment above the existing elevation limit stays clear",
    );
  });

  test(`${door.id} blocks asymmetric vertical crossings in both directions`, () => {
    const box = doorBox(door);
    const open = new Set([door.id]);
    const centre = {
      x: (box.minX + box.maxX) / 2,
      z: (box.minZ + box.maxZ) / 2,
    };
    const verticalCrossings: Array<[Point, Point]> = [
      [
        { ...centre, y: box.y + 3 },
        { ...centre, y: box.y + 0.5 },
      ],
      [
        { ...centre, y: box.y - 0.5 },
        { ...centre, y: box.y - 3 },
      ],
    ];

    for (const [start, end] of verticalCrossings) {
      assert.equal(segmentBlocked(start, end), true, "closed descending");
      assert.equal(segmentBlocked(end, start), true, "closed reversed");
      assert.equal(segmentBlocked(start, end, open), false, "open descending");
      assert.equal(segmentBlocked(end, start, open), false, "open reversed");
    }

    assert.equal(
      segmentBlocked(
        { ...centre, y: box.y + 3 },
        { ...centre, y: box.y + 1 },
      ),
      false,
      "a vertical segment above the collider stays clear",
    );
    assert.equal(
      segmentBlocked(
        { ...centre, y: box.y - 1 },
        { ...centre, y: box.y - 3 },
      ),
      false,
      "a vertical segment below the collider stays clear",
    );
  });
}
