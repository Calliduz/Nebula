import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  if (mode === "production" && !env.VITE_SIGNING_SECRET) {
    throw new Error("BUILD FAILURE: VITE_SIGNING_SECRET environment variable is required.");
  }
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
    test: {
      // jsdom gives us localStorage, DOM APIs needed by both test files
      environment: "jsdom",
      include: ["src/test/**/*.test.ts", "src/test/**/*.test.tsx"],
      globals: false,
    },
  };
});
