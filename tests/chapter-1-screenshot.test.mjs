import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, readdir, mkdir, mkdtemp, rm, writeFile, access } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createServer } from "vite";
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


test('P and pause-menu screenshots download nonblank PNGs and never resume on focus', { timeout: 90_000 }, async (t) => {
 try { await access(CHROME); } catch { t.skip('Chrome is required for WebGL capture verification'); return; }
 const server=await createServer({configFile:false,root:SITE_ROOT,logLevel:'error',server:{host:'127.0.0.1',port:0},appType:'custom'});
 await server.listen();
 const debugPort=await freePort();
 const profile=await mkdtemp(path.join(os.tmpdir(),'dwarka-screenshot-test-'));
 const downloads=path.join(profile,'downloads'); await mkdir(downloads);
 const chrome=spawn(CHROME,['--headless=new','--disable-extensions','--disable-background-networking','--no-first-run',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 let cdp;
 try {
  cdp=await connectToChrome(debugPort);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
  await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await cdp.send('Page.navigate',{url:`http://127.0.0.1:${server.httpServer.address().port}/playcanvas/chapter-1/index.html?qa&connection=unconfigured`});
  await waitFor(cdp,"Boolean(window.__DWARKA_QA__?.playVista && document.querySelector('#modal.story-beat'))",'game bootstrap failed');
  assert.equal(await cdp.evaluate("window.__DWARKA_QA__.playVista('doorway-ending')"), true);
  await waitFor(cdp,"window.__DWARKA_QA__.animationSummary().roots.some(root => root.upgraded)",'character assets did not load');
  await cdp.send('Page.bringToFront');
  await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:650,y:400,button:'left',clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:650,y:400,button:'left',clickCount:1});
  const pointerRequest=await cdp.send('Runtime.evaluate',{expression:"document.querySelector('canvas').requestPointerLock()",userGesture:true,awaitPromise:false});
  assert.ok(!pointerRequest.exceptionDetails, 'pointer lock request must succeed');
  const locked=await cdp.evaluate('document.pointerLockElement === document.querySelector("canvas")');
  assert.equal(locked,true,'test must begin with captured mouse');
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyP',key:'p'});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyP',key:'p'});
  await waitFor(cdp,"document.querySelector('#screenshot-download').hasAttribute('href')",'capture did not produce a PNG');
  assert.deepEqual(await cdp.evaluate('({playing:window.__DWARKA_QA__.inputState().playing,paused:window.__DWARKA_QA__.inputState().paused,locked:!!document.pointerLockElement})'),{playing:false,paused:true,locked:false});
  const image=await cdp.evaluate(`(async()=>{
   const blob=await (await fetch(document.querySelector('#screenshot-download').href)).blob();
   const bitmap=await createImageBitmap(blob); const canvas=document.createElement('canvas');canvas.width=64;canvas.height=36;
   const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,64,36);const pixels=ctx.getImageData(0,0,64,36).data;
   const colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(Array.from(pixels.slice(i,i+4)).join(','));
   return {width:bitmap.width,height:bitmap.height,type:blob.type,size:blob.size,colors:colors.size,filename:document.querySelector('#screenshot-download').download};
  })()`);
  assert.equal(image.width,1366);assert.equal(image.height,768);assert.equal(image.type,'image/png');assert.ok(image.colors>100,'image must contain a rendered scene');assert.ok(image.size>10000);
  for(let i=0;i<60 && !(await readdir(downloads)).includes(image.filename);i++) await new Promise(r=>setTimeout(r,50));
  const png=await readFile(path.join(downloads,image.filename));assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),1366);assert.equal(png.readUInt32BE(20),768);
  const position=await cdp.evaluate('window.__DWARKA_QA__.playerPosition()');
  await cdp.evaluate("window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('pointerlockchange'));document.dispatchEvent(new Event('visibilitychange'))");
  await new Promise(r=>setTimeout(r,250));
  assert.deepEqual(await cdp.evaluate('window.__DWARKA_QA__.playerPosition()'),position);
  assert.equal(await cdp.evaluate('window.__DWARKA_QA__.inputState().playing'),false);
  const oldUrl=await cdp.evaluate("document.querySelector('#screenshot-download').href");
  await cdp.evaluate("document.querySelector('#pause-screenshot').click()");
  await waitFor(cdp,`document.querySelector('#screenshot-download').href !== ${JSON.stringify(oldUrl)} && !document.querySelector('#screenshot-download').hidden`,'pause-menu capture failed');
  assert.equal(await cdp.evaluate('window.__DWARKA_QA__.inputState().paused'),true);
  await cdp.evaluate("document.querySelector('#modal-primary').click()");
  assert.equal(await cdp.evaluate('window.__DWARKA_QA__.inputState().playing'),true);
  // HUD button is wired independently of the pause-menu control.
  await cdp.evaluate("document.querySelector('#screenshot-button').click()");
  await waitFor(cdp,"!document.querySelector('#screenshot-download').hidden && !document.querySelector('#pause-screenshot').disabled",'HUD screenshot failed');
  assert.equal(await cdp.evaluate('window.__DWARKA_QA__.inputState().paused'),true);
  t.diagnostic(JSON.stringify(image));
  if(process.env.DWARKA_SCREENSHOT_EVIDENCE) {
   await mkdir(process.env.DWARKA_SCREENSHOT_EVIDENCE,{recursive:true});
   await writeFile(path.join(process.env.DWARKA_SCREENSHOT_EVIDENCE,'captured-doorway.png'),png);
   await capture(cdp,path.join(process.env.DWARKA_SCREENSHOT_EVIDENCE,'pause-after-capture.png'));
  }
 } finally { cdp?.close();await stopChrome(chrome);await server.close();await rm(profile,{recursive:true,force:true}); }
});
