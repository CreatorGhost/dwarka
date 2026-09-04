/** Start the vinext production server, prerender every route, stop it.
 *
 *  Wraps tools/build-static.mjs so `npm run build:static` produces dist-static/
 *  in one step, on a build machine with nothing already listening.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = process.env.PRERENDER_PORT ?? "4100";
const ORIGIN = `http://127.0.0.1:${PORT}`;

const server = spawn("npx", ["vinext", "start", "-p", PORT], {
  stdio: ["ignore", "inherit", "inherit"],
  env: { ...process.env, PORT },
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(ORIGIN, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await sleep(1_000);
  }
  throw new Error(`production server did not come up on ${ORIGIN}`);
}

try {
  await waitForServer();
  const { default: prerender } = await import("./build-static.mjs?origin=" + encodeURIComponent(ORIGIN));
  void prerender;
} finally {
  server.kill("SIGTERM");
}
