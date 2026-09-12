import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 边玩边改页面的 /api/image-generation、/api/previews、/api/releases 曾只在此处以开发中间件实现，
// 正式部署时全部 404。现统一由 src/server/player-first-hosting.ts 提供；这里只做代理。
export default defineConfig(() => {
  return {
    plugins: [react()],
    build: {
      outDir: "dist-web",
      emptyOutDir: true,
    },
    server: {
      host: "0.0.0.0",
      port: 4311,
      strictPort: false,
      proxy: {
        "/api": "http://127.0.0.1:4312",
        "/media": "http://127.0.0.1:4312",
        "/generated": "http://127.0.0.1:4312",
        "/__game": {
          target: "http://127.0.0.1:4313",
          rewrite: (path) => path.replace(/^\/__game/, ""),
        },
      },
    },
    preview: {
      port: 4311,
    },
  };
});
