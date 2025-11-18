// usePolling: true fixes file system event monitoring in WSL,
// notifying Vite to refresh the view when there are changes to the codebase.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://localhost:4242",
        ws: true,
        changeOrigin: true,
      },
    },
    fs: {
      allow: [".."], // allow Vite to access ../shared
    },
    watch: {
      usePolling: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // so "@/views/GameView" works
      "@shared": path.resolve(__dirname, "../shared"), // 👈 add this
    },
  },
});
