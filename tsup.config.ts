import { defineConfig } from "tsup";

export default defineConfig({
  format: ["esm"],
  platform: "node",
  dts: true,
  splitting: false,
  clean: true,
  entry: ["src/index.ts"],
  external: ["tsx", "esbuild"],
});
