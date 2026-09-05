import assert from "node:assert/strict";
import test from "node:test";
import { keepArrivalCandidateLegacyPlacement } from "./build.js";
import worldLayout from "../world-layout.json" with { type: "json" };

test("the visible stair retaining wall survives arrival-candidate culling", () => {
  const revamp = worldLayout.environmentRevamp;
  for (const x of [3, 5, 7, 9])
    assert.equal(
      keepArrivalCandidateLegacyPlacement(
        "Wall_Plaster_Straight",
        [x, 0, -18.02, 0, 1],
        revamp,
      ),
      true,
      `stair boundary module at x=${x} was culled`,
    );
  assert.equal(
    keepArrivalCandidateLegacyPlacement(
      "Wall_Plaster_Straight",
      [1, 0, -7, 90, 1],
      revamp,
    ),
    false,
    "unrelated legacy wall should remain culled",
  );
});
