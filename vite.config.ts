import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "webview",
  plugins: [react()],
  build: {
    outDir: "../media/webview",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        chunkFileNames: "index-[hash].js",
        assetFileNames: "index.css"
      }
    }
  }
});
