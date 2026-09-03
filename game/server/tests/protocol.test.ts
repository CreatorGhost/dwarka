import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import WebSocket from "ws";
import { signProgress, type ProgressPayload } from "../src/progress-token.ts";

const serverRoot = fileURLToPath(new URL("../", import.meta.url));
const secret = "dwarka-protocol-test-secret-at-least-24";
let port = 0;
let child: ChildProcessWithoutNullStreams;

type Message = Record<string, unknown>;

class ProtocolSocket {
  readonly socket: WebSocket;
  private readonly queued: Message[] = [];
  private readonly waiters: Array<{ predicate: (message: Message) => boolean; resolve: (message: Message) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }> = [];

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as Message;
      const index = this.waiters.findIndex((waiter) => waiter.predicate(message));
      if (index < 0) this.queued.push(message);
      else {
        const [waiter] = this.waiters.splice(index, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    });
  }

  static async connect(playerId: string, progressToken?: string, requestedAction: "continue" | "replay" = "continue"): Promise<ProtocolSocket> {
    const protocol = await ProtocolSocket.open();
    protocol.send({ type: "session.resume", playerId, progressToken, requestedAction, clientVersion: 1 });
    return protocol;
  }

  static async open(): Promise<ProtocolSocket> {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin: "https://dwarka.test" });
    const protocol = new ProtocolSocket(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    return protocol;
  }

  send(message: Message): void {
    this.socket.send(JSON.stringify(message));
  }

  sendRaw(message: string | Buffer): void {
    this.socket.send(message);
  }

  next(predicate: (message: Message) => boolean, timeoutMs = 3000): Promise<Message> {
    const index = this.queued.findIndex(predicate);
    if (index >= 0) return Promise.resolve(this.queued.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timer: setTimeout(() => {
        const waiterIndex = this.waiters.indexOf(waiter);
        if (waiterIndex >= 0) this.waiters.splice(waiterIndex, 1);
        reject(new Error("Timed out waiting for a protocol message"));
      }, timeoutMs) };
      this.waiters.push(waiter);
    });
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>((resolve) => this.socket.once("close", () => resolve()));
    this.socket.close(1000, "Test complete");
    await closed;
  }
}

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
  const address = probe.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForServer(process: ChildProcessWithoutNullStreams): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Protocol test server did not start")), 5000);
    process.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("server listening")) { clearTimeout(timer); resolve(); }
    });
    process.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Protocol test server exited with ${code}`)); });
  });
}

function completeToken(playerId: string): string {
  const payload: ProgressPayload = { v: 1, playerId, furthestCompletedPhase: "ending", nextPhase: "complete", chapterComplete: true, issuedAt: Date.now() };
  return signProgress(payload, secret);
}

async function accept(protocol: ProtocolSocket): Promise<Message> {
  return protocol.next((message) => message.type === "session.accepted");
}

async function completeArrival(protocol: ProtocolSocket): Promise<Message> {
  protocol.send({ type: "session.pause", paused: false });
  let seq = 0;
  while (true) {
    const snapshot = await protocol.next((message) => message.type === "snapshot");
    if (snapshot.phase !== "arrival") continue;
    const player = snapshot.player as { z: number };
    seq += 1;
    if (player.z > 16) protocol.send({ type: "input", seq, move: [0, 1], aimYaw: 0, aimPitch: 0, held: [], pressed: [] });
    else {
      protocol.send({ type: "input", seq, move: [0, 0], aimYaw: 0, aimPitch: 0, held: [], pressed: ["interact"] });
      return protocol.next((message) => message.type === "progress.committed" || message.type === "progress.synced");
    }
  }
}

before(async () => {
  port = await freePort();
  child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: serverRoot,
    env: { ...process.env, PORT: String(port), DWARKA_PROGRESS_SECRET: secret, DWARKA_ALLOWED_ORIGINS: "https://dwarka.test" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  await waitForServer(child);
});

after(async () => {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  await exited;
});

test("an invalid token starts fresh and its first committed checkpoint survives reconnect", async () => {
  const playerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const seeded = await ProtocolSocket.connect(playerId, completeToken(playerId));
  assert.equal((await accept(seeded)).phase, "complete");
  await seeded.close();

  const fresh = await ProtocolSocket.connect(playerId, "bad.token");
  const accepted = await accept(fresh);
  assert.equal(accepted.phase, "arrival");
  assert.equal(accepted.tokenStatus, "invalid");
  const progress = await completeArrival(fresh);
  assert.equal(progress.type, "progress.committed");
  assert.equal(progress.nextPhase, "courtyard");
  const token = String(progress.progressToken);
  await fresh.close();

  const resumed = await ProtocolSocket.connect(playerId, token);
  assert.equal((await accept(resumed)).phase, "courtyard");
  await resumed.close();
});

test("health endpoint is lightweight and unknown routes fail closed", async () => {
  const health = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal(health.status, 200);
  assert.equal((await health.json() as { ok: boolean; service: string }).service, "dwarka-chapter-1");
  const missing = await fetch(`http://127.0.0.1:${port}/missing`);
  assert.equal(missing.status, 404);
});

