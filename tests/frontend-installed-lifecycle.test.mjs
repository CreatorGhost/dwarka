import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import vm from "node:vm";
import { build, transform } from "esbuild";
import { createServer } from "vite";

const SITE_ROOT = path.resolve(import.meta.dirname, "..");
const WORKSPACE_ROOT = path.resolve(SITE_ROOT, "..");
const FIXTURE_ROOT = path.join(import.meta.dirname, "fixtures/frontend-lifecycle");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SITE_BASELINE = "09b1bb0795abc6a8c044269e42e617d63d711d86";
const ROOT_BASELINE = "4f53b170b6463a785a4f348ab6ff0e76211b8d08";
const EVIDENCE_DIR = process.env.DWARKA_FRONTEND_EVIDENCE_DIR;
const baselineCinematicSource = execFileSync(
  "git",
  ["-C", SITE_ROOT, "show", `${SITE_BASELINE}:app/ChapterZeroCinematic.tsx`],
  { encoding: "utf8" },
);
const baselineGameClientSource = execFileSync(
  "git",
  ["-C", SITE_ROOT, "show", `${SITE_BASELINE}:app/game/chapter-1/ChapterGameClient.tsx`],
  { encoding: "utf8" },
);

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => resolve(address.port));
    });
  });
}

function frontendFixturePlugin() {
  return {
    name: "frontend-lifecycle-fixture",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith("/playcanvas/chapter-1/index.html")) return next();
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end("<!doctype html><html><body>inert game frame</body></html>");
      });
    },
    resolveId(source, importer) {
      if (source === "next/image") return "\0fixture-next-image";
      const owner = importer?.split("?")[0] ?? "";
      if (!owner.endsWith("/app/ChapterZeroCinematic.tsx")) return null;
      if (source === "./EmberField") return "\0fixture-ember";
      if (source === "./story-sequence") return "\0fixture-story-sequence";
      if (source === "./chapter-zero-beats") return "\0fixture-chapter-zero-beats";
      return null;
    },
    load(id) {
      const [filename, query = ""] = id.split("?");
      if (new URLSearchParams(query).has("baseline")) {
        if (filename.endsWith("/app/ChapterZeroCinematic.tsx")) return baselineCinematicSource;
        if (filename.endsWith("/app/game/chapter-1/ChapterGameClient.tsx")) return baselineGameClientSource;
      }
      if (id === "\0fixture-next-image")
        return `import React from "react";
          export default function FixtureImage({ src, className, alt, "aria-hidden": ariaHidden }) {
            return React.createElement("span", { className, "data-src": String(src), "data-alt": alt, "aria-hidden": ariaHidden });
          }`;
      if (id === "\0fixture-ember") return "export default function EmberField() { return null; }";
      if (id === "\0fixture-story-sequence")
        return `export const loadSequenceManifest = async () => ({});
          export const framesForBeat = () => ["frame-a", "frame-b"];
          export const visibleFrameCount = () => 2;`;
      if (id === "\0fixture-chapter-zero-beats")
        return `export const BEATS = [{ id: "beat-0", hold: 160, image: "frame-a", voice: "voice-0", hero: false, mission: false }];
          export const MANUSCRIPT = { image: "manuscript", hold: 80 };
          export const FRAME_CROSSFADE_MS = 5;
          export const FRAME_INTERVAL_MS = 50;
          export const BEAT_TAIL_MS = 10;
          export const CAPTION_FADE_MS = 5;
          export const CAPTION_HOLD_AFTER_VOICE_MS = 5;
          export const RAID_BED_FROM_BEAT = 1;`;
      return null;
    },
    transform(code, id) {
      const [filename, query = ""] = id.split("?");
      const negative = new URLSearchParams(query).get("negative");
      if (filename.endsWith("/app/ChapterZeroCinematic.tsx")) {
        let transformed = code
          .replace("const TITLE_HOLD_MS = 2_600;", "const TITLE_HOLD_MS = 100;")
          .replace("const LEAVE_FADE_MS = 900;", "const LEAVE_FADE_MS = 10;")
          .replace("}, 450);", "}, 20);");
        if (negative === "prior-skip")
          transformed = transformed
            .replace(
              "advanceGateRef.current?.setBlocked(true);",
              "/* negative control: prior unguarded skip open */",
            )
            .replace(
              "if (advancingRef.current || mode === \"leaving\") return;",
              "if (advancingRef.current || skipConfirm || mode === \"leaving\") return;",
            )
            .replace(
              "}, [beat, clearFallback, clearTitleHold, leave, mode, openAccount]);",
              "}, [beat, clearFallback, clearTitleHold, leave, mode, openAccount, skipConfirm]);",
            );
        if (negative === "clock-pause")
          transformed = transformed
            .replace("fallbackTimerRef.current?.pause();", "/* negative control */")
            .replace("frameTimerRef.current?.pause();", "/* negative control */")
            .replace("titleTimerRef.current?.pause();", "/* negative control */");
        return { code: transformed, map: null };
      }
      if (filename.endsWith("/app/game/chapter-1/ChapterGameClient.tsx")) {
        let transformed = code.replace(
          "const FRAME_READY_TIMEOUT_MS = 30_000;",
          "const FRAME_READY_TIMEOUT_MS = 80;",
        );
        if (negative === "trust")
          transformed = transformed.replace(
            "!isTrustedGameFrameMessage(",
            "false && !isTrustedGameFrameMessage(",
          );
        if (negative === "ready-cancel")
          transformed = transformed.replace("watchdog.ready();", "/* negative control: no ready cancellation */");
        return { code: transformed, map: null };
      }
      return null;
    },
  };
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const waiter = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result?.value;
  }
  close() {
    this.socket.close();
  }
}

