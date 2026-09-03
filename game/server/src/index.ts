import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { ChapterSimulation } from "./chapter-1/simulation.ts";
import { isPhase, PHASE_RANK, type PhaseId } from "./chapter-1/phases.ts";
import { getProgressSecret, signProgress, verifyProgress, type ProgressPayload } from "./progress-token.ts";
import { BoundedProgressStore } from "./progress-store.ts";

const port = Number(process.env.PORT ?? 3210);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be a valid TCP port");
const production = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const allowedOrigins = new Set(
  (process.env.DWARKA_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const url = new URL(value);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (production && url.protocol !== "https:" && !local) throw new Error("DWARKA_ALLOWED_ORIGINS accepts only HTTPS origins in production");
      return url.origin;
    }),
);
if (production && allowedOrigins.size === 0) throw new Error("DWARKA_ALLOWED_ORIGINS must list at least one HTTPS site origin in production");
getProgressSecret();

const httpServer = createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  if (request.method === "GET" && (path === "/" || path === "/healthz")) {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true, service: "dwarka-chapter-1", uptimeSeconds: Math.floor(process.uptime()) }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify({ ok: false, error: "not-found" }));
});

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return !production;
  try { return allowedOrigins.has(new URL(origin).origin); }
  catch { return false; }
}

type HeartbeatSocket = WebSocket & { isAlive: boolean };
const server = new WebSocketServer({
  server: httpServer,
  maxPayload: 16 * 1024,
  verifyClient(info, done) {
    if (originAllowed(info.origin)) done(true);
    else done(false, 403, "Origin not allowed");
  },
});
const sessions = new Map<WebSocket, ChapterSimulation>();
const replaySessions = new WeakSet<WebSocket>();
const freshSessions = new WeakSet<WebSocket>();
const highestProgress = new BoundedProgressStore<{ phase: PhaseId; token: string; payload: ProgressPayload }>();
const pendingCommits = new Map<WebSocket, { message: Record<string, unknown>; lastSentAt: number }>();

function send(socket: WebSocket, message: unknown): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function progressMessage(type: "progress.committed" | "progress.synced", token: string, payload: ProgressPayload): Record<string, unknown> {
  return { type, completedPhase: payload.furthestCompletedPhase, nextPhase: payload.nextPhase, chapterComplete: payload.chapterComplete, progressToken: token, progressSummary: payload };
}

function sendProgress(socket: WebSocket, type: "progress.committed" | "progress.synced", token: string, payload: ProgressPayload): void {
  const message = progressMessage(type, token, payload);
  send(socket, message);
  pendingCommits.set(socket, { message, lastSentAt: Date.now() });
}

function commit(socket: WebSocket, simulation: ChapterSimulation, completedPhase: PhaseId, phase: PhaseId): void {
  if (replaySessions.has(socket)) return;
  const chapterComplete = completedPhase === "ending" && phase === "complete";
  const payload: ProgressPayload = {
    v: 1,
    playerId: simulation.playerId,
    furthestCompletedPhase: completedPhase,
    nextPhase: phase,
    chapterComplete,
    issuedAt: Date.now(),
  };
  if (freshSessions.has(socket)) {
    const token = signProgress(payload);
    highestProgress.set(simulation.playerId, { phase, token, payload });
    sendProgress(socket, "progress.committed", token, payload);
    return;
  }
  const known = highestProgress.get(simulation.playerId);
  if (known && PHASE_RANK[known.phase] >= PHASE_RANK[phase]) {
    sendProgress(socket, "progress.synced", known.token, known.payload);
    return;
  }
  const token = signProgress(payload);
  highestProgress.set(simulation.playerId, { phase, token, payload });
  sendProgress(socket, "progress.committed", token, payload);
  for (const [otherSocket, otherSimulation] of sessions) {
    if (otherSocket !== socket && otherSimulation.playerId === simulation.playerId) sendProgress(otherSocket, "progress.synced", token, payload);
  }
}