test("WebSocket upgrades reject an origin outside the allowlist", async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin: "https://not-dwarka.test" });
  await assert.rejects(new Promise<void>((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  }), /403/);
});

test("malformed protocol values and oversized frames cannot terminate the server", async () => {
  const protocol = await ProtocolSocket.open();
  for (const payload of ["null", "1", '"x"', "[]"]) {
    protocol.sendRaw(payload);
    assert.equal((await protocol.next((message) => message.code === "bad-message")).type, "error");
  }
  protocol.sendRaw("{");
  assert.equal((await protocol.next((message) => message.code === "bad-json")).type, "error");
  protocol.send({ type: "session.resume", playerId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", requestedAction: "continue", clientVersion: 1 });
  assert.equal((await accept(protocol)).phase, "arrival");
  await protocol.close();

  const oversized = await ProtocolSocket.open();
  const closed = new Promise<number>((resolve) => oversized.socket.once("close", (code) => resolve(code)));
  oversized.sendRaw(Buffer.alloc(17 * 1024, 0x61));
  assert.equal(await closed, 1009);
  assert.equal(child.exitCode, null);
  assert.equal((await fetch(`http://127.0.0.1:${port}/healthz`)).status, 200);
});

test("a missing token starts fresh even when this process remembers later progress", async () => {
  const playerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const seeded = await ProtocolSocket.connect(playerId, completeToken(playerId));
  assert.equal((await accept(seeded)).phase, "complete");
  await seeded.close();

  const fresh = await ProtocolSocket.connect(playerId);
  const accepted = await accept(fresh);
  assert.equal(accepted.phase, "arrival");
  assert.equal(accepted.tokenStatus, "missing");
  const progress = await completeArrival(fresh);
  assert.equal(progress.type, "progress.committed");
  assert.equal(progress.nextPhase, "courtyard");
  const token = String(progress.progressToken);
  await fresh.close();

  const resumed = await ProtocolSocket.connect(playerId, token);
  assert.equal((await accept(resumed)).phase, "courtyard");
  await resumed.close();
});

test("the newest server-confirmed token reaches a second live tab", async () => {
  const playerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const first = await ProtocolSocket.connect(playerId);
  const second = await ProtocolSocket.connect(playerId);
  assert.equal((await accept(first)).phase, "arrival");
  assert.equal((await accept(second)).phase, "arrival");

  const committed = await completeArrival(first);
  assert.equal(committed.type, "progress.committed");
  assert.equal(committed.nextPhase, "courtyard");
  const synced = await second.next((message) => message.type === "progress.synced");
  assert.equal(synced.nextPhase, "courtyard");
  assert.equal(synced.progressToken, committed.progressToken);
  await first.close();
  await second.close();
});

test("replay advances without replacing the saved completion token", async () => {
  const playerId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const token = completeToken(playerId);
  const seeded = await ProtocolSocket.connect(playerId, token);
  assert.equal((await accept(seeded)).phase, "complete");
  await seeded.close();

  const replay = await ProtocolSocket.connect(playerId, token, "replay");
  assert.equal((await accept(replay)).phase, "arrival");
  replay.send({ type: "session.pause", paused: false });
  let seq = 0;
  let reachedCourtyard = false;
  while (!reachedCourtyard) {
    const snapshot = await replay.next((message) => message.type === "snapshot");
    const player = snapshot.player as { z: number };
    if (snapshot.phase === "courtyard") { reachedCourtyard = true; break; }
    if (snapshot.phase !== "arrival") continue;
    seq += 1;
    replay.send({ type: "input", seq, move: player.z > 16 ? [0, 1] : [0, 0], aimYaw: 0, aimPitch: 0, held: [], pressed: player.z > 16 ? [] : ["interact"] });
  }
  assert.equal(reachedCourtyard, true);
  await replay.close();

  const original = await ProtocolSocket.connect(playerId, token);
  assert.equal((await accept(original)).phase, "complete");
  await original.close();
});
