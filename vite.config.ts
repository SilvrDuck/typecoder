import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // Build/dev base path. Defaults to '/' for local dev. CI sets
  // PUBLIC_BASE_PATH=/typecoder/ so GitHub Pages serves correctly at
  // https://silvrduck.github.io/typecoder/.
  base: process.env.PUBLIC_BASE_PATH ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
