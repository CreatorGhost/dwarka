import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

import { unexpectedHttpResponses } from "./runtime-http-policy.mjs";

const endpoint = "http://127.0.0.1:9333";
const pageUrl =
  "http://127.0.0.1:3000/playcanvas/chapter-1/index.html?qa=1&ws=ws%3A%2F%2Flocalhost%3A3210";
const pages = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const target = pages.find((page) => page.type === "page");
if (!target) throw new Error("No Chromium page target found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;
let currentRun = -1;
const runEvents = Array.from({ length: 3 }, () => ({
  exceptions: [],
  failures: [],
  responses: [],
  assets: new Map(),
  textures: new Map(),
}));

socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
    return;
  }
  if (currentRun < 0 || currentRun >= runEvents.length) return;
  const events = runEvents[currentRun];
  if (message.method === "Runtime.exceptionThrown") events.exceptions.push(message.params);
  if (message.method === "Network.loadingFailed") events.failures.push(message.params);
  if (message.method === "Network.responseReceived") {
    const response = message.params.response;
    events.responses.push({
      url: response.url,
      status: response.status,
      type: message.params.type,
    });
    if (response.url.includes("/assets/models/env-revamp/"))
      events.assets.set(response.url.split("/").pop(), response.status);
    if (
      response.url.includes("/assets/textures/painted_plaster_wall_diff_512.webp") ||
      response.url.includes("/assets/textures/sandstone_cracks_diff_512.webp")
    )
      events.textures.set(response.url.split("/").pop().split("?")[0], response.status);
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result?.value;
};
async function waitFor(expression, timeout = 20_000) {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (await evaluate(expression)) return performance.now() - start;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}
async function key(code, type = "keyDown", modifiers = 0) {
  await send("Input.dispatchKeyEvent", {
    type,
    code,
    key: code.replace(/^Key/, "").replace("Left", ""),
    windowsVirtualKeyCode: code.startsWith("Key") ? code.charCodeAt(3) : 0,
    modifiers,
  });
}
async function mouse(type, button) {
  await send("Input.dispatchMouseEvent", {
    type,
    button,
    x: 960,
    y: 540,
    clickCount: type === "mousePressed" ? 1 : 0,
  });
}

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
});

const coldLoads = [];
for (let run = 0; run < 3; run += 1) {
  currentRun = run;
  await send("Network.clearBrowserCache");
  const started = performance.now();
  await send("Page.navigate", { url: `${pageUrl}&cold=${run}-${Date.now()}` });
  await waitFor("window.__DWARKA_QA__?.renderingSummary()?.revampEntities?.length === 18");
  const readyMs = Math.round(performance.now() - started);
  await wait(4_500);
  const summary = await evaluate(`({
    canvas: window.__DWARKA_QA__.renderingSummary().canvas,
    renderScale: window.__DWARKA_QA__.renderingSummary().renderScale,
    fps: Number(document.getElementById("fps-value")?.textContent),
    drawCalls: window.__DWARKA_QA__.renderingSummary().drawCalls,
    shadowDrawCalls: window.__DWARKA_QA__.renderingSummary().shadowDrawCalls,
    drawCallStats: window.__DWARKA_QA__.renderingSummary().drawCallStats,
    batchCount: window.__DWARKA_QA__.renderingSummary().batchCount,
    batchedModelRenders: window.__DWARKA_QA__.environmentFxSummary().batchedModelRenders
  })`);
  const events = runEvents[run];
  const httpErrors = unexpectedHttpResponses(events.responses, {
    pageOrigin: new URL(pageUrl).origin,
  });
  coldLoads.push({
    run: run + 1,
    readyMs,
    ...summary,
    assets: Object.fromEntries([...events.assets].sort()),
    textures: Object.fromEntries([...events.textures].sort()),
    runtimeExceptions: events.exceptions.length,
    networkFailures: events.failures.length,
    httpErrors,
  });
}

console.log(JSON.stringify({ coldLoads }, null, 2));
assert.ok(coldLoads.every((load) => load.canvas.join("x") === "1920x1080"));
assert.ok(coldLoads.every((load) => load.renderScale === 1));
assert.ok(coldLoads.every((load) => load.fps >= 45));
assert.ok(coldLoads.every((load) => load.drawCalls <= 400));
assert.ok(coldLoads.every((load) => Object.keys(load.assets).length === 6));
assert.ok(coldLoads.every((load) => Object.values(load.assets).every((status) => status === 200)));
assert.ok(coldLoads.every((load) => Object.keys(load.textures).length === 2));
assert.ok(coldLoads.every((load) => Object.values(load.textures).every((status) => status === 200)));
assert.ok(coldLoads.every((load) => load.runtimeExceptions === 0));
assert.ok(coldLoads.every((load) => load.networkFailures === 0));
assert.ok(coldLoads.every((load) => load.httpErrors.length === 0));

const contracts = await evaluate(`({
  route: window.__DWARKA_QA__.routeContractAssertion(),
  traversal: window.__DWARKA_QA__.routeTraversalAudit(),
  doors: window.__DWARKA_QA__.doorContractAssertion(),
  rendering: window.__DWARKA_QA__.renderingContractAssertion()
})`);
assert.equal(contracts.route.passed, true);
assert.equal(contracts.traversal.passed, true);
assert.equal(contracts.doors.passed, true);
assert.equal(contracts.rendering.passed, true);

