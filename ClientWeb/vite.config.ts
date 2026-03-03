import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,      
    port: 5177,      
    strictPort: true,
    // AGREGA ESTA SECCIÓN:
    hmr: {
      clientPort: 80, // O 443 si activas SSL en Nginx Proxy Manager
      host: 'web-client-yukihyuo.duckdns.org'
    },
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