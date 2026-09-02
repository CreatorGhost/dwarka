import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the Chapter 0 homepage and confirmed Chapter 1 entry", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Begin Chapter 0/);
  assert.match(html, /The Boy with the Paper Sun/);
  assert.match(html, /The confirmed direction/);
  assert.doesNotMatch(html, /player survives for three minutes/i);
});

test("preserves all four story routes and adds the game route", async () => {
  for (const route of ["/vrishaketu", "/emberborn", "/babhruvahana", "/abhimanyu", "/game/chapter-1"]) {
    const response = await render(route);
    assert.equal(response.status, 200, route);
  }
});

test("ships a local PlayCanvas export instead of a remote runtime", async () => {
  const [html, runtime, engine] = await Promise.all([
    readFile(new URL("../public/playcanvas/chapter-1/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/playcanvas/chapter-1/chapter-1.js", import.meta.url), "utf8"),
    readFile(new URL("../public/playcanvas/chapter-1/playcanvas.min.js", import.meta.url)),
  ]);
  assert.match(html, /playcanvas\.min\.js/);
  assert.ok(runtime.length > 80_000);
  assert.match(runtime, /Offline play/);
  assert.ok(engine.byteLength > 500_000);
});
