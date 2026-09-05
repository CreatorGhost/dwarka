import assert from "node:assert/strict";
import test from "node:test";
import { installSession, safeWebSocketEndpoint } from "./session.js";

class FakeSimulation {
  constructor(playerId, phase, movementOnly) {
    this.playerId = playerId;
    this.phase = phase;
    this.movementOnly = movementOnly;
    this.player = { x: 0, y: 0, z: 0, yaw: 0, health: 100 };
    this.paused = true;
    this.doorProgress = { "courtyard-rescue-door": phase === "courtyard" ? 1 : 0 };
    this.openDoorIds = new Set(
      phase === "courtyard" ? ["courtyard-rescue-door"] : [],
    );
    this.doorProgressAtTick = [];
    this.doorsExternallyDriven = false;
  }

  setPaused(paused) {
    this.paused = paused;
  }

  adoptDoorState(doors) {
    this.doorsExternallyDriven = true;
    const byId = new Map(doors.map((door) => [door.id, door]));
    this.openDoorIds.clear();
    for (const id of Object.keys(this.doorProgress)) {
      const door = byId.get(id);
      this.doorProgress[id] = door?.open
        ? 1
        : Math.max(0, Math.min(1, Number(door?.progress) || 0));
      if (door?.open) this.openDoorIds.add(id);
    }
  }

  snapshot() {
    return {
      type: "snapshot",
      phase: this.phase,
      serverTick: 0,
      player: { ...this.player },
      enemies: [],
    };
  }

  acceptInput() {}
  tick(dt = 0.05) {
    this.doorProgressAtTick.push(this.doorProgress["courtyard-rescue-door"]);
    if (this.doorsExternallyDriven) return;
    if (this.phase !== "courtyard" || this.openDoorIds.has("courtyard-rescue-door"))
      return;
    this.doorProgress["courtyard-rescue-door"] = Math.min(
      1,
      this.doorProgress["courtyard-rescue-door"] + dt / 0.45,
    );
    if (this.doorProgress["courtyard-rescue-door"] >= 1)
      this.openDoorIds.add("courtyard-rescue-door");
  }
  drainEvents() { return []; }
}

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.listeners = new Map();
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  send(message) { this.sent.push(message); }
}

function snapshot(phase = "market") {
  return {
    type: "snapshot",
    phase,
    serverTick: 1,
    player: { x: 0, y: 0, z: 0, yaw: 0, health: 100 },
    enemies: [],
  };
}

