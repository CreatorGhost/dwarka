import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const source = fileURLToPath(new URL("../game/client-scripts/chapter-1.js", import.meta.url));
const output = fileURLToPath(new URL("./public/playcanvas/chapter-1", import.meta.url));
const assets = fileURLToPath(new URL("./public/playcanvas/chapter-1/assets", import.meta.url));

function hashAssetTree(directory, hash = createHash("sha256"), prefix = "") {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) hashAssetTree(`${directory}/${entry.name}`, hash, `${relative}/`);
    else if (entry.isFile()) { hash.update(relative); hash.update(readFileSync(`${directory}/${entry.name}`)); }
  }
  return hash;
}

const assetRevision = hashAssetTree(assets).digest("hex").slice(0, 16);

export default defineConfig({
  publicDir: false,
  define: { __CHAPTER_ASSET_REVISION__: JSON.stringify(assetRevision) },
  build: {
    emptyOutDir: false,
    outDir: output,
    rollupOptions: {
      input: source,
      output: {
        entryFileNames: "chapter-1.js",
        format: "es",
      },
    },
    target: "es2022",
  },
});
