import assert from "node:assert/strict";
import test from "node:test";
import {
  ConnectionLimiter,
  MessageRateLimiter,
  OutboundBackpressure,
} from "../src/network-guard.ts";

test("connection leases enforce both global and peer limits and release once", () => {
  const limiter = new ConnectionLimiter(3, 2);
  const first = limiter.acquire("127.0.0.1");
  const second = limiter.acquire("127.0.0.1");
  assert.ok(first);
  assert.ok(second);
  assert.equal(limiter.acquire("127.0.0.1"), null);

  const third = limiter.acquire("10.0.0.2");
  assert.ok(third);
  assert.equal(limiter.acquire("10.0.0.3"), null);

  first.release();
  first.release();
  assert.ok(limiter.acquire("10.0.0.3"));
});

test("message limiter allows a short burst, refills, and rejects sustained excess", () => {
  let now = 0;
  const limiter = new MessageRateLimiter(2, 3, () => now);
  assert.equal(limiter.allow(), true);
  assert.equal(limiter.allow(), true);
  assert.equal(limiter.allow(), true);
  assert.equal(limiter.allow(), false);
  now = 500;
  assert.equal(limiter.allow(), true);
  assert.equal(limiter.allow(), false);
});

test("outbound backpressure skips a slow peer, recovers, and eventually closes", () => {
  const guard = new OutboundBackpressure(100, 3);
  assert.equal(guard.check(101), "skip");
  assert.equal(guard.check(0), "send");
  assert.equal(guard.check(101), "skip");
  assert.equal(guard.check(101), "skip");
  assert.equal(guard.check(101), "close");
});
