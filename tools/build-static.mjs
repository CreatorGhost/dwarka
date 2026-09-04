/** Emit a static site from the vinext production build.
 *
 *  The app is entirely client components, so every route renders the same way
 *  from a plain file server. This crawls the production server once per route,
 *  writes the HTML beside the already-static client assets, and leaves a
 *  directory any host can serve — which is how we get off ChatGPT Sites without
 *  rewriting the app away from the Next conventions it is built on.
 */
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { argv } from "node:process";

const ORIGIN = argv[2] ?? new URL(import.meta.url).searchParams.get("origin") ?? "http://localhost:4100";
const OUT = new URL("../dist-static/", import.meta.url);
const CLIENT = new URL("../dist/client/", import.meta.url);

// Every page.tsx under app/, which is the whole routable surface.
const ROUTES = ["/", "/game/chapter-1", "/vrishaketu", "/emberborn", "/babhruvahana", "/abhimanyu"];

async function main() {
  await cp(CLIENT, OUT, { recursive: true });
  // cleanUrls must stay off: it redirects /playcanvas/chapter-1/index.html to
  // /playcanvas/chapter-1, and the game's relative asset paths then resolve one
  // directory too high, so it loads with no CSS.
  await cp(new URL("vercel-static.json", import.meta.url), new URL("vercel.json", OUT));

  for (const route of ROUTES) {
    const response = await fetch(`${ORIGIN}${route}`, { headers: { "x-forwarded-proto": "https" } });
    if (!response.ok) throw new Error(`${route} returned ${response.status}`);
    const html = await response.text();
    if (!html.includes("<html")) throw new Error(`${route} did not return an HTML document`);
    const file = route === "/" ? new URL("index.html", OUT) : new URL(`.${route}/index.html`, OUT);
    await mkdir(new URL(".", file), { recursive: true });
    await writeFile(file, html);
    console.log(`${route.padEnd(18)} ${(html.length / 1024).toFixed(0)} KB`);
  }

  console.log("static root:", OUT.pathname, "|", (await readdir(OUT)).length, "entries");
}

await main();
