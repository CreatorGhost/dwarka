import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const source = fileURLToPath(new URL("../game/client-scripts/chapter-1.js", import.meta.url));
const output = fileURLToPath(new URL("./public/playcanvas/chapter-1", import.meta.url));

export default defineConfig({
  publicDir: false,
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