let viteServer;
let chromeProcess;
let chromeProfile;
let cdp;
let fixtureUrl;

before(async () => {
  const sitePort = await freePort();
  viteServer = await createServer({
    root: FIXTURE_ROOT,
    publicDir: false,
    appType: "spa",
    logLevel: "error",
    plugins: [frontendFixturePlugin()],
    server: {
      host: "127.0.0.1",
      port: sitePort,
      strictPort: true,
      fs: { allow: [SITE_ROOT] },
    },
  });
  await viteServer.listen();
  fixtureUrl = `http://127.0.0.1:${sitePort}/`;

  const debugPort = await freePort();
  chromeProfile = await mkdtemp(path.join(os.tmpdir(), "dwarka-frontend-lifecycle-"));
  chromeProcess = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${chromeProfile}`,
    fixtureUrl,
  ], { stdio: "ignore" });

  const endpoint = `http://127.0.0.1:${debugPort}`;
  let pages = [];
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      pages = await fetch(`${endpoint}/json/list`).then((response) => response.json());
      if (pages.some((page) => page.type === "page")) break;
    } catch {
      // Chrome's debugging endpoint is expected to reject connections while it starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const target = pages.find((page) => page.type === "page");
  assert.ok(target, "headless Chrome did not expose the fixture page");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  cdp = new CdpSession(socket);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await cdp.evaluate("Boolean(window.__frontendLifecycle)")) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("frontend lifecycle fixture did not initialize");
});

