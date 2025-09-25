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
    proxy: {
      '/ws': {
        target: 'ws://localhost:4242',
        ws: true,
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // so "@/views/GameView" works
      "@src": path.resolve(__dirname, "../../../backend/src/modules/src"), // point to shared folder
    },
  },
});
