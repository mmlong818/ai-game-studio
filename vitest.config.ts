import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["tests/browser/**", "node_modules/**", "dist/**"],
    css: true,
  },
});
