import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const SITE_ROOT = path.resolve(import.meta.dirname, "..");
const WORKSPACE_ROOT = path.resolve(SITE_ROOT, "..");

async function loadMarkedExports(file, marker) {
  const source = await readFile(file, "utf8");
  const startMarker = `// ${marker}_START`;
  const endMarker = `// ${marker}_END`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  assert.notEqual(start, -1, `${marker} start marker is missing from ${file}`);
  assert.notEqual(end, -1, `${marker} end marker is missing from ${file}`);
  assert.ok(end > start, `${marker} markers are out of order in ${file}`);

  const block = source.slice(start + startMarker.length, end);
  const compiled = ts.transpileModule(block, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    module: { exports },
    URL,
    console,
  });
  return exports;
}

async function loadTypeScriptModule(file, context = {}) {
  const source = await readFile(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    module: { exports },
    require(specifier) {
      if (specifier === "./localization")
        return { isLocale: (value) => ["en", "hi", "ta", "kn", "te"].includes(value) };
      throw new Error(`Unexpected test import: ${specifier}`);
    },
    console,
    ...context,
  });
  return exports;
}

function createFakeClock() {
  let now = 0;
  let nextId = 1;
  const tasks = new Map();
  return {
    now: () => now,
    setTimeout(callback, delay) {
      const id = nextId++;
      tasks.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout(id) {
      tasks.delete(id);
    },
    tick(duration) {
      const target = now + duration;
      while (true) {
        const due = [...tasks.entries()]
          .filter(([, task]) => task.due <= target)
          .sort((left, right) => left[1].due - right[1].due)[0];
        if (!due) break;
        now = due[1].due;
        tasks.delete(due[0]);
        due[1].callback();
      }
      now = target;
    },
    pending: () => tasks.size,
  };
}

test("cinematic deadlines pause, resume, and survive a skip-confirm interruption", async () => {
  const helpers = await loadMarkedExports(
    path.join(SITE_ROOT, "app/ChapterZeroCinematic.tsx"),
    "CINEMATIC_BEHAVIOR_HELPERS",
  );
  const clock = createFakeClock();
  let fired = 0;
  const timer = helpers.createResumableTimer({
    clock,
    now: clock.now,
    onFire: () => fired++,
  });

  timer.arm(1_000);
  clock.tick(400);
  timer.pause();
  clock.tick(5_000);
  assert.equal(fired, 0);
  assert.equal(clock.pending(), 0);
  timer.resume();
  clock.tick(599);
  assert.equal(fired, 0);
  clock.tick(1);
  assert.equal(fired, 1);

  let advances = 0;
  const gate = helpers.createCinematicAdvanceGate(() => advances++);
  gate.setBlocked(true);
  gate.request();
  gate.request();
  assert.equal(advances, 0);
  assert.equal(gate.hasPending(), true);
  gate.setBlocked(false);
  assert.equal(advances, 1, "closing skip-confirm must consume the elapsed deadline once");
  assert.equal(gate.hasPending(), false);
});

test("cinematic skip confirmation can discard the pending deadline on confirmed exit", async () => {
  const helpers = await loadMarkedExports(
    path.join(SITE_ROOT, "app/ChapterZeroCinematic.tsx"),
    "CINEMATIC_BEHAVIOR_HELPERS",
  );
  let advances = 0;
  const gate = helpers.createCinematicAdvanceGate(() => advances++);
  gate.setBlocked(true);
  gate.request();
  gate.discard();
  gate.setBlocked(false);
  assert.equal(advances, 0);
});

test("game-frame messages require the exact iframe window and same origin", async () => {
  const helpers = await loadMarkedExports(
    path.join(SITE_ROOT, "app/game/chapter-1/ChapterGameClient.tsx"),
    "GAME_FRAME_HELPERS",
  );
  const frameWindow = {};
  assert.equal(
    helpers.isTrustedGameFrameMessage(
      { source: frameWindow, origin: "https://dwarka.example" },
      frameWindow,
      "https://dwarka.example",
    ),
    true,
  );
  assert.equal(
    helpers.isTrustedGameFrameMessage(
      { source: {}, origin: "https://dwarka.example" },
      frameWindow,
      "https://dwarka.example",
    ),
    false,
  );
  assert.equal(
    helpers.isTrustedGameFrameMessage(
      { source: frameWindow, origin: "https://attacker.example" },
      frameWindow,
      "https://dwarka.example",
    ),
    false,
  );
});

test("game-frame watchdog cancels on ready and reports a silent bootstrap timeout", async () => {
  const helpers = await loadMarkedExports(
    path.join(SITE_ROOT, "app/game/chapter-1/ChapterGameClient.tsx"),
    "GAME_FRAME_HELPERS",
  );
  const clock = createFakeClock();
  let timeouts = 0;
  const watchdog = helpers.createGameFrameWatchdog({
    clock,
    delay: 12_000,
    onTimeout: () => timeouts++,
  });
  watchdog.arm();
  clock.tick(11_999);
  watchdog.ready();
  clock.tick(1);
  assert.equal(timeouts, 0);
  assert.equal(clock.pending(), 0);

  watchdog.arm();
  clock.tick(12_000);
  assert.equal(timeouts, 1);
  watchdog.cancel();
  assert.equal(clock.pending(), 0);
});

test("denied browser storage falls back to session memory without throwing", async () => {
  const helpers = await loadMarkedExports(
    path.join(SITE_ROOT, "app/game/chapter-1/progress.ts"),
    "PROFILE_STORAGE_HELPERS",
  );
  const deniedStorage = {
    getItem() {
      throw new Error("storage denied");
    },
    setItem() {
      throw new Error("storage denied");
    },
    removeItem() {
      throw new Error("storage denied");
    },
  };
  const storage = helpers.createProfileStorage(deniedStorage);
  assert.equal(storage.getItem("preference"), null);
  assert.equal(storage.isDurable(), false);
  storage.setItem("preference", "kn");
  assert.equal(storage.getItem("preference"), "kn");
  storage.removeItem("preference");
  assert.equal(storage.getItem("preference"), null);
});

test("a durable removal clears another adapter's cached profile", async () => {
  const helpers = await loadMarkedExports(
    path.join(SITE_ROOT, "app/game/chapter-1/progress.ts"),
    "PROFILE_STORAGE_HELPERS",
  );
  const durableValues = new Map();
  const backend = {
    getItem: (key) => durableValues.get(key) ?? null,
    setItem: (key, value) => durableValues.set(key, value),
    removeItem: (key) => durableValues.delete(key),
  };
  const firstTab = helpers.createProfileStorage(backend);
  const secondTab = helpers.createProfileStorage(backend);
  firstTab.setItem("profile", "old-progress");
  assert.equal(firstTab.getItem("profile"), "old-progress");
  secondTab.removeItem("profile");
  assert.equal(firstTab.getItem("profile"), null);
  assert.equal(firstTab.isDurable(), true);
});

test("profile choices and reset preferences survive denied storage for this tab", async () => {
  const deniedStorage = {
    getItem() {
      throw new Error("storage denied");
    },
    setItem() {
      throw new Error("storage denied");
    },
    removeItem() {
      throw new Error("storage denied");
    },
  };
  let nextId = 0;
  const progress = await loadTypeScriptModule(
    path.join(SITE_ROOT, "app/game/chapter-1/progress.ts"),
    {
      localStorage: deniedStorage,
      BroadcastChannel: class {
        constructor() {
          throw new Error("channel denied");
        }
      },
      crypto: { randomUUID: () => `player-${++nextId}` },
    },
  );

  const initial = progress.readProfile();
  const updated = progress.updateSettings(initial, {
    locale: "kn",
    voiceLocale: "kn",
    languageChosen: true,
  });
  assert.equal(progress.isProfileStorageDurable(), false);
  assert.equal(progress.readProfile().settings.locale, "kn");
  progress.resetProgress(updated);
  assert.equal(progress.readProfile().settings.locale, "kn");
  assert.equal(progress.readProfile().settings.languageChosen, true);
});

test("production websocket configuration rejects insecure and credentialed URLs", async () => {
  const helpers = await loadMarkedExports(
    path.join(SITE_ROOT, "app/game/chapter-1/page.tsx"),
    "CHAPTER_URL_HELPER",
  );
  assert.equal(
    helpers.configuredWebSocketUrl("wss://game.dwarka.example/socket", "production"),
    "wss://game.dwarka.example/socket",
  );
  assert.equal(
    helpers.configuredWebSocketUrl("ws://localhost:3210", "development"),
    "ws://localhost:3210/",
  );
  assert.throws(
    () => helpers.configuredWebSocketUrl("ws://localhost:3210", "production"),
    /DWARKA_WS_URL/,
  );
  assert.throws(
    () => helpers.configuredWebSocketUrl("wss://localhost:3210", "production"),
    /DWARKA_WS_URL/,
  );
  assert.throws(
    () => helpers.configuredWebSocketUrl("wss://localhost.:3210", "production"),
    /DWARKA_WS_URL/,
  );
  for (const localOnly of [
    "wss://127.0.0.2:3210",
    "wss://[::1]:3210",
    "wss://[::ffff:7f00:1]:3210",
    "wss://[::127.0.0.1]:3210",
    "wss://[::ffff:0.0.0.0]:3210",
    "wss://child.localhost:3210",
    "wss://preview.localhost.:3210",
    "wss://localhost%2e:3210",
    "wss://0.0.0.0:3210",
    "wss://[::]:3210",
  ]) {
    assert.throws(
      () => helpers.configuredWebSocketUrl(localOnly, "production"),
      /DWARKA_WS_URL/,
      localOnly,
    );
  }
  assert.equal(
    helpers.configuredWebSocketUrl("ws://127.0.0.2:3210", "development"),
    "ws://127.0.0.2:3210/",
  );
  assert.throws(
    () => helpers.configuredWebSocketUrl("wss://user:secret@game.dwarka.example", "production"),
    /DWARKA_WS_URL/,
  );
  assert.throws(
    () => helpers.configuredWebSocketUrl("wss://game.dwarka.example/socket#fragment", "production"),
    /DWARKA_WS_URL/,
  );
  assert.equal(helpers.configuredWebSocketUrl(undefined, "production"), null);
});

test("fatal game bootstrap exposes retry and home recovery and reports to the shell", async () => {
  const helpers = await loadMarkedExports(
    path.join(WORKSPACE_ROOT, "game/client-scripts/chapter-1.js"),
    "FATAL_BOOTSTRAP_HELPER",
  );
  const elements = new Map(
    ["modal", "modal-title", "modal-copy", "modal-primary", "modal-secondary"].map((id) => [
      id,
      {
        id,
        hidden: true,
        disabled: true,
        textContent: "",
        onclick: null,
        classList: { remove() {} },
        setAttribute() {},
      },
    ]),
  );
  const posted = [];
  let reloads = 0;
  let assigned = "";
  const parent = { postMessage: (...args) => posted.push(args) };
  const windowObject = {
    location: {
      origin: "https://dwarka.example",
      reload: () => reloads++,
      assign: (value) => {
        assigned = value;
      },
    },
    parent,
  };
  helpers.reportFatalBootstrap(new Error("engine import failed"), {
    documentObject: { getElementById: (id) => elements.get(id) ?? null },
    windowObject,
    consoleObject: { error() {} },
  });

  assert.equal(elements.get("modal").hidden, false);
  assert.equal(elements.get("modal-primary").disabled, false);
  assert.match(elements.get("modal-primary").textContent, /retry/i);
  assert.match(elements.get("modal-secondary").textContent, /home/i);
  assert.equal(posted[0][0].type, "dwarka:load-error");
  assert.equal(posted[0][0].reason, "bootstrap");
  assert.equal(posted[0][1], "https://dwarka.example");
  elements.get("modal-primary").onclick();
  assert.equal(reloads, 1);
  assert.equal(posted.at(-1)[0].type, "dwarka:retrying");
  assert.equal(posted.at(-1)[1], "https://dwarka.example");
  elements.get("modal-secondary").onclick();
  assert.equal(posted.at(-1)[0].type, "dwarka:return-home");
  assert.equal(posted.at(-1)[1], "https://dwarka.example");
  assert.equal(assigned, "");
});

test("static game shell starts with its action disabled until the module owns it", async () => {
  const html = await readFile(
    path.join(SITE_ROOT, "public/playcanvas/chapter-1/index.html"),
    "utf8",
  );
  assert.match(html, /<button[^>]+id="modal-primary"[^>]+disabled/);
});