server.on("connection", (socket: HeartbeatSocket) => {
  socket.isAlive = true;
  socket.on("pong", () => { socket.isAlive = true; });
  socket.on("error", (error) => { console.warn("Chapter 1 socket closed after a protocol error", error.message); });
  let resumed = false;
  socket.on("message", (raw) => {
    try {
      const rawSize = Array.isArray(raw) ? raw.reduce((total, part) => total + part.byteLength, 0) : raw.byteLength;
      if (rawSize > 16 * 1024) { socket.close(1009, "Message too large"); return; }
      let parsed: unknown;
      try { parsed = JSON.parse(raw.toString()); }
      catch { send(socket, { type: "error", code: "bad-json", message: "The game received an unreadable message." }); return; }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        send(socket, { type: "error", code: "bad-message", message: "The game received an invalid protocol message." });
        return;
      }
      const message = parsed as Record<string, unknown>;

    if (!resumed) {
      if (message.type !== "session.resume" || typeof message.playerId !== "string" || !/^[0-9a-f-]{16,64}$/i.test(message.playerId)) {
        send(socket, { type: "error", code: "resume-required", message: "A valid anonymous profile is required." });
        return;
      }
      const playerId = message.playerId;
      const requestedReplay = message.requestedAction === "replay";
      if (requestedReplay) replaySessions.add(socket);
      const verified = message.progressToken ? verifyProgress(message.progressToken, playerId) : null;
      const mustStartFresh = !requestedReplay && (
        (Boolean(message.progressToken) && !verified?.ok)
        || (!message.progressToken && highestProgress.has(playerId))
      );
      if (mustStartFresh) { freshSessions.add(socket); highestProgress.delete(playerId); }
      let phase: PhaseId = requestedReplay ? "arrival" : verified?.ok ? verified.payload.nextPhase : "arrival";
      const known = highestProgress.get(playerId);
      if (!requestedReplay && verified?.ok && known && PHASE_RANK[known.phase] > PHASE_RANK[phase]) phase = known.phase;
      if (verified?.ok) {
        const existing = highestProgress.get(playerId);
        if (!existing || PHASE_RANK[verified.payload.nextPhase] >= PHASE_RANK[existing.phase]) {
          highestProgress.set(playerId, { phase: verified.payload.nextPhase, token: String(message.progressToken), payload: verified.payload });
        }
      }
      const simulation = new ChapterSimulation(playerId, phase);
      simulation.setPaused(true);
      sessions.set(socket, simulation);
      resumed = true;
      send(socket, {
        type: "session.accepted",
        sessionId: simulation.sessionId,
        phase,
        checkpoint: phase,
        serverTick: 0,
        tokenStatus: message.progressToken ? (verified?.ok ? "accepted" : "invalid") : "missing",
        warning: message.progressToken && !verified?.ok ? "Saved progress could not be verified. Settings were kept; Chapter 1 restarted safely." : null,
        progressToken: !requestedReplay && verified?.ok ? highestProgress.get(playerId)?.token ?? null : null,
        progressSummary: !requestedReplay && verified?.ok ? highestProgress.get(playerId)?.payload ?? null : null,
      });
      send(socket, simulation.snapshot());
      return;
    }

      const simulation = sessions.get(socket);
      if (!simulation) return;
      if (message.type === "input") simulation.acceptInput(message);
      else if (message.type === "session.pause") simulation.setPaused(Boolean(message.paused));
      else if (message.type === "progress.ack" && typeof message.progressToken === "string") {
        const pending = pendingCommits.get(socket);
        if (pending?.message.progressToken === message.progressToken) pendingCommits.delete(socket);
      }
      else if (message.type === "story.complete") simulation.completeEnding();
      else if (message.type === "session.retry" && isPhase(message.phase) && message.phase === simulation.phase) simulation.loadPhase(simulation.phase);
    } catch (error) {
      console.error("Chapter 1 protocol message failed safely", error);
      send(socket, { type: "error", code: "message-failed", message: "The game rejected an invalid message safely." });
    }
  });

  socket.on("close", () => {
    const closedSession = sessions.get(socket);
    sessions.delete(socket); pendingCommits.delete(socket);
    if (closedSession && ![...sessions.values()].some((session) => session.playerId === closedSession.playerId)) highestProgress.delete(closedSession.playerId);
  });
});

const simulationTimer = setInterval(() => {
  for (const [socket, simulation] of sessions) {
    simulation.tick(0.05);
    for (const event of simulation.drainEvents()) {
      if (event.type === "phase.completed") commit(socket, simulation, event.completedPhase, event.nextPhase);
      else send(socket, event);
    }
    send(socket, simulation.snapshot());
    const pending = pendingCommits.get(socket);
    if (pending && Date.now() - pending.lastSentAt >= 1000) {
      send(socket, pending.message); pending.lastSentAt = Date.now();
    }
  }
}, 50);

const heartbeatTimer = setInterval(() => {
  for (const socket of server.clients as Set<HeartbeatSocket>) {
    if (!socket.isAlive) {
      const expiredSession = sessions.get(socket);
      sessions.delete(socket);
      pendingCommits.delete(socket);
      if (expiredSession && ![...sessions.values()].some((session) => session.playerId === expiredSession.playerId)) highestProgress.delete(expiredSession.playerId);
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, 30_000);
heartbeatTimer.unref();

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`DWARKA Chapter 1 server listening on http://0.0.0.0:${port}`);
});

function shutdown(): void {
  clearInterval(simulationTimer);
  clearInterval(heartbeatTimer);
  for (const socket of sessions.keys()) socket.close(1001, "Server stopping");
  server.close();
  httpServer.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
