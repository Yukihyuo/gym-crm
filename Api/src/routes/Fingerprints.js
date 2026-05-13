import express from 'express';
import Client from '../models/Client.js';
import Terminal from '../models/Terminal.js';
import PendingData from '../models/PendingData.js';

const router = express.Router();

router.post('/check', async (req, res) => {
  const { uuid, fingerprintId } = req.body;

  try {
    const terminal = await Terminal.findOne({ uuid });
    if (!terminal) return res.status(403).json({ message: "Terminal no autorizada" });

    // ¿Hay alguien esperando ser registrado en esta sucursal?
    const enRegistro = await PendingData.findOne({ sucursalId: terminal.sucursalId });

    if (enRegistro) {
      // MODO REGISTRO
      await Client.findByIdAndUpdate(enRegistro.socioId, { fingerprintId });

      // Avisamos a la web usando el ID de la terminal como sala
      req.io.to(terminal._id).emit('registro_completado', { socioId: enRegistro.socioId });

      await PendingData.deleteOne({ _id: enRegistro._id });
      return res.json({ action: 'REGISTERED' });
    }

    // MODO ACCESO
    const socio = await Client.findOne({ sucursalId: terminal.sucursalId, fingerprintId });

    if (socio) {
      req.io.to(terminal._id).emit('acceso_resultado', {
        nombre: socio.nombre,
        estado: socio.estado,
        foto: socio.foto // Si tienes fotos
      });
      return res.json({ action: 'ACCESS_GRANTED' });
    }

    req.io.to(terminal._id).emit('acceso_resultado', { estado: 'NO_ENCONTRADO' });
    res.status(404).json({ action: 'NOT_FOUND' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export const routeConfig = { path: "/v1/fingerprints", router }