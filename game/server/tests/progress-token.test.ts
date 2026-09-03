import assert from "node:assert/strict";
import test from "node:test";
import { signProgress, validatePayload, verifyProgress, type ProgressPayload } from "../src/progress-token.ts";

const secret = "a-test-secret-long-enough-for-hmac";
const playerId = "12345678-1234-4234-9234-123456789abc";

function payload(overrides: Partial<ProgressPayload> = {}): ProgressPayload {
  return { v: 1, playerId, furthestCompletedPhase: "courtyard", nextPhase: "market", chapterComplete: false, issuedAt: 1788330600000, ...overrides };
}

test("round-trips a valid signed progress token", () => {
  const token = signProgress(payload(), secret);
  const result = verifyProgress(token, playerId, secret);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.payload.nextPhase, "market");
});

test("rejects mutation, truncation, wrong players, and malformed tokens without throwing", () => {
  const token = signProgress(payload(), secret);
  const [body, signature] = token.split(".");
  const cases = [null, "", body, `${body}.${signature}extra`, `${body}.${signature}.extra`, token.slice(0, -4), signProgress(payload(), secret)];
  for (const candidate of cases.slice(0, -1)) assert.equal(verifyProgress(candidate, playerId, secret).ok, false);
  assert.equal(verifyProgress(token, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", secret).ok, false);
});

test("enforces the phase graph and complete tuple", () => {
  assert.equal(validatePayload(payload()), true);
  assert.equal(validatePayload(payload({ furthestCompletedPhase: "courtyard", nextPhase: "doorway" })), false);
  assert.equal(validatePayload(payload({ furthestCompletedPhase: "doorway", nextPhase: "complete", chapterComplete: true })), false);
  assert.equal(validatePayload(payload({ furthestCompletedPhase: "ending", nextPhase: "complete", chapterComplete: true })), true);
});
