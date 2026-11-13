import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "../camflea-test/setup.ts")],
    include: ["../camflea-test/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@testing-library/jest-dom/vitest": path.resolve(
        __dirname,
        "./node_modules/@testing-library/jest-dom/vitest.js",
      ),
      "@testing-library/react": path.resolve(__dirname, "./node_modules/@testing-library/react"),
      "@tanstack/react-query": path.resolve(__dirname, "./node_modules/@tanstack/react-query"),
      "@tanstack/react-router": path.resolve(__dirname, "./node_modules/@tanstack/react-router"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
});
