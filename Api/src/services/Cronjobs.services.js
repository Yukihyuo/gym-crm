import cron from 'node-cron';
import dayjs from 'dayjs';


import SubscriptionAssignment from "../models/SubscriptionAssignment.js"


cron.schedule('05 1 * * *', async () => {
  const ahora = dayjs()
  console.log(`[Cron-Expiration] Ejecutando barrido: ${ahora.format('YYYY-MM-DD HH:mm:ss')}`);

  try {
    /**
     * LÓGICA DE CORTE:
     * Obtenemos el inicio de HOY (00:00:00). 
     * Como normalizamos los endDate a las 23:59:59 del día de vencimiento,
     * cualquier membresía con endDate MENOR a las 00:00:00 de hoy, expiró ayer.
     */
    const hoyInicio = ahora.startOf('day').toDate();

    const resultado = await SubscriptionAssignment.updateMany(
      {
        status: 'active',           // Solo las que todavía figuran como activas
        endDate: { $lt: hoyInicio } // Y cuya fecha de fin es anterior a hoy
      },
      {
        $set: { status: 'expired' } // Cambiamos el estado a caducado
      }
    );

    if (resultado.modifiedCount > 0) {
      console.log(`[Cron-Expiration] Éxito: Se caducaron ${resultado.modifiedCount} membresías.`);
    } else {
      console.log(`[Cron-Expiration] Sin membresías para caducar hoy.`);
    }

  } catch (error) {
    console.error('[Cron-Expiration] Error crítico en el proceso:', error);
  }
}, {
  scheduled: true,
});

console.log(`[System] Cronjob de expiración registrado para las 01:00 AM `);