function createHarness(overrides = {}) {
  let timerId = 0;
  const timers = new Map();
  globalThis.window = {
    devicePixelRatio: 1,
    clearTimeout(id) { timers.delete(id); },
    setTimeout(callback) {
      const id = ++timerId;
      timers.set(id, callback);
      return id;
    },
    parent: null,
  };
  globalThis.window.parent = globalThis.window;
  globalThis.location = new URL("https://dwarka.test/game?ws=wss%3A%2F%2Fgame.dwarka.test");
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() {},
  };
  globalThis.WebSocket = FakeWebSocket;
  FakeWebSocket.instances = [];

  const state = {
    profile: {
      anonymousPlayerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      progressToken: null,
      settings: {},
    },
    token: null,
    requestedAction: "continue",
    socket: null,
    reconnectTimer: 0,
    reconnectAttempts: 0,
    sessionAccepted: true,
    snapshot: snapshot(),
    reconnectPhase: null,
    confirmedPhase: "market",
    intentionalSockets: new WeakSet(),
    localSimulation: null,
    localMode: false,
    localSeq: 0,
    localPressed: new Set(),
    networkSnapshots: [],
    keys: new Set(),
    pressed: new Set(),
    aim: false,
    yaw: 0,
    pitch: 0,
    lookYaw: 0,
    lookPitch: 0,
    visualYaw: 0,
    predictedVelocity: { x: 0, z: 0 },
    snapshotVelocity: { x: 0, z: 0 },
    predictedPlayer: null,
    interpolationClockMs: 0,
    enemySnapshotVelocities: new Map(),
    playing: true,
    paused: false,
    modalMode: "playing",
    app: {
      graphicsDevice: { maxPixelRatio: 1 },
      resizeCanvas() {},
    },
    reconnectRequiresResume: false,
    reconnectingAuthoritative: false,
    qaAimPreview: false,
    qaPreviewActive: false,
    snapVisualOnNextSnapshot: false,
    cameraSpring: null,
    cameraSpringVelocity: { x: 0, y: 0, z: 0 },
    ...overrides,
  };
  const calls = {
    connection: [],
    pause: [],
    resume: [],
    toast: [],
    loading: 0,
    clearInput: 0,
  };
  const ui = {
    reconnect: {
      hidden: true,
      classList: { add() {}, remove() {}, toggle() {} },
    },
    modalPrimary: { disabled: false },
  };
  const rt = {
    state,
    ui,
    pc: {},
    canvas: {},
    mats: {},
    WORLD_BOUNDS: {},
    WORLD_COLLIDERS: [],
    FLOOR_REGIONS: [],
    ROUTE_SEGMENTS: [],
    ENVIRONMENT_PLACEMENTS: [],
    STREET_HOUSE_BAYS: [],
    TALL_HOUSE_BAYS: [],
    SETBACK_HOUSE_BAYS: [],
    STREET_HOUSE_MODEL_KEYS: new Set(),
    UPPER_HOUSE_MODEL_KEYS: new Set(),
    UPPER_HOUSE_FRONTS: new Map(),
    GROUND_ALIGNED_MODELS: new Set(),
    STREET_SURFACE_Y: 0,
    CHARACTER_GROUND_LIFT: 0,
    floorHeightAt: () => 0,
    STORY: {},
    STORY_VOICE_LINES: {},
    EFFECT_URLS: {},
    TUTORIAL_STEPS: [],
    PLAYABLE_PHASES: new Set(["arrival", "courtyard", "market", "doorway", "ending"]),
    MODEL_URLS: {},
    CHAPTER_CONFIG: {},
    ChapterSimulation: FakeSimulation,
    CHARACTER_ANIMATIONS: {},
    PHASE_DETAILS: {
      arrival: ["arrival"],
      courtyard: ["courtyard"],
      market: ["market"],
      doorway: ["doorway"],
      ending: ["ending"],
    },
    UI_MESSAGES: {},
    assetUrl: (value) => value,
    chapterAssetRevision: "test",
    angleDifference: () => 0,
    targetLineBlocked: () => false,
    safeWebSocketEndpoint,
    CHARACTER_ANIMATION_SPEEDS: {},
    characterStateGraph: {},
    animationSpeeds: {},
    t: (key) => key,
    sendParent() {},
    strings: () => ({}),
    localizedMessage: (key) => key,
    clearInput() { calls.clearInput += 1; },
    queuePressed() {},
    setConnectionStatus(...args) { calls.connection.push(args); },
    showToast(...args) { calls.toast.push(args); },
    showLoading() { calls.loading += 1; },
    sendPause(paused) {
      calls.pause.push(paused);
      state.localSimulation?.setPaused(paused);
    },
    showResume(phase) {
      calls.resume.push(phase);
      state.paused = true;
      state.playing = false;
      state.modalMode = "pause";
      rt.sendPause(true);
    },
    syncPhaseScene() {},
    updateEnvironmentVisibility() {},
    updateHud() {},
    showIntro() {},
    showEnding() {},
    showComplete() {},
  };
  installSession(rt);
  return { rt, state, calls, timers };
}