after(async () => {
  cdp?.close();
  if (chromeProcess && chromeProcess.exitCode === null) {
    chromeProcess.kill("SIGTERM");
    await new Promise((resolve) => chromeProcess.once("exit", resolve));
  }
  await viteServer?.close();
  if (chromeProfile)
    await rm(chromeProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

function fixtureCall(method, ...args) {
  return cdp.evaluate(
    `window.__frontendLifecycle[${JSON.stringify(method)}](...${JSON.stringify(args)})`,
  );
}

test("installed cinematic queues the elapsed deadline at its skip callsites", async () => {
  const installed = await fixtureCall("skipScenario", "normal");
  assert.deepEqual(installed, { heldWhileConfirming: true, consumedAfterCancel: true });

  const priorCallsite = await fixtureCall("skipScenario", "baseline");
  assert.deepEqual(priorCallsite, { heldWhileConfirming: true, consumedAfterCancel: false },
    "negative control must restore the consumed-deadline bug");
});

test("installed cinematic pauses audio and deadlines through blur and visibility", async () => {
  const blur = await fixtureCall("blurScenario", "normal");
  assert.deepEqual(blur, {
    heldWhileBlurred: true,
    audioPaused: true,
    resumed: true,
    audioResumed: true,
  });
  assert.deepEqual(await fixtureCall("visibilityScenario"), {
    heldWhileHidden: true,
    resumed: true,
  });
  const frameAndTitle = await fixtureCall("frameAndTitleScenario");
  assert.equal(frameAndTitle.frameWhileBlurred, "frame-a");
  assert.equal(frameAndTitle.frameAfterFocus, "frame-b");
  assert.equal(frameAndTitle.reachedTitle, true);
  assert.equal(frameAndTitle.titleHeld, true);
  assert.equal(frameAndTitle.titleResumed, true);

  assert.equal((await fixtureCall("prepareBlurEvidence", "baseline")).activeFrame, "frame-a",
    "pinned baseline must strand the first storyboard frame after focus");
  assert.equal((await fixtureCall("prepareBlurEvidence", "normal")).activeFrame, "frame-b");

  const priorCallsite = await fixtureCall("blurScenario", "clock-pause");
  assert.equal(priorCallsite.heldWhileBlurred, false, "negative control must let the deadline fire during blur");
});

test("installed game shell enforces iframe trust and cancels readiness timeout", async () => {
  const installed = await fixtureCall("trustScenario", "normal");
  assert.deepEqual(installed, {
    rejectedWrongSource: true,
    rejectedWrongOrigin: true,
    acceptedTrusted: true,
    listeners: 0,
    timers: 0,
  });
  assert.equal((await fixtureCall("trustScenario", "trust")).rejectedWrongSource, false,
    "negative control must accept the untrusted source");
  assert.equal((await fixtureCall("readyCancelScenario", "normal")).stayedReady, true);
  assert.equal((await fixtureCall("readyCancelScenario", "ready-cancel")).stayedReady, false,
    "negative control must time out after ready when cancellation is removed");
});

test("installed game shell rearms retry and cleans timers/listeners on unmount", async () => {
  const result = await fixtureCall("retryAndUnmountScenario");
  assert.equal(result.timedOut, true);
  assert.equal(result.retryArmed, true);
  assert.equal(result.retryAttempt, "1");
  assert.equal(result.childRetryArmed, true);
  assert.equal(result.listenersBeforeUnmount, 1);
  assert.equal(result.listenersAfterUnmount, 0);
  assert.equal(result.timersAfterUnmount, 0);
});

async function executePage(source, environment) {
  const result = await build({
    stdin: {
      contents: source,
      loader: "tsx",
      resolveDir: path.join(SITE_ROOT, "app/game/chapter-1"),
      sourcefile: "page.tsx",
    },
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    plugins: [{
      name: "page-entry-mocks",
      setup(builder) {
        builder.onResolve({ filter: /^\.\/ChapterGameClient$/ }, () => ({ path: "chapter-client", namespace: "fixture" }));
        builder.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: "jsx-runtime", namespace: "fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          contents: args.path === "jsx-runtime"
            ? "export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx;"
            : "export default function ChapterGameClient() {}",
        }));
      },
    }],
  });
  const exports = {};
  const context = {
    exports,
    module: { exports },
    process: { env: environment },
    React: { createElement: (type, props) => ({ type, props }) },
    URL,
  };
  vm.runInNewContext(result.outputFiles[0].text, context);
  return context.module.exports.default();
}

test("installed page entrypoint validates before passing the iframe URL", async () => {
  const source = await readFile(path.join(SITE_ROOT, "app/game/chapter-1/page.tsx"), "utf8");
  const rendered = await executePage(source, {
    NODE_ENV: "production",
    DWARKA_WS_URL: "wss://game.dwarka.example/socket",
  });
  assert.equal(rendered.props.websocketUrl, "wss://game.dwarka.example/socket");
  await assert.rejects(
    executePage(source, { NODE_ENV: "production", DWARKA_WS_URL: "wss://127.0.0.2:3210" }),
    /DWARKA_WS_URL/,
  );

  const bypassed = source.replace(
    "configuredWebSocketUrl()",
    "process.env.DWARKA_WS_URL ?? null",
  );
  const negative = await executePage(bypassed, {
    NODE_ENV: "production",
    DWARKA_WS_URL: "wss://127.0.0.2:3210",
  });
  assert.equal(negative.props.websocketUrl, "wss://127.0.0.2:3210",
    "negative control must forward the invalid URL when the entrypoint bypasses validation");
});

