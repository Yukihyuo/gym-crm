import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,      // Escucha en todas las interfaces de red (necesario para Docker)
    port: 5177,      // Fija el puerto para que sea predecible
    strictPort: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
