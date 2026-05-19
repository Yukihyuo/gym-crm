import express from 'express';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import Terminal from '../models/Terminal.js';
import PendingData from '../models/PendingData.js';
import fs from 'fs';

async function generateUniqueCode() {
  let code;
  let exists = true;
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    // Verificamos que el código no esté en uso actualmente en la colección de pendientes
    const duplicate = await PendingData.findOne({ value: code });
    if (!duplicate) exists = false;
  }
  return code;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

router.get('/download-biometric', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../dist/biometrico.zip');
    console.log("Petición recibida para la ruta:", filePath);

    // VALIDACIÓN CRÍTICA
    if (!fs.existsSync(filePath)) {
      console.error("¡EL ARCHIVO NO EXISTE EN ESA RUTA!");
      return res.status(404).json({ error: "El instalador biométrico no se encuentra en el servidor." });
    }

    const stats = fs.statSync(filePath);
    console.log(`Tamaño real del archivo en disco: ${stats.size} bytes`);

    if (stats.size === 0) {
      console.error("¡El archivo existe pero está completamente vacío (0 bytes)!");
      return res.status(500).json({ error: "El archivo está corrupto o vacío en el servidor." });
    }
    res.setHeader('X-Accel-Buffering', 'no');
    res.download(filePath, 'biometrico.exe', (err) => {
      if (err) {
        console.error("Error durante la descarga:", err);
      } else {
        console.log("Descarga completada con éxito por el cliente.");

      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/actual-version', (req, res) => {
  try {
    res.status(200).json({ latest_version: '1.0.5', download_url: 'https://api.nexay.fit//v1/terminals/download-biometric' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

// Crear terminal
router.post('/create', async (req, res) => {
  try {
    const { name } = req.body;
    const storeId = req.headers['x-store-id'] || req.body.storeId;

    if (!name?.trim()) {
      return res.status(400).json({
        message: 'El nombre de la terminal es requerido'
      });
    }

    if (!storeId) {
      return res.status(400).json({
        message: 'No se encontró la tienda activa para crear la terminal'
      });
    }

    const uniqueCode = await generateUniqueCode();

    const terminal = await Terminal.create({
      uuid: `pending-${randomUUID()}`,
      storeId,
      name: name.trim(),
      isLinked: false
    });

    await PendingData.create({
      type: 'LinkTerminal',
      sourceId: terminal._id,
      value: uniqueCode
    });

    res.status(201).json({
      message: 'Terminal creada exitosamente',
      terminal,
      uniqueCode
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al crear terminal',
      error: error.message
    });
  }
});

// Obtener terminales
router.get('/getAll/:storeId', async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const query = storeId ? { storeId } : {};

    const terminals = await Terminal.find(query)
      // .populate('deviceId')
      .sort({ createdAt: -1 });

    const terminalsMap = terminals.map(terminal => ({
      _id: terminal._id,
      name: terminal.name,
      isLinked: terminal.isLinked,
    }))
    res.status(200).json({
      message: 'Terminales obtenidas exitosamente',
      count: terminals.length,
      terminals: terminalsMap
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener terminales',
      error: error.message
    });
  }
});

// Eliminar terminal
router.delete('/delete/:id', async (req, res) => {
  try {
    const terminal = await Terminal.findByIdAndDelete(req.params.id);

    if (!terminal) {
      return res.status(404).json({ message: 'Terminal no encontrada' });
    }

    res.status(200).json({
      message: 'Terminal eliminada exitosamente',
      terminal
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al eliminar terminal',
      error: error.message
    });
  }
});

// 1. Python pide su configuración usando su UUID
router.get('/config/:uuid', async (req, res) => {
  try {
    const terminal = await Terminal.findOne({ uuid: req.params.uuid })
      .populate('deviceId');

    if (!terminal) return res.status(404).json({ status: 'UNLINKED' });

    res.json({
      status: 'LINKED',
      config: terminal.deviceId // Aquí van VID, PID, Driver...
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Vincular terminal con UUID (Desde la ventanita de Python)
router.post('/vincular', async (req, res) => {
  const { uuid, type, pin } = req.body;

  if (!uuid || !type || !pin) {
    return res.status(400).json({ message: 'uuid, type y pin son requeridos' });
  }

  const pending = await PendingData.findOne({ value: pin, type });

  if (!pending) {
    return res.status(400).json({ message: 'Código PIN inválido o expirado' });
  }

  const terminal = await Terminal.findOne({ _id: pending.sourceId });

  if (!terminal) {
    return res.status(404).json({ message: 'Terminal no encontrada' });
  }
  if (terminal.isLinked) {
    return res.status(400).json({ message: 'La terminal ya está vinculada' });
  }


  const existingUuid = await Terminal.findOne({ uuid });
  if (existingUuid && existingUuid._id.toString() !== terminal._id.toString()) {
    return res.status(400).json({ message: 'El UUID ya está en uso por otra terminal' });
  }

  terminal.uuid = uuid;
  terminal.isLinked = true;
  await terminal.save();
  await pending.deleteOne();

  res.json({ message: "Vinculación exitosa", terminal });
});


router.get('/check/:uuid', async (req, res) => {
  try {
    const terminal = await Terminal.findOne({ uuid: req.params.uuid });

    if (!terminal) {
      return res.status(200).json({ status: false });
    }
    res.status(200).json({ status: true, terminal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/save_finger_print', async (req, res) => {
  const { terminal_id, finger_print } = req.body;

  console.log(finger_print)

  res.status(200).json({ message: 'Huella dactilar recibida', terminal_id, finger_print });
})

export const routeConfig = { path: "/v1/terminals", router }