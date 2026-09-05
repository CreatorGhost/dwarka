import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createServer } from "vite";

const SITE_ROOT = path.resolve(import.meta.dirname, "..");
const DIST_ROOT = path.join(SITE_ROOT, "dist-static");
const GAME_INDEX = path.join(SITE_ROOT, "public/playcanvas/chapter-1/index.html");
const SHELL_CSS = path.join(SITE_ROOT, "app/game/chapter-1/page.module.css");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

async function connectToChrome(port) {
  const endpoint = `http://127.0.0.1:${port}`;
  let target;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const pages = await fetch(`${endpoint}/json/list`).then((response) => response.json());
      target = pages.find((page) => page.type === "page");
      if (target) break;
    } catch {
      // Chrome's debugging endpoint rejects connections until startup completes.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(target, "headless Chrome did not expose a page");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return new CdpSession(socket);
}

async function waitFor(cdp, expression, message, attempts = 400) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await cdp.evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(message);
}

async function capture(cdp, targetPath) {
  if (!targetPath) return;
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, Buffer.from(screenshot.data, "base64"));
}

async function stopChrome(chrome) {
  if (chrome.exitCode !== null) return;
  const exited = new Promise((resolve) => chrome.once("exit", resolve));
  chrome.kill("SIGTERM");
  const timer = setTimeout(() => chrome.kill("SIGKILL"), 2_000);
  await exited;
  clearTimeout(timer);
}

