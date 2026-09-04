import { mkdir, writeFile } from "node:fs/promises";

const label = process.argv[2];
const names = {
  before: "01-before-arrival-1920x1080.png",
  imported: "02-imported-arrival-1920x1080.png",
  player: "03-player-ground-contact-1920x1080.png",
  door: "04-doorway-alignment-1920x1080.png",
  bow: "05-bow-aim-gameplay-1920x1080.png",
  seam: "06-seam-turn-view-1920x1080.png",
};
if (!names[label]) throw new Error("Unknown environment checkpoint capture label");
const vista = process.argv[3] || "arrival";

const endpoint = "http://127.0.0.1:9333";
const outputDir = new URL(
  "../tests/browser-artifacts/env-revamp-checkpoint/pass2/",
  import.meta.url,
);
const pageUrl =
  "http://127.0.0.1:3000/playcanvas/chapter-1/index.html?qa=1&ws=ws%3A%2F%2Flocalhost%3A3210";

const pages = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const target = pages.find((page) => page.type === "page");
if (!target) throw new Error("No Chromium page target found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;
const runtimeExceptions = [];

socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") runtimeExceptions.push(message.params);
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
const evaluate = (expression) =>
  send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

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
await send("Page.navigate", { url: pageUrl });
await wait(9000);
await evaluate('document.getElementById("modal-primary")?.click()');
await wait(2000);
const invoked = await evaluate(`window.__DWARKA_QA__?.previewVista(${JSON.stringify(vista)})`);
if (!invoked.result?.value) throw new Error(`Could not invoke ${vista} vista`);
if (label === "player")
  await evaluate('window.__DWARKA_QA__?.focusCharacter("Vrishaketu", 3.7, 180)');
if (label === "door") {
  await evaluate("window.__DWARKA_QA__?.setView(-1.9, -0.02)");
}
if (label === "bow") {
  await evaluate("window.__DWARKA_QA__?.setAim(true)");
  await evaluate('window.__DWARKA_QA__?.previewAnimation("Vrishaketu", "aim")');
  await evaluate('window.__DWARKA_QA__?.focusCharacter("Vrishaketu", 4, -120)');
}
if (label === "seam") await evaluate("window.__DWARKA_QA__?.setView(-1.1, -0.02)");
await wait(5000);
await evaluate('document.getElementById("reconnect")?.setAttribute("hidden", "")');

const screenshot = await send("Page.captureScreenshot", {
  format: "png",
  fromSurface: true,
  captureBeyondViewport: false,
});
await mkdir(outputDir, { recursive: true });
await writeFile(new URL(names[label], outputDir), Buffer.from(screenshot.data, "base64"));

const metrics = await evaluate(`({
  viewport: [innerWidth, innerHeight],
  dpr: devicePixelRatio,
  canvas: [
    document.getElementById("application-canvas")?.width,
    document.getElementById("application-canvas")?.height
  ],
  fps: Number(document.getElementById("fps-value")?.textContent),
  rendering: window.__DWARKA_QA__?.renderingSummary()
})`);
console.log(
  JSON.stringify({
    label,
    vista,
    file: new URL(names[label], outputDir).pathname,
    metrics: metrics.result?.value,
    runtimeExceptions: runtimeExceptions.length,
  }),
);
socket.close();
