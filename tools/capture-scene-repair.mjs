import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, readdir, mkdir, mkdtemp, rm, writeFile, access } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const SITE_ROOT = path.resolve(import.meta.dirname, "..");
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
    this.events = [];
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) {this.events.push(message);return;}
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


const profile=await mkdtemp(path.join(os.tmpdir(),'dwarka-scene-capture-'));
const port=await freePort();
const output=path.resolve(process.argv[2] || 'tests/browser-artifacts/scene-repair/root-pass1');
const chrome=spawn(CHROME,['--headless=new','--disable-extensions','--no-first-run',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let cdp;
try {
 cdp=await connectToChrome(port);
 await cdp.send('Runtime.enable');
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1728,height:962,deviceScaleFactor:1,mobile:false});
 await cdp.send('Page.navigate',{url:process.argv[3] || 'http://127.0.0.1:4173/playcanvas/chapter-1/index.html?qa&connection=unconfigured'});
 await waitFor(cdp,"Boolean(window.__DWARKA_QA__?.previewVista && document.querySelector('#modal.story-beat'))",'game bootstrap failed');
 await new Promise(r=>setTimeout(r,3000));
 const evidence=[];
 if(process.argv[4]==='no-batching') await cdp.evaluate('pc.Application.getApplication().root.findComponents("render").forEach(r=>{r.batchGroupId=-1})');
 else if(process.argv[4]) await cdp.evaluate(`window.__DWARKA_QA__.applyPerformanceProbe(${JSON.stringify(process.argv[4])})`);
 for(const vista of ['arrival','alley-climb','market-fight','burning-lane','gate','doorway-ending']) {
  assert.equal(await cdp.evaluate(`window.__DWARKA_QA__.previewVista('${vista}')`),true);
  await new Promise(r=>setTimeout(r,1700));
  const url=await cdp.evaluate('window.__DWARKA_QA__.captureFrameDataUrl()');
  await mkdir(output,{recursive:true});await writeFile(path.join(output,vista+'.png'),Buffer.from(url.split(',')[1],'base64'));
  evidence.push({vista, diagnostics:await cdp.evaluate(`(() => {const app=pc.Application.getApplication();return {fx:__DWARKA_QA__.environmentFxSummary(),stats:__DWARKA_QA__.renderingSummary(),well:app.root.find(e=>/^Well (timber|lifting)/.test(e.name)).map(e=>({name:e.name,enabled:e.enabled,position:e.getPosition(),scale:e.getLocalScale(),batch:e.render.batchGroupId,visible:e.render.meshInstances.map(m=>({visible:m.visible,shader:m.material.name}))}))}})()`),rendering:await cdp.evaluate('window.__DWARKA_QA__.renderingContractAssertion()'),doors:await cdp.evaluate('window.__DWARKA_QA__.doorContractAssertion()')});
 }
 const route=await cdp.evaluate('window.__DWARKA_QA__.routeTraversalAudit()');
 await writeFile(path.join(output,'evidence.json'),JSON.stringify({evidence,route,errors:cdp.events.filter(e=>e.method==="Runtime.exceptionThrown" || (e.method==="Runtime.consoleAPICalled" && e.params.type==="error"))},null,2));
 console.log(JSON.stringify({output,route,views:evidence.map(e=>({vista:e.vista,rendering:e.rendering?.passed,doors:e.doors?.passed}))}));
} finally {cdp?.close();await stopChrome(chrome);await rm(profile,{recursive:true,force:true});}