test("WebSocket endpoint validation never reaches player localhost from a public page", () => {
  assert.equal(
    safeWebSocketEndpoint("ws://localhost:3210", "https://dwarka-lost-city.vercel.app/game"),
    null,
  );
  assert.equal(
    safeWebSocketEndpoint("wss://localhost:3210", "https://dwarka-lost-city.vercel.app/game"),
    null,
  );
  assert.equal(
    safeWebSocketEndpoint("wss://127.0.0.2:3210", "https://dwarka-lost-city.vercel.app/game"),
    null,
  );
  assert.equal(
    safeWebSocketEndpoint("wss://preview.localhost:3210", "https://dwarka-lost-city.vercel.app/game"),
    null,
  );
  for (const endpoint of [
    "wss://localhost.:3210",
    "wss://preview.localhost.:3210",
    "wss://localhost%2e:3210",
    "wss://[::127.0.0.1]:3210",
    "wss://[::ffff:127.0.0.1]:3210",
    "wss://0.0.0.0:3210",
    "wss://[::]:3210",
    "wss://[::ffff:0.0.0.0]:3210",
  ]) {
    assert.equal(
      safeWebSocketEndpoint(endpoint, "https://dwarka-lost-city.vercel.app/game"),
      null,
      endpoint,
    );
  }
  assert.equal(
    safeWebSocketEndpoint("ws://127.0.0.1:3210", "http://localhost:3000/game"),
    "ws://127.0.0.1:3210/",
  );
  assert.equal(
    safeWebSocketEndpoint("ws://127.0.0.2:3210", "http://preview.localhost:3000/game"),
    "ws://127.0.0.2:3210/",
  );
  assert.equal(
    safeWebSocketEndpoint("wss://game.dwarka.example", "https://dwarka.example/game"),
    "wss://game.dwarka.example/",
  );
  assert.equal(
    safeWebSocketEndpoint("wss://user:secret@game.dwarka.example", "https://dwarka.example/game"),
    null,
  );
  assert.equal(
    safeWebSocketEndpoint("wss://game.dwarka.example/socket#fragment", "https://dwarka.example/game"),
    null,
  );
  assert.equal(safeWebSocketEndpoint("not a url", "https://dwarka.example/game"), null);
  assert.equal(safeWebSocketEndpoint(null, "https://dwarka.example/game"), null);
});

test("an active authoritative disconnect freezes until explicit resume after acceptance", () => {
  const { rt, state, calls } = createHarness();
  const closedSocket = {};
  state.socket = closedSocket;
  state.localSimulation = new FakeSimulation(state.profile.anonymousPlayerId, "market", true);
  state.localSimulation.player.x = 9;

  rt.scheduleReconnect(closedSocket);
  assert.equal(state.localMode, false);
  assert.equal(state.playing, false);
  assert.equal(state.paused, true);
  assert.equal(calls.clearInput, 1);

  rt.handleServer({ type: "session.accepted", phase: "market" });
  assert.deepEqual(calls.resume, ["market"]);
  assert.equal(state.playing, false);
  assert.equal(state.paused, true);
  assert.equal(calls.pause.at(-1), true);

  rt.handleServer(snapshot("market"));
  assert.equal(state.localSimulation.player.x, 0);
  assert.equal(state.snapVisualOnNextSnapshot, false);
});

test("a reconnect that began paused preserves the existing pause state", () => {
  const { rt, state, calls } = createHarness({
    playing: false,
    paused: true,
    modalMode: "pause",
  });
  const closedSocket = {};
  state.socket = closedSocket;

  rt.scheduleReconnect(closedSocket);
  rt.handleServer({ type: "session.accepted", phase: "market" });

  assert.equal(state.localMode, false);
  assert.equal(state.playing, false);
  assert.equal(state.paused, true);
  assert.equal(state.modalMode, "pause");
  assert.deepEqual(calls.resume, []);
  assert.equal(calls.pause.at(-1), true);
});

test("narration stays paused whether it finishes before or after reconnect acceptance", () => {
  for (const narrationFinishesWhileDisconnected of [false, true]) {
    const { rt, state, calls } = createHarness({
      playing: false,
      paused: true,
      modalMode: "courtyard-intro",
      storyNarrating: true,
    });
    const closedSocket = {};
    state.socket = closedSocket;

    rt.scheduleReconnect(closedSocket);
    if (narrationFinishesWhileDisconnected) state.storyNarrating = false;
    rt.handleServer({ type: "session.accepted", phase: "market" });

    assert.equal(state.localMode, false);
    assert.equal(state.playing, false);
    assert.equal(state.paused, true);
    assert.equal(state.modalMode, "courtyard-intro");
    assert.equal(state.storyNarrating, !narrationFinishesWhileDisconnected);
    assert.deepEqual(calls.resume, []);
    assert.equal(calls.pause.at(-1), true);
  }
});

