import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import http from "http"
import { Server } from "socket.io"

import "./src/config/db.config.js"
import "./src/services/Cronjobs.services.js"
import { initializeSocketListeners } from './src/utils/socket.utils.js';

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

global.io = io; // Hacer io accesible globalmente
initializeSocketListeners(io);


// Replicar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesPath = path.join(__dirname, 'src', 'routes');

app.use(cors({
  origin: "*"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Función asíncrona para cargar rutas
const loadRoutes = async () => {
  const files = fs.readdirSync(routesPath);
  console.log(files)
  for (const file of files) {
    if (file.endsWith('.js') && !file.startsWith('.')) {
      const filePath = path.join(routesPath, file);

      // Convertimos la ruta del sistema a una URL válida para import()
      const fileUrl = pathToFileURL(filePath).href;

      try {
        const { routeConfig } = await import(fileUrl);

        if (routeConfig?.path && routeConfig?.router) {
          app.use(routeConfig.path, routeConfig.router);
          console.log(`✅ Ruta cargada: ${routeConfig.path}`);
        } else {
          console.warn(`⚠️ ${file}: routeConfig no tiene path o router`);
        }
      } catch (error) {
        console.error(`❌ Error cargando ${file}:`, error.message);
        console.error(`   Stack:`, error.stack);
      }
    }
  }
};

// Ejecutamos la carga antes de iniciar el servidor
await loadRoutes();

app.get('/', (req, res) => {
  res.send('API is running');
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});