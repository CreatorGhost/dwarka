import { createHmac, timingSafeEqual } from "node:crypto";
import { isPhase, nextPhase, PHASE_RANK, type PhaseId } from "./chapter-1/phases.ts";

export type ProgressPayload = {
  v: 1;
  playerId: string;
  furthestCompletedPhase: PhaseId;
  nextPhase: PhaseId;
  chapterComplete: boolean;
  issuedAt: number;
};

const playerIdPattern = /^[0-9a-f-]{16,64}$/i;

function encode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export function getProgressSecret(): string {
  const configured = process.env.DWARKA_PROGRESS_SECRET;
  if (configured && configured.length >= 24) return configured;
  throw new Error("DWARKA_PROGRESS_SECRET must be set to a stable value of at least 24 characters");
}

export function signProgress(payload: ProgressPayload, secret = getProgressSecret()): string {
  const body = encode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function validatePayload(value: unknown, expectedPlayerId?: string): value is ProgressPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  if (payload.v !== 1 || typeof payload.playerId !== "string" || !playerIdPattern.test(payload.playerId)) return false;
  if (expectedPlayerId && payload.playerId !== expectedPlayerId) return false;
  if (!isPhase(payload.furthestCompletedPhase) || !isPhase(payload.nextPhase)) return false;
  if (typeof payload.chapterComplete !== "boolean" || typeof payload.issuedAt !== "number" || !Number.isFinite(payload.issuedAt)) return false;
  if (payload.chapterComplete) {
    return payload.furthestCompletedPhase === "ending" && payload.nextPhase === "complete";
  }
  if (payload.furthestCompletedPhase === "complete" || payload.nextPhase === "complete") return false;
  return nextPhase(payload.furthestCompletedPhase) === payload.nextPhase && PHASE_RANK[payload.nextPhase] > PHASE_RANK.arrival;
}

export function verifyProgress(token: unknown, expectedPlayerId: string, secret = getProgressSecret()): { ok: true; payload: ProgressPayload } | { ok: false; reason: string } {
  try {
    if (typeof token !== "string" || token.length > 4096) return { ok: false, reason: "missing-or-oversized" };
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
    const expected = createHmac("sha256", secret).update(parts[0]).digest();
    const actual = decode(parts[1]);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { ok: false, reason: "bad-signature" };
    const payload = JSON.parse(decode(parts[0]).toString("utf8"));
    if (!validatePayload(payload, expectedPlayerId)) return { ok: false, reason: "invalid-payload" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
