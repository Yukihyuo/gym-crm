import express from "express"
import { createFinancialReportPdf } from "../documents/createReport.js";
import Store from "../models/Store.js";

import dayjs from "dayjs"

const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Documents API is working' })
})

router.get('/financial-report/download', async (req, res) => {
  try {
    const storeId = req.query.storeId || req.headers['x-store-id'];
    const startDate = req.query.inicio || req.query.startDate;
    const endDate = req.query.fin || req.query.endDate;
    const brandId = req.query.brandId || req.headers['x-brand-id'];

    if (!storeId) {
      return res.status(400).json({ message: 'storeId es requerido' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'inicio y fin son requeridos' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: 'inicio o fin tienen un formato de fecha invalido' });
    }

    if (start > end) {
      return res.status(400).json({ message: 'inicio no puede ser mayor que fin' });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Tienda no encontrada' });
    }

    if (brandId && store.brandId !== brandId) {
      return res.status(400).json({ message: 'La tienda no pertenece a la marca activa' });
    }

    const pdfBuffer = await createFinancialReportPdf({
      storeId,
      startDate: dayjs(startDate).startOf('day').toDate(),
      endDate: dayjs(endDate).endOf('day').toDate(),
      brandId,
    });

    const safeStoreName = (store.name || 'store')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const fileName = `reporte-financiero-${safeStoreName || 'sucursal'}-${startDate}-${endDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error al generar reporte financiero:', error);
    return res.status(500).json({
      message: 'Error al generar reporte financiero',
      error: error.message,
    });
  }
});

export const routeConfig = { path: "/v1/documents", router }