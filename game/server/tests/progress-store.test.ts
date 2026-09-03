import assert from "node:assert/strict";
import test from "node:test";
import { BoundedProgressStore } from "../src/progress-store.ts";

test("progress cache is capacity bounded and expires stale identities", () => {
  let now = 1_000;
  const store = new BoundedProgressStore<number>(3, 100, () => now);
  store.set("a", 1); store.set("b", 2); store.set("c", 3);
  assert.equal(store.get("a"), 1);
  store.set("d", 4);
  assert.equal(store.has("b"), false, "least-recently-used identity was not evicted");
  assert.equal(store.size, 3);
  now += 101;
  assert.equal(store.size, 0, "expired identities remained resident");
});