const ENTRY_IMPORTS = new Map([
  ["./sim/shared.ts", ["ChapterSimulation", "CHAPTER_CONFIG"]],
  ["./net/session.js", ["safeWebSocketEndpoint", "installSession"]],
  ["./combat/targeting.js", ["angleDifference", "targetLineBlocked", "installTargeting"]],
  ["./scene/assets.js", ["assetUrl", "chapterAssetRevision"]],
  ["./ui/content.js", ["PHASE_DETAILS", "UI_MESSAGES"]],
  ["./character/animation.js", ["CHARACTER_ANIMATIONS", "animationSpeeds", "characterStateGraph", "installAnimation"]],
  ["./runtime/context.js", ["createRuntime", "loadWorld"]],
  ["./ui/hud.js", ["installHud"]],
  ["./ui/screenshot.js", ["installScreenshot"]],
  ["./ui/modals.js", ["installModals"]],
  ["./net/handshake.js", ["installHandshake"]],
  ["./scene/materials.js", ["installMaterials"]],
  ["./character/equipment.js", ["installEquipment"]],
  ["./combat/effects.js", ["installEffects"]],
  ["./scene/dressing.js", ["installDressing"]],
  ["./scene/doors.js", ["installDoors"]],
  ["./scene/build.js", ["installBuild"]],
  ["./runtime/loop.js", ["installLoop"]],
  ["./runtime/input.js", ["installInput"]],
  ["./runtime/qa.js", ["installQa"]],
]);

async function runBootstrapEntry(source) {
  const result = await build({
    stdin: {
      contents: source,
      loader: "js",
      resolveDir: path.join(WORKSPACE_ROOT, "game/client-scripts"),
      sourcefile: "chapter-1.js",
    },
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    plugins: [{
      name: "bootstrap-entry-mocks",
      setup(builder) {
        builder.onResolve({ filter: /^\.\// }, (args) => ({ path: args.path, namespace: "bootstrap-fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "bootstrap-fixture" }, (args) => {
          const names = ENTRY_IMPORTS.get(args.path);
          assert.ok(names, `missing bootstrap mock for ${args.path}`);
          const exports = names.map((name) => {
            if (name === "createRuntime") return "export const createRuntime = () => ({});";
            if (name === "loadWorld") return "export const loadWorld = () => Promise.reject(new Error('fixture load failure'));";
            if (/^[A-Z_]+$/.test(name)) return `export const ${name} = {};`;
            return `export const ${name} = () => undefined;`;
          });
          return { contents: exports.join("\n") };
        });
      },
    }],
  });
  const elements = new Map(
    ["modal", "modal-title", "modal-copy", "modal-primary", "modal-secondary"].map((id) => [id, {
      hidden: true,
      disabled: true,
      textContent: "",
      onclick: null,
      classList: { remove() {} },
      setAttribute() {},
    }]),
  );
  const windowObject = {
    location: { origin: "https://dwarka.example", reload() {}, assign() {} },
  };
  windowObject.parent = windowObject;
  const exports = {};
  vm.runInNewContext(result.outputFiles[0].text, {
    exports,
    module: { exports },
    document: { getElementById: (id) => elements.get(id) ?? null },
    window: windowObject,
    console: { error() {} },
    setTimeout,
    clearTimeout,
  });
  await new Promise((resolve) => setImmediate(resolve));
  return elements;
}

