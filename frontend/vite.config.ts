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
    // HTTPS disabled - NGINX handles SSL termination
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
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
});
