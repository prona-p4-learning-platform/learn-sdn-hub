import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["monaco-editor", "vscode"],
  },
  optimizeDeps: {
    needsInterop: [
      "monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp.js",
      "monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js",
    ],
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ["monaco-editor"],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      "^/api/.*": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "^/ws/.*": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
});
