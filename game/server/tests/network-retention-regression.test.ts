import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import test from "node:test";
import WebSocket, { type ClientOptions } from "ws";
import { BoundedProgressStore } from "../src/progress-store.ts";
import { signProgress, type ProgressPayload } from "../src/progress-token.ts";

const serverRoot = fileURLToPath(new URL("../", import.meta.url));
const secret = "dwarka-network-regression-secret-24";
const origin = "https://dwarka.test";
type Message = Record<string, unknown>;

class TestSocket {
  readonly socket: WebSocket;
  private closeCode = 1006;
  private readonly queue: Message[] = [];
  private readonly waiters: Array<{
    predicate: (message: Message) => boolean;
    resolve: (message: Message) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.on("close", (code) => {
      this.closeCode = code;
    });
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as Message;
      const index = this.waiters.findIndex(({ predicate }) => predicate(message));
      if (index < 0) this.queue.push(message);
      else {
        const [waiter] = this.waiters.splice(index, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    });
  }

  static async open(port: number, options: ClientOptions = {}): Promise<TestSocket> {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin, ...options });
    const result = new TestSocket(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    return result;
  }

  static async resume(
    port: number,
    playerId: string,
    progressToken?: string,
    requestedAction: "continue" | "replay" = "continue",
    options: ClientOptions = {},
  ): Promise<TestSocket> {
    const socket = await TestSocket.open(port, options);
    socket.send({
      type: "session.resume",
      playerId,
      progressToken,
      requestedAction,
      clientVersion: 1,
    });
    return socket;
  }

  send(message: Message): void {
    this.socket.send(JSON.stringify(message));
  }

  clearMessages(): void {
    this.queue.length = 0;
  }

  next(predicate: (message: Message) => boolean, timeoutMs = 2_000): Promise<Message> {
    const index = this.queue.findIndex(predicate);
    if (index >= 0) return Promise.resolve(this.queue.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        reject,
        timer: setTimeout(() => {
          const waiterIndex = this.waiters.indexOf(waiter);
          if (waiterIndex >= 0) this.waiters.splice(waiterIndex, 1);
          reject(new Error("Timed out waiting for protocol message"));
        }, timeoutMs),
      };
      this.waiters.push(waiter);
    });
  }

  closed(timeoutMs = 2_000): Promise<number> {
    if (this.socket.readyState === WebSocket.CLOSED) return Promise.resolve(this.closeCode);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for socket close")), timeoutMs);
      this.socket.once("close", (code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = this.closed();
    this.socket.close(1000, "Test complete");
    await closed;
  }
}

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

async function startServer(extraEnv: NodeJS.ProcessEnv = {}): Promise<{
  port: number;
  child: ChildProcessWithoutNullStreams;
  stop: () => Promise<void>;
}> {
  const port = await freePort();
  const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: serverRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      DWARKA_PROGRESS_SECRET: secret,
      DWARKA_ALLOWED_ORIGINS: origin,
      ...extraEnv,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Regression server did not start")), 5_000);
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("server listening")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Regression server exited with ${code}: ${child.stderr.read()?.toString() ?? ""}`));
    });
  });
  return {
    port,
    child,
    async stop() {
      if (child.exitCode !== null) return;
      const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
      child.kill("SIGTERM");
      await exited;
    },
  };
}

function token(playerId: string, completed: "arrival" | "courtyard"): string {
  const payload: ProgressPayload = {
    v: 1,
    playerId,
    furthestCompletedPhase: completed,
    nextPhase: completed === "arrival" ? "courtyard" : "market",
    chapterComplete: false,
    issuedAt: Date.now(),
  };
  return signProgress(payload, secret);
}

async function accepted(socket: TestSocket): Promise<Message> {
  return socket.next((message) => message.type === "session.accepted");
}

test("newer signed progress survives the final normal disconnect", async () => {
  const server = await startServer();
  try {
    const playerId = "11111111-1111-4111-8111-111111111111";
    const courtyard = token(playerId, "arrival");
    const market = token(playerId, "courtyard");
    const newest = await TestSocket.resume(server.port, playerId, market);
    assert.equal((await accepted(newest)).phase, "market");
    await newest.close();

    const stale = await TestSocket.resume(server.port, playerId, courtyard);
    const resume = await accepted(stale);
    assert.equal(resume.phase, "market");
    assert.equal(resume.progressToken, market);
    await stale.close();
  } finally {
    await server.stop();
  }
});

test("heartbeat cleanup retains the newer signed checkpoint", async () => {
  const server = await startServer({ DWARKA_TEST_HEARTBEAT_INTERVAL_MS: "25" });
  try {
    const playerId = "22222222-2222-4222-8222-222222222222";
    const courtyard = token(playerId, "arrival");
    const market = token(playerId, "courtyard");
    const newest = await TestSocket.resume(server.port, playerId, market, "continue", {
      autoPong: false,
    });
    assert.equal((await accepted(newest)).phase, "market");
    assert.equal(await newest.closed(), 1006);

    const stale = await TestSocket.resume(server.port, playerId, courtyard);
    assert.equal((await accepted(stale)).phase, "market");
    await stale.close();
  } finally {
    await server.stop();
  }
});

test("explicit fresh reset and replay preserve their existing semantics", async () => {
  const server = await startServer();
  try {
    const resetPlayer = "33333333-3333-4333-8333-333333333333";
    const resetCourtyard = token(resetPlayer, "arrival");
    const resetMarket = token(resetPlayer, "courtyard");
    const seeded = await TestSocket.resume(server.port, resetPlayer, resetMarket);
    await accepted(seeded);
    await seeded.close();
    const reset = await TestSocket.resume(server.port, resetPlayer);
    assert.equal((await accepted(reset)).phase, "arrival");
    await reset.close();
    const postReset = await TestSocket.resume(server.port, resetPlayer, resetCourtyard);
    assert.equal((await accepted(postReset)).phase, "courtyard");
    await postReset.close();

    const replayPlayer = "44444444-4444-4444-8444-444444444444";
    const replayCourtyard = token(replayPlayer, "arrival");
    const replayMarket = token(replayPlayer, "courtyard");
    const replaySeed = await TestSocket.resume(server.port, replayPlayer, replayMarket);
    await accepted(replaySeed);
    await replaySeed.close();
    const replay = await TestSocket.resume(server.port, replayPlayer, replayCourtyard, "replay");
    assert.equal((await accepted(replay)).phase, "arrival");
    await replay.close();
    const continued = await TestSocket.resume(server.port, replayPlayer, replayCourtyard);
    assert.equal((await accepted(continued)).phase, "market");
    await continued.close();
  } finally {
    await server.stop();
  }
});

test("remembered progress remains bounded and expires under the existing TTL policy", () => {
  let now = 0;
  const store = new BoundedProgressStore<number>(2, 100, () => now);
  store.set("a", 1);
  store.set("b", 2);
  store.set("c", 3);
  assert.equal(store.has("a"), false);
  assert.equal(store.size, 2);
  now = 100;
  assert.equal(store.get("b"), undefined);
  assert.equal(store.size, 0);
});

test("unresumed sockets consume peer capacity and must resume promptly", async () => {
  const server = await startServer({
    DWARKA_TEST_MAX_CONNECTIONS_PER_PEER: "3",
    DWARKA_TEST_RESUME_DEADLINE_MS: "80",
  });
  const sockets: TestSocket[] = [];
  try {
    for (let index = 0; index < 3; index += 1) sockets.push(await TestSocket.open(server.port));
    const overflow = await TestSocket.open(server.port);
    sockets.push(overflow);
    assert.equal(await overflow.closed(), 1013);
    assert.equal(await sockets[0].closed(), 1008);
    const replacement = await TestSocket.resume(
      server.port,
      "66666666-6666-4666-8666-666666666666",
    );
    sockets.push(replacement);
    assert.equal((await accepted(replacement)).phase, "arrival");
  } finally {
    await Promise.all(sockets.map((socket) => socket.close()));
    await server.stop();
  }
});

test("sustained inbound message excess closes only the offending socket", async () => {
  const server = await startServer();
  try {
    const playerId = "55555555-5555-4555-8555-555555555555";
    const socket = await TestSocket.resume(server.port, playerId);
    await accepted(socket);
    for (let index = 0; index < 130; index += 1) {
      socket.send({ type: "session.pause", paused: index % 2 === 0 });
    }
    assert.equal(await socket.closed(), 1008);
    assert.equal((await fetch(`http://127.0.0.1:${server.port}/healthz`)).status, 200);
  } finally {
    await server.stop();
  }
});

