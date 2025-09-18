import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["cjs"],
  platform: "node",
  target: "node18",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  splitting: false,
});