test("installed game entrypoint routes startup rejection to the fatal handler", async () => {
  const source = await readFile(path.join(WORKSPACE_ROOT, "game/client-scripts/chapter-1.js"), "utf8");
  const installed = await runBootstrapEntry(source);
  assert.equal(installed.get("modal").hidden, false);
  assert.match(installed.get("modal-primary").textContent, /retry/i);

  const uncaught = source.replace(
    "void startChapter().catch(reportFatalBootstrap);",
    "void startChapter().catch(() => undefined);",
  );
  const negative = await runBootstrapEntry(uncaught);
  assert.equal(negative.get("modal").hidden, true,
    "negative control must leave the fatal UI hidden when the catch callsite is removed");
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function captureScreenshot(filename) {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(path.join(EVIDENCE_DIR, filename), Buffer.from(result.data, "base64"));
}

async function loadStorageHelper(source) {
  const startMarker = "// PROFILE_STORAGE_HELPERS_START";
  const endMarker = "// PROFILE_STORAGE_HELPERS_END";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  assert.ok(start >= 0 && end > start, "profile storage helper markers are required for the diagnostic probe");
  const compiled = await transform(source.slice(start + startMarker.length, end), {
    loader: "ts",
    format: "cjs",
    target: "es2022",
  });
  const exports = {};
  const moduleRecord = { exports };
  vm.runInNewContext(compiled.code, { exports, module: moduleRecord, Map });
  return moduleRecord.exports;
}

function probeDurableRemoval(helper) {
  const values = new Map();
  const backend = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const first = helper.createProfileStorage(backend);
  const second = helper.createProfileStorage(backend);
  first.setItem("profile", "old-progress");
  first.getItem("profile");
  second.removeItem("profile");
  return { afterRemoteRemoval: first.getItem("profile"), durable: first.isDurable() };
}

async function loadProgressModule(source, deniedStorage) {
  const result = await build({
    stdin: {
      contents: source,
      loader: "ts",
      resolveDir: path.join(SITE_ROOT, "app/game/chapter-1"),
      sourcefile: "progress.ts",
    },
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    plugins: [{
      name: "progress-diagnostic-localization",
      setup(builder) {
        builder.onResolve({ filter: /^\.\/localization$/ }, () => ({ path: "localization", namespace: "fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: "export const isLocale = (value) => ['en','hi','ta','kn','te'].includes(value);",
        }));
      },
    }],
  });
  const exports = {};
  const context = {
    exports,
    module: { exports },
    localStorage: deniedStorage,
    BroadcastChannel: class { constructor() { throw new Error("channel denied"); } },
    crypto: { randomUUID: () => "diagnostic-player" },
  };
  vm.runInNewContext(result.outputFiles[0].text, context);
  return context.module.exports;
}

async function probeDeniedStorage(source) {
  const denied = {
    getItem() { throw new Error("storage denied"); },
    setItem() { throw new Error("storage denied"); },
    removeItem() { throw new Error("storage denied"); },
  };
  const progress = await loadProgressModule(source, denied);
  try {
    const initial = progress.readProfile();
    progress.updateSettings(initial, { locale: "kn", languageChosen: true });
    return {
      outcome: "completed",
      localeAfterReread: progress.readProfile().settings.locale,
      durable: progress.isProfileStorageDurable?.() ?? false,
    };
  } catch (error) {
    return { outcome: `threw: ${error.message}` };
  }
}

test("capture matched frontend defect evidence", { skip: !EVIDENCE_DIR }, async () => {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const currentProgressSource = await readFile(path.join(SITE_ROOT, "app/game/chapter-1/progress.ts"), "utf8");
  const currentPageSource = await readFile(path.join(SITE_ROOT, "app/game/chapter-1/page.tsx"), "utf8");
  const baselineProgressSource = execFileSync(
    "git",
    ["-C", SITE_ROOT, "show", `${SITE_BASELINE}:app/game/chapter-1/progress.ts`],
    { encoding: "utf8" },
  );
  const baselinePageSource = execFileSync(
    "git",
    ["-C", SITE_ROOT, "show", `${SITE_BASELINE}:app/game/chapter-1/page.tsx`],
    { encoding: "utf8" },
  );

  const skipBefore = await fixtureCall("prepareSkipEvidence", "baseline");
  await captureScreenshot("01-skip-deadline-before.png");
  const skipAfter = await fixtureCall("prepareSkipEvidence", "normal");
  await captureScreenshot("02-skip-deadline-after.png");

  const blurBefore = await fixtureCall("prepareBlurEvidence", "baseline");
  await captureScreenshot("03-blur-frame-before.png");
  const blurAfter = await fixtureCall("prepareBlurEvidence", "normal");
  await captureScreenshot("04-blur-frame-after.png");

  const iframeBefore = await fixtureCall("prepareIframeEvidence", "baseline");
  await captureScreenshot("05-iframe-timeout-before.png");
  const iframeAfter = await fixtureCall("prepareIframeEvidence", "normal");
  await captureScreenshot("06-iframe-timeout-after.png");

  const deniedBefore = await probeDeniedStorage(baselineProgressSource);
  const deniedAfter = await probeDeniedStorage(currentProgressSource);
  await fixtureCall("showDiagnostic", "Denied storage · reconstructed baseline", [
    { label: "Pinned site source", value: SITE_BASELINE, pass: false },
    { label: "Settings update", value: deniedBefore.outcome, pass: false },
  ]);
  await captureScreenshot("07-denied-storage-before-diagnostic.png");
  await fixtureCall("showDiagnostic", "Denied storage · repaired module", [
    { label: "Settings update", value: deniedAfter.outcome, pass: true },
    { label: "Locale after reread", value: deniedAfter.localeAfterReread, pass: deniedAfter.localeAfterReread === "kn" },
    { label: "Durable claim", value: String(deniedAfter.durable), pass: deniedAfter.durable === false },
  ]);
  await captureScreenshot("08-denied-storage-after-diagnostic.png");

  const reviewedBuggyProgress = currentProgressSource.replace(
    `if (value === null) {\n            memory.delete(key);\n            return null;\n          }\n          memory.set(key, value);\n          return value;`,
    `if (value !== null) memory.set(key, value);\n          return value ?? memory.get(key) ?? null;`,
  );
  assert.notEqual(reviewedBuggyProgress, currentProgressSource, "reviewed storage bug reconstruction must mutate the helper");
  const durableBefore = probeDurableRemoval(await loadStorageHelper(reviewedBuggyProgress));
  const durableAfter = probeDurableRemoval(await loadStorageHelper(currentProgressSource));
  await fixtureCall("showDiagnostic", "Durable null removal · frozen review candidate", [
    { label: "Reviewed source SHA-256", value: "6162cc7c845062a1c8f119c0873b095fb77fe41f6e73cd58662cd17c0d4950b5", pass: false },
    { label: "Value after remote removal", value: String(durableBefore.afterRemoteRemoval), pass: false },
  ]);
  await captureScreenshot("09-durable-null-before-diagnostic.png");
  await fixtureCall("showDiagnostic", "Durable null removal · repaired adapter", [
    { label: "Value after remote removal", value: String(durableAfter.afterRemoteRemoval), pass: durableAfter.afterRemoteRemoval === null },
    { label: "Backend remains durable", value: String(durableAfter.durable), pass: durableAfter.durable === true },
  ]);
  await captureScreenshot("10-durable-null-after-diagnostic.png");

  const endpointCases = [
    "wss://127.0.0.2:3210",
    "wss://[::127.0.0.1]:3210",
    "wss://preview.localhost.:3210",
    "wss://0.0.0.0:3210",
    "wss://[::]:3210",
  ];
  const acceptedBefore = [];
  const rejectedAfter = [];
  for (const endpoint of endpointCases) {
    const rendered = await executePage(baselinePageSource, { NODE_ENV: "production", DWARKA_WS_URL: endpoint });
    if (rendered.props.websocketUrl) acceptedBefore.push(endpoint);
    try {
      await executePage(currentPageSource, { NODE_ENV: "production", DWARKA_WS_URL: endpoint });
    } catch {
      rejectedAfter.push(endpoint);
    }
  }
  await fixtureCall("showDiagnostic", "Unsafe production endpoints · reconstructed baseline", [
    { label: "Pinned site source", value: SITE_BASELINE, pass: false },
    { label: "Accepted local-only endpoints", value: acceptedBefore.join("\n"), pass: false },
  ]);
  await captureScreenshot("11-endpoint-before-diagnostic.png");
  await fixtureCall("showDiagnostic", "Unsafe production endpoints · repaired page entry", [
    { label: "Rejected local-only endpoints", value: rejectedAfter.join("\n"), pass: rejectedAfter.length === endpointCases.length },
  ]);
  await captureScreenshot("12-endpoint-after-diagnostic.png");

  const common = {
    capturedAt: new Date().toISOString(),
    viewport: { width: 1280, height: 720, devicePixelRatio: 1 },
    fixtureUrl,
    rootBaseline: ROOT_BASELINE,
    siteBaseline: SITE_BASELINE,
    currentHashes: {
      cinematic: sha256(await readFile(path.join(SITE_ROOT, "app/ChapterZeroCinematic.tsx"))),
      gameClient: sha256(await readFile(path.join(SITE_ROOT, "app/game/chapter-1/ChapterGameClient.tsx"))),
      progress: sha256(currentProgressSource),
      page: sha256(currentPageSource),
      rootEntrypoint: sha256(await readFile(path.join(WORKSPACE_ROOT, "game/client-scripts/chapter-1.js"))),
      servedBundle: sha256(await readFile(path.join(SITE_ROOT, "public/playcanvas/chapter-1/chapter-1.js"))),
    },
    limitation: "Isolated ReactDOM fixture with mocked story assets and an inert same-origin iframe. It proves frontend lifecycle wiring, not combined PlayCanvas rendering or generated-bundle parity.",
  };
  await writeFile(path.join(EVIDENCE_DIR, "skip-blur-iframe-trace.json"), JSON.stringify({
    ...common,
    timingMs: { sourceDeadline: 80, frameInterval: 50, iframeDeadline: 80 },
    skip: { before: skipBefore, after: skipAfter },
    blur: { before: blurBefore, after: blurAfter },
    iframe: { before: iframeBefore, after: iframeAfter },
  }, null, 2));
  await writeFile(path.join(EVIDENCE_DIR, "storage-endpoint-diagnostics.json"), JSON.stringify({
    ...common,
    deniedStorage: { before: deniedBefore, after: deniedAfter },
    durableRemoval: { before: durableBefore, after: durableAfter },
    endpoint: { cases: endpointCases, acceptedBefore, rejectedAfter },
  }, null, 2));
});
