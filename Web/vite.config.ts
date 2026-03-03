import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,      
    port: 5176,      
    strictPort: true,
    // Configuración para Proxy Inverso (NPM)
    hmr: {
      host: 'web-yukihyuo.duckdns.org',
      clientPort: 80, // Cambiar a 443 si activas SSL/HTTPS en NPM
    },
    allowedHosts: ['web-yukihyuo.duckdns.org'], // Permite que el proxy acceda
    watch: {
      usePolling: true, // Útil en Docker para detectar cambios de archivos
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})