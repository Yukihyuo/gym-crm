import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

const hmrHost = process.env.VITE_HMR_HOST
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? Number(process.env.VITE_HMR_CLIENT_PORT)
  : undefined
const hmrProtocol = process.env.VITE_HMR_PROTOCOL as 'ws' | 'wss' | undefined
const useCustomHmr = Boolean(hmrHost || hmrClientPort || hmrProtocol)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5177,      
    strictPort: true,
    hmr: useCustomHmr
      ? {
          host: hmrHost,
          clientPort: hmrClientPort,
          protocol: hmrProtocol,
        }
      : undefined,
    allowedHosts: hmrHost ? [hmrHost, 'localhost', '127.0.0.1'] : true,
    watch: {
      usePolling: true, // Recomendado para Docker en Linux para detectar cambios de archivos
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})