test("the deployed Chapter 1 URL and desktop viewport matrix stay in bounds", { timeout: 60_000 }, async () => {
  const vercelConfig = JSON.parse(await readFile(path.join(SITE_ROOT, "tools/vercel-static.json"), "utf8"));
  assert.equal(
    vercelConfig.cleanUrls,
    false,
    "cleanUrls redirects index.html and makes the game resolve CSS and scripts one directory too high",
  );

  const gameHtml = await readFile(GAME_INDEX, "utf8");
  const shellCss = await readFile(SHELL_CSS, "utf8");
  const shellHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
    ${shellCss}
  </style></head><body><section class="shell"><iframe id="game-frame" class="frame"
    src="/playcanvas/chapter-1/index.html?qa&connection=unconfigured"></iframe></section></body></html>`;
  const sitePort = await freePort();
  const distPort = await freePort();
  const debugPort = await freePort();
  const chromeProfile = await mkdtemp(path.join(os.tmpdir(), "dwarka-viewport-"));
  const server = await createServer({
    configFile: false,
    root: SITE_ROOT,
    publicDir: path.join(SITE_ROOT, "public"),
    appType: "spa",
    logLevel: "error",
    plugins: [{
      name: "legacy-clean-url-reproduction",
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          const pathname = new URL(request.url, "http://fixture.invalid").pathname;
          if (pathname === "/__chapter-1-shell") {
            response.statusCode = 200;
            response.setHeader("content-type", "text/html; charset=utf-8");
            response.end(shellHtml);
            return;
          }
          if (pathname !== "/playcanvas/chapter-1") return next();
          response.statusCode = 200;
          response.setHeader("content-type", "text/html; charset=utf-8");
          response.end(gameHtml);
        });
      },
    }],
    server: { host: "127.0.0.1", port: sitePort, strictPort: true },
  });
  await server.listen();
  const distServer = await createServer({
    configFile: false,
    root: DIST_ROOT,
    publicDir: false,
    appType: "spa",
    logLevel: "error",
    server: { host: "127.0.0.1", port: distPort, strictPort: true },
  });
  await distServer.listen();
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${chromeProfile}`,
    "about:blank",
  ], { stdio: "ignore" });

  let cdp;
  try {
    cdp = await connectToChrome(debugPort);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Negative control: this is the extensionless URL Vercel produced when
    // cleanUrls was enabled. The real document loads, but all relative assets
    // resolve from /playcanvas/ instead of /playcanvas/chapter-1/.
    await cdp.send("Page.navigate", {
      url: `http://127.0.0.1:${sitePort}/playcanvas/chapter-1?connection=unconfigured`,
    });
    await waitFor(cdp, "Boolean(document.getElementById('application-canvas'))", "legacy URL did not render the game document");
    await cdp.evaluate("window.stop()");
    const broken = await cdp.evaluate(`({
      stylesheetHref: document.querySelector('link[rel="stylesheet"]')?.href,
      loadedCorrectStylesheet: Array.from(document.styleSheets).some(
        (sheet) => new URL(sheet.href).pathname === "/playcanvas/chapter-1/chapter-1.css"
      ),
      canvas: (() => {
        const rect = document.getElementById("application-canvas").getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })(),
      scrollHeight: document.documentElement.scrollHeight,
    })`);
    assert.equal(broken.loadedCorrectStylesheet, false, JSON.stringify(broken));
    assert.match(broken.stylesheetHref, /\/playcanvas\/chapter-1\.css$/);
    assert.notDeepEqual(broken.canvas, { width: 1920, height: 1080 });
    await capture(cdp, process.env.DWARKA_VIEWPORT_BEFORE);

    await cdp.send("Page.navigate", {
      url: `http://127.0.0.1:${sitePort}/playcanvas/chapter-1/index.html?qa&connection=unconfigured`,
    });
    await waitFor(
      cdp,
      "Boolean(window.__DWARKA_QA__?.previewCheckpoint && document.querySelector('#modal.story-beat'))",
      "the real game did not reach its first story beat",
    );
    const enteredGameplay = await cdp.evaluate(
      "window.__DWARKA_QA__.previewCheckpoint('arrival') && window.__DWARKA_QA__.beginPlay()",
    );
    assert.equal(enteredGameplay, true, "QA checkpoint could not enter gameplay");
    await waitFor(cdp, "!document.getElementById('hud').hidden", "the arrival gameplay HUD did not become visible");
    // Measuring only the overlays that happen to be visible would pass
    // vacuously for every HUD state this run never entered. Force each one on
    // with representative content so the matrix below measures all of them.
    const revealedOverlays = await cdp.evaluate(`(() => {
      const reveal = (id) => {
        const element = document.getElementById(id);
        if (element) element.hidden = false;
        return element;
      };
      for (const id of [
        "hud", "danger-card", "reticle", "waypoint-indicator", "interaction",
        "tutorial", "caption", "toast", "fps", "qa-overlay", "reconnect",
      ]) reveal(id);
      // Widest realistic content, so a text-sized overlay is measured at the
      // size it actually reaches in play rather than collapsed to zero.
      document.getElementById("reticle").dataset.targetLabel = "PALACE GUARD — LOCKED";
      document.getElementById("waypoint-indicator").classList.add("edge");
      document.getElementById("waypoint-distance").textContent = "148 M";
      document.getElementById("caption-speaker").textContent = "VRISHAKETU";
      document.getElementById("caption-text").textContent =
        "The charioteers' quarter is burning. Get to the gate before the second wave reaches the well.";
      document.getElementById("toast").textContent = "CHECKPOINT REACHED — THE CHARIOTEERS' QUARTER";
      document.getElementById("fps-value").textContent = "144";
      document.getElementById("qa-overlay").textContent = "draws 428 tris 1.24M frame 6.9ms heap 214MB";
      return Array.from(document.querySelectorAll("#game-ui *"))
        .filter((element) => element.id && !element.hidden).map((element) => element.id);
    })()`);
    assert.ok(revealedOverlays.includes("fps"), "the FPS readout was not revealed for measurement");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const viewports = [
      { width: 1920, height: 1080, dpr: 1 },
      { width: 1920, height: 937, dpr: 1 },
      { width: 1536, height: 864, dpr: 1.25 },
      { width: 1366, height: 768, dpr: 1.5 },
    ];
    const results = [];
    for (const viewport of viewports) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.dpr,
        mobile: false,
      });
      await cdp.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      const geometry = await cdp.evaluate(`(() => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return {
            left: Math.round(value.left),
            top: Math.round(value.top),
            right: Math.round(value.right),
            bottom: Math.round(value.bottom),
            width: Math.round(value.width),
            height: Math.round(value.height),
          };
        };
        const canvas = document.getElementById("application-canvas");
        // Every visible element in the overlay layer, not a hand-kept selector
        // list, so a child that escapes its parent's box is still measured.
        const bounds = Array.from(document.querySelectorAll("#game-ui, #game-ui *")).map((element) => ({
          selector: element.id ? "#" + element.id : element.tagName.toLowerCase() + "." + element.className,
          hidden: getComputedStyle(element).display === "none" || getComputedStyle(element).visibility === "hidden",
          ...rect(element),
        })).filter(({ hidden, width, height }) => !hidden && width > 0 && height > 0);
        return {
          viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
          scroll: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
          },
          stylesheetCount: document.styleSheets.length,
          canvas: { rect: rect(canvas), backing: { width: canvas.width, height: canvas.height } },
          ui: rect(document.getElementById("game-ui")),
          bounds,
        };
      })()`);
      const matrixDir = process.env.DWARKA_VIEWPORT_MATRIX_DIR;
      if (matrixDir) {
        await capture(cdp, path.join(
          matrixDir,
          `${viewport.width}x${viewport.height}-dpr${String(viewport.dpr).replace(".", "-")}.png`,
        ));
      }
      results.push(geometry);
    }
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await capture(cdp, process.env.DWARKA_VIEWPORT_AFTER);

    for (const geometry of results) {
      const { width, height, dpr } = geometry.viewport;
      assert.deepEqual(geometry.scroll, { width, height }, JSON.stringify(geometry));
      assert.ok(geometry.stylesheetCount > 0, "the fixed URL did not load the game stylesheet");
      assert.deepEqual(
        geometry.canvas.rect,
        { left: 0, top: 0, right: width, bottom: height, width, height },
      );
      assert.deepEqual(geometry.canvas.backing, { width, height }, `DPR ${dpr}: ${JSON.stringify(geometry.canvas)}`);
      assert.deepEqual(geometry.ui, geometry.canvas.rect);
      // An empty or shrunken overlay layer would make the bounds check below
      // pass while measuring nothing, which is how the first pass missed.
      assert.ok(
        geometry.bounds.length >= 40,
        `only ${geometry.bounds.length} overlay elements were visible to measure at ${width}x${height}`,
      );
      const overflow = geometry.bounds.filter((rect) =>
        rect.left < 0 || rect.top < 0 || rect.right > width || rect.bottom > height
      );
      assert.deepEqual(overflow, [], `${width}x${height} DPR ${dpr}: ${JSON.stringify(overflow)}`);
    }

    // Measure the iframe from the parent document as well. A perfect canvas
    // inside an oversized iframe would otherwise hide a shell-level overflow.
    await cdp.send("Page.navigate", {
      url: `http://127.0.0.1:${sitePort}/__chapter-1-shell?qa`,
    });
    await waitFor(
      cdp,
      "Boolean(document.getElementById('game-frame')?.contentWindow?.__DWARKA_QA__?.previewCheckpoint)",
      "the shell fixture did not load the real game iframe",
    );
    const shellEnteredGameplay = await cdp.evaluate(`(() => {
      const qa = document.getElementById("game-frame").contentWindow.__DWARKA_QA__;
      return qa.previewCheckpoint("arrival") && qa.beginPlay();
    })()`);
    assert.equal(shellEnteredGameplay, true, "the shell fixture could not enter gameplay");

    for (const viewport of viewports) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.dpr,
        mobile: false,
      });
      await cdp.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      const shellGeometry = await cdp.evaluate(`(() => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return {
            left: Math.round(value.left), top: Math.round(value.top),
            right: Math.round(value.right), bottom: Math.round(value.bottom),
            width: Math.round(value.width), height: Math.round(value.height),
          };
        };
        const frame = document.getElementById("game-frame");
        const child = frame.contentWindow;
        const childCanvas = frame.contentDocument.getElementById("application-canvas");
        return {
          parentViewport: { width: innerWidth, height: innerHeight },
          parentClient: {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight,
          },
          parentScroll: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
          },
          shell: rect(frame.parentElement),
          frame: rect(frame),
          childViewport: { width: child.innerWidth, height: child.innerHeight, dpr: child.devicePixelRatio },
          childCanvas: rect(childCanvas),
        };
      })()`);
      const expectedRect = {
        left: 0, top: 0, right: viewport.width, bottom: viewport.height,
        width: viewport.width, height: viewport.height,
      };
      assert.deepEqual(shellGeometry.parentViewport, { width: viewport.width, height: viewport.height });
      assert.deepEqual(shellGeometry.parentClient, shellGeometry.parentViewport);
      assert.deepEqual(shellGeometry.parentScroll, shellGeometry.parentViewport);
      assert.deepEqual(shellGeometry.shell, expectedRect);
      assert.deepEqual(shellGeometry.frame, expectedRect);
      assert.deepEqual(
        shellGeometry.childViewport,
        { width: viewport.width, height: viewport.height, dpr: viewport.dpr },
      );
      assert.deepEqual(shellGeometry.childCanvas, expectedRect);
    }

    // Repeat the parent-side measurement against the current built site, not
    // only the source CSS fixture. This catches transforms or sizing inherited
    // from the real application root and global stylesheet.
    await cdp.send("Page.navigate", {
      url: `http://127.0.0.1:${distPort}/game/chapter-1/index.html?qa`,
    });
    await waitFor(
      cdp,
      "Boolean(document.getElementById('game-frame')?.contentDocument?.getElementById('application-canvas'))",
      "the built Chapter 1 page did not load its game iframe",
    );
    for (const viewport of viewports) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.dpr,
        mobile: false,
      });
      await cdp.evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      const builtGeometry = await cdp.evaluate(`(() => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return {
            left: Math.round(value.left), top: Math.round(value.top),
            right: Math.round(value.right), bottom: Math.round(value.bottom),
            width: Math.round(value.width), height: Math.round(value.height),
          };
        };
        const frame = document.getElementById("game-frame");
        const child = frame.contentWindow;
        return {
          parentViewport: { width: innerWidth, height: innerHeight },
          parentClient: {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight,
          },
          parentScroll: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
          },
          shell: rect(frame.parentElement),
          frame: rect(frame),
          childViewport: { width: child.innerWidth, height: child.innerHeight, dpr: child.devicePixelRatio },
          childCanvas: rect(frame.contentDocument.getElementById("application-canvas")),
        };
      })()`);
      const expectedRect = {
        left: 0, top: 0, right: viewport.width, bottom: viewport.height,
        width: viewport.width, height: viewport.height,
      };
      assert.deepEqual(builtGeometry.parentViewport, { width: viewport.width, height: viewport.height });
      assert.deepEqual(builtGeometry.parentClient, builtGeometry.parentViewport);
      assert.deepEqual(builtGeometry.parentScroll, builtGeometry.parentViewport);
      assert.deepEqual(builtGeometry.shell, expectedRect);
      assert.deepEqual(builtGeometry.frame, expectedRect);
      assert.deepEqual(
        builtGeometry.childViewport,
        { width: viewport.width, height: viewport.height, dpr: viewport.dpr },
      );
      assert.deepEqual(builtGeometry.childCanvas, expectedRect);
      const builtMatrixDir = process.env.DWARKA_BUILT_SHELL_MATRIX_DIR;
      if (builtMatrixDir) {
        await capture(cdp, path.join(
          builtMatrixDir,
          `${viewport.width}x${viewport.height}-dpr${String(viewport.dpr).replace(".", "-")}.png`,
        ));
      }
    }
  } finally {
    cdp?.close();
    await stopChrome(chrome);
    await server.close();
    await distServer.close();
    await rm(chromeProfile, { recursive: true, force: true });
  }
});