test("installed sender skips, recovers, and closes only a persistently slow socket", async () => {
  const server = await startServer({
    DWARKA_TEST_MAX_BUFFERED_BYTES: "64",
    DWARKA_TEST_MAX_SLOW_CHECKS: "6",
  });
  try {
    const slow = await TestSocket.resume(
      server.port,
      "77777777-7777-4777-8777-777777777777",
    );
    const healthy = await TestSocket.resume(
      server.port,
      "88888888-8888-4888-8888-888888888888",
    );
    await accepted(slow);
    await accepted(healthy);
    slow.clearMessages();
    healthy.clearMessages();

    slow.send({ type: "test.backpressure", bufferedAmount: 1_024 });
    await new Promise((resolve) => setTimeout(resolve, 30));
    slow.clearMessages();
    await assert.rejects(
      slow.next((message) => message.type === "snapshot", 90),
      /Timed out/,
    );

    slow.send({ type: "test.backpressure", bufferedAmount: 0 });
    assert.equal((await slow.next((message) => message.type === "snapshot")).type, "snapshot");

    slow.send({ type: "test.backpressure", bufferedAmount: 1_024 });
    assert.equal(await slow.closed(), 1013);
    assert.equal((await healthy.next((message) => message.type === "snapshot")).type, "snapshot");
    assert.equal((await fetch(`http://127.0.0.1:${server.port}/healthz`)).status, 200);
    await healthy.close();
  } finally {
    await server.stop();
  }
});

