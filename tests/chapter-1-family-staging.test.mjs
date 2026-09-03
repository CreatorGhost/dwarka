import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { familyMemberTransforms } from "../../game/client-scripts/scene/build.js";

const layoutUrl = new URL("../../game/client-scripts/world-layout.json", import.meta.url);

test("market family staging separates both silhouettes without moving the rescue anchor", async () => {
  const layout = JSON.parse(await readFile(layoutUrl, "utf8"));
  const anchor = { x: -20, y: 6, z: -32 };
  const transforms = familyMemberTransforms("market", anchor, layout.familyStaging);

  assert.equal(transforms.length, 2);
  const [first, second] = transforms;
  const screenPlaneSeparation = Math.abs(
    first.position[0] - second.position[0],
  );
  assert.ok(
    screenPlaneSeparation >= 1.2,
    `approach-view separation ${screenPlaneSeparation}m is below 1.2m`,
  );
  assert.equal(first.position[2], anchor.z);
  assert.equal(second.position[2], anchor.z);
  const separation = Math.hypot(
    first.position[0] - second.position[0],
    first.position[2] - second.position[2],
  );
  assert.ok(separation >= 1.2, `family separation ${separation}m is below 1.2m`);
  assert.deepEqual(
    [
      (first.position[0] + second.position[0]) / 2,
      (first.position[1] + second.position[1]) / 2,
      (first.position[2] + second.position[2]) / 2,
    ],
    [anchor.x, anchor.y, anchor.z],
  );

  const light = layout.familyStaging.market.light;
  const lightDistance = Math.hypot(light.position[0] - anchor.x, light.position[2] - anchor.z);
  assert.ok(lightDistance <= 2);
  assert.ok(light.intensity >= 0.5);
  assert.ok(light.range >= 5);
});
