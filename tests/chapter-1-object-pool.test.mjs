import assert from "node:assert/strict";
import test from "node:test";

import { createObjectPool } from "../../game/client-scripts/runtime/object-pool.js";

test("visual object pools pre-create once and reuse released instances", () => {
  let created = 0;
  const activations = [];
  const deactivations = [];
  const pool = createObjectPool({
    create: () => ({ id: ++created }),
    activate: (item, value) => activations.push([item.id, value]),
    deactivate: (item) => deactivations.push(item.id),
  });

  pool.warm(3);
  assert.equal(created, 3);
  assert.deepEqual(pool.stats(), { available: 3, active: 0, created: 3 });

  const first = pool.acquire("first-use");
  const second = pool.acquire("second-use");
  assert.equal(created, 3);
  assert.deepEqual(activations, [
    [first.id, "first-use"],
    [second.id, "second-use"],
  ]);

  assert.equal(pool.release(first), true);
  assert.equal(pool.release(first), false);
  const reused = pool.acquire("reused");
  assert.equal(reused, first);
  assert.equal(created, 3);
  assert.deepEqual(deactivations, [1, 2, 3, first.id]);
});