const regionPass = [];
for (const vista of [
  "arrival",
  "well-square",
  "courtyard-fight",
  "alley-climb",
  "market-fight",
  "burning-lane",
  "gate",
  "doorway-ending",
]) {
  assert.equal(await evaluate(`window.__DWARKA_QA__.playVista(${JSON.stringify(vista)})`), true);
  await wait(1200);
  const before = await evaluate("window.__DWARKA_QA__.routeRuntimeSummary()");
  await key("KeyW");
  await wait(450);
  await key("KeyW", "keyUp");
  await wait(250);
  const after = await evaluate(`({
    runtime: window.__DWARKA_QA__.routeRuntimeSummary(),
    rendering: {
      fps: Number(document.getElementById("fps-value")?.textContent),
      renderScale: window.__DWARKA_QA__.renderingSummary().renderScale,
      drawCalls: window.__DWARKA_QA__.renderingSummary().drawCalls,
      batchCount: window.__DWARKA_QA__.renderingSummary().batchCount,
      batchedModelRenders: window.__DWARKA_QA__.environmentFxSummary().batchedModelRenders
    }
  })`);
  const movement = before.player && after.runtime.player
    ? Math.hypot(
        after.runtime.player.x - before.player.x,
        after.runtime.player.z - before.player.z,
      )
    : 0;
  regionPass.push({ vista, before, after, movement: Number(movement.toFixed(3)) });
}
console.log(
  JSON.stringify({
    regionMetrics: regionPass.map(({ vista, after, movement }) => ({
      vista,
      fps: after.rendering.fps,
      drawCalls: after.rendering.drawCalls,
      renderScale: after.rendering.renderScale,
      batchCount: after.rendering.batchCount,
      floorError: after.runtime.floorError,
      movement,
    })),
  }),
);
assert.ok(regionPass.every(({ after }) => after.rendering.fps >= 45));
assert.ok(regionPass.every(({ after }) => after.rendering.renderScale === 1));
assert.ok(regionPass.every(({ after }) => after.rendering.drawCalls <= 400));
assert.ok(regionPass.every(({ after }) => after.runtime.floorError <= 0.05));
assert.ok(regionPass.every(({ after }) => after.runtime.objectiveVisible));

const finalHttpErrors = unexpectedHttpResponses(runEvents.at(-1).responses, {
  pageOrigin: new URL(pageUrl).origin,
});
assert.equal(finalHttpErrors.length, 0);

assert.equal(
  await evaluate('window.__DWARKA_QA__.playVista("arrival")'),
  true,
  "could not start the playable arrival vista",
);
const start = await evaluate("window.__DWARKA_QA__.playerPosition()");
await key("KeyW");
await wait(1200);
await key("KeyW", "keyUp");
const walk = await evaluate("window.__DWARKA_QA__.playerPosition()");
await key("ShiftLeft");
await key("KeyW", "keyDown", 8);
await wait(900);
await key("KeyW", "keyUp", 8);
await key("ShiftLeft", "keyUp");
const sprint = await evaluate("window.__DWARKA_QA__.playerPosition()");
await key("Space");
await key("Space", "keyUp");
await wait(180);
const dodge = await evaluate("window.__DWARKA_QA__.animationSummary()");
await wait(800);
await mouse("mousePressed", "left");
await mouse("mouseReleased", "left");
await wait(180);
const melee = await evaluate("window.__DWARKA_QA__.animationSummary()");
await mouse("mousePressed", "right");
await wait(250);
const aim = await evaluate("window.__DWARKA_QA__.inputState()");
await mouse("mousePressed", "left");
await mouse("mouseReleased", "left");
await wait(180);
const fire = await evaluate("window.__DWARKA_QA__.inputState()");
await mouse("mouseReleased", "right");
const contact = await evaluate("window.__DWARKA_QA__.locomotionSample()");

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
assert.ok(distance(start, walk) > 0.5, "walk input did not move the player");
assert.ok(distance(walk, sprint) > 0.5, "sprint input did not move the player");
assert.ok(contact.root.y > 0 && contact.root.y < 0.2, "player left the ground");
assert.equal(aim.aim, true);
assert.equal(dodge.roots.find(({ name }) => name === "Vrishaketu")?.activeState, "dodge");
assert.equal(melee.roots.find(({ name }) => name === "Vrishaketu")?.activeState, "melee");

const report = {
  coldLoads,
  contracts,
  regionPass,
  finalHttpErrors,
  traversal: {
    start,
    walk,
    sprint,
    walkDistance: distance(start, walk),
    sprintDistance: distance(walk, sprint),
    dodge: dodge.roots.find(({ name }) => name === "Vrishaketu"),
    melee: melee.roots.find(({ name }) => name === "Vrishaketu"),
    aim,
    fire,
    contact,
  },
};
const outputUrl = new URL(
  "../tests/browser-artifacts/env-revamp-checkpoint/pass2/runtime-audit.json",
  import.meta.url,
);
await mkdir(new URL(".", outputUrl), { recursive: true });
await writeFile(outputUrl, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
socket.close();
