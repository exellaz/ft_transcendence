import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import http from 'http'

function getNgrokHost() {
  return new Promise<string>((resolve) => {
    http.get("http://127.0.0.1:4040/api/tunnels", (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          const tunnels = JSON.parse(data).tunnels
          const url = tunnels.find((t: any) => t.proto === "https")?.public_url
          if (url) {
            resolve(url.replace("https://", ""))
            return
          }
        } catch (e) {}
        resolve("localhost") // fallback
      })
    }).on("error", () => resolve("localhost"))
  })
}

export default defineConfig(async () => {
  const ngrokHost = await getNgrokHost()

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      allowedHosts: [ngrokHost],
      proxy: {
        '/api': {
          target: 'http://localhost:4242',
          changeOrigin: true,
          rewrite: (path: any) => path.replace(/^\/api/, ''),
        },
        '/ws': {
          target: 'ws://localhost:4242',
          ws: true,
          changeOrigin: true,
        },
        '/chat': {
          target: 'ws://localhost:4242',
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})

/**
 * to remote with different pc start
 * backend -> ngrok http 5173 -> frontend
*/