test("the first accepted session stays paused for its first authoritative snapshot", () => {
  const { rt, state, calls } = createHarness({
    sessionAccepted: false,
    playing: false,
    paused: true,
    modalMode: "loading",
    snapshot: null,
    confirmedPhase: "arrival",
  });

  rt.handleServer({ type: "session.accepted", phase: "arrival" });
  assert.deepEqual(calls.resume, []);
  assert.equal(calls.pause.at(-1), true);

  rt.handleServer(snapshot("arrival"));
  assert.equal(state.paused, true);
  assert.equal(state.playing, false);
  assert.equal(state.snapshot.phase, "arrival");
});

test("stale socket callbacks cannot mutate or replace the current connection", () => {
  const { rt, state, timers } = createHarness({
    sessionAccepted: false,
    playing: false,
    paused: true,
    snapshot: null,
  });
  rt.connect(false);
  const staleSocket = state.socket;
  const currentSocket = new FakeWebSocket("wss://game.dwarka.test/current");
  state.socket = currentSocket;
  const timersBefore = timers.size;

  staleSocket.emit("open");
  staleSocket.emit("message", {
    data: JSON.stringify({ type: "session.accepted", phase: "market" }),
  });
  staleSocket.emit("close");

  assert.equal(state.socket, currentSocket);
  assert.deepEqual(staleSocket.sent, []);
  assert.equal(state.sessionAccepted, false);
  assert.equal(timers.size, timersBefore);
});

test("a missing endpoint remains intentional unsaved standalone play", () => {
  const { rt, state, calls, timers } = createHarness({
    sessionAccepted: false,
    playing: false,
    paused: true,
    snapshot: null,
  });
  globalThis.location = new URL("https://dwarka.test/game");

  rt.connect(false);

  assert.equal(state.localMode, true);
  assert.equal(state.sessionAccepted, false);
  assert.equal(timers.size, 0);
  assert.equal(calls.toast.at(-1)?.[0], "Offline play · progress is not saved");
});

test("the movement predictor keeps authoritative closed doors closed", () => {
  const { rt, state } = createHarness({
    snapshot: snapshot("market"),
    confirmedPhase: "courtyard",
  });
  const authoritative = {
    ...snapshot("courtyard"),
    doors: [
      {
        id: "courtyard-rescue-door",
        progress: 0.95,
        open: false,
      },
    ],
  };

  rt.applySnapshot(authoritative);

  assert.equal(state.localSimulation.movementOnly, true);
  assert.equal(
    state.localSimulation.openDoorIds.has("courtyard-rescue-door"),
    false,
  );
  assert.equal(state.localSimulation.doorProgress["courtyard-rescue-door"], 0.95);

  rt.tickLocalSimulation(0.05);

  assert.equal(state.localSimulation.doorProgressAtTick.at(-1), 0.95);
  assert.equal(
    state.localSimulation.openDoorIds.has("courtyard-rescue-door"),
    false,
  );
  assert.equal(state.localSimulation.doorProgress["courtyard-rescue-door"], 0.95);
});

test("the movement predictor adopts an authoritative door opening", () => {
  const { rt, state } = createHarness({
    snapshot: snapshot("market"),
    confirmedPhase: "courtyard",
  });
  const authoritative = {
    ...snapshot("courtyard"),
    doors: [
      {
        id: "courtyard-rescue-door",
        progress: 1,
        open: true,
      },
    ],
  };

  rt.applySnapshot(authoritative);

  assert.equal(
    state.localSimulation.openDoorIds.has("courtyard-rescue-door"),
    true,
  );
  assert.equal(state.localSimulation.doorProgress["courtyard-rescue-door"], 1);
});