test("an initially skipped checkpoint retries until progress acknowledgement", async () => {
  const server = await startServer({
    DWARKA_TEST_MAX_BUFFERED_BYTES: "64",
    DWARKA_TEST_MAX_SLOW_CHECKS: "100",
  });
  try {
    const socket = await TestSocket.resume(
      server.port,
      "99999999-9999-4999-8999-999999999999",
    );
    await accepted(socket);
    socket.send({ type: "session.pause", paused: false });
    let seq = 0;
    while (true) {
      const current = await socket.next((message) => message.type === "snapshot");
      const player = current.player as { z: number };
      seq += 1;
      if (player.z > 16) {
        socket.send({
          type: "input",
          seq,
          move: [0, 1],
          aimYaw: 0,
          aimPitch: 0,
          held: [],
          pressed: [],
        });
        continue;
      }
      socket.send({ type: "test.backpressure", bufferedAmount: 1_024 });
      socket.send({
        type: "input",
        seq,
        move: [0, 0],
        aimYaw: 0,
        aimPitch: 0,
        held: [],
        pressed: ["interact"],
      });
      break;
    }

    await assert.rejects(
      socket.next(
        (message) => message.type === "progress.committed" || message.type === "progress.synced",
        250,
      ),
      /Timed out/,
    );
    socket.send({ type: "test.backpressure", bufferedAmount: 0 });
    const firstRetry = await socket.next(
      (message) => message.type === "progress.committed" || message.type === "progress.synced",
      1_500,
    );
    const secondRetry = await socket.next(
      (message) => message.progressToken === firstRetry.progressToken,
      1_500,
    );
    assert.equal(secondRetry.progressToken, firstRetry.progressToken);
    socket.send({ type: "progress.ack", progressToken: firstRetry.progressToken });
    await assert.rejects(
      socket.next((message) => message.progressToken === firstRetry.progressToken, 1_200),
      /Timed out/,
    );
    await socket.close();
  } finally {
    await server.stop();
  }
});
