// usePolling: true fixes file system event monitoring in WSL,
// notifying Vite to refresh the view when there are changes to the codebase.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

const domainName = process.env.DOMAIN_NAME || "localhost";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    https: {
      key: fs.readFileSync(path.join("/app/certs", `${domainName}.key`)),
      cert: fs.readFileSync(path.join("/app/certs", `${domainName}.crt`)),
    },
    proxy: {
      "/ws": {
        target: "wss://localhost:4242",
        ws: true,
        changeOrigin: true,
        secure: false,
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
