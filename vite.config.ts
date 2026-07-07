import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (
                id.includes("react-router-dom") ||
                id.includes("react-router") ||
                id.includes("@remix-run")
              ) {
                return "react-router";
              }
              if (id.includes("artplayer") || id.includes("hls.js")) {
                return "player-libs";
              }
              if (id.includes("@google/genai")) {
                return "google-genai";
              }
              if (id.includes("motion") || id.includes("@motion")) {
                return "motion";
              }
              if (
                id.includes("react") ||
                id.includes("react-dom") ||
                id.includes("scheduler")
              ) {
                return "react-core";
              }
              return "vendor";
            }
          },
        },
      },
    },
    test: {
      // jsdom gives us localStorage, DOM APIs needed by both test files
      environment: "jsdom",
      include: ["src/test/**/*.test.ts", "src/test/**/*.test.tsx"],
      globals: false,
    },
  };
});
