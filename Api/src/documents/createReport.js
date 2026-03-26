import https from "https";
import PDFDocument from "pdfkit";

import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";
import SubscriptionAssignment from "../models/SubscriptionAssignment.js";
import Store from "../models/Store.js";
import Brand from "../models/Brand.js";
import { brandTheme } from "../config/theme.config.js";

const LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrXVrgyHK8wrw9f9NQDGhQA7H2RNKnMurcjw&s";


const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

const EXPENSE_SOURCE_LABELS = {
  cash_drawer: "Caja fisica",
  bank_account: "Cuenta bancaria",
};

const EXPENSE_CATEGORY_LABELS = {
  salary: "Sueldos y salarios",
  payroll_taxes: "Cargas sociales",
  rent: "Renta",
  utilities: "Servicios",
  cleaning: "Limpieza",
  supplies: "Insumos",
  inventory: "Inventario",
  equipment: "Equipamiento",
  maintenance: "Mantenimiento",
  marketing: "Marketing",
  software: "Software",
  professional_fees: "Honorarios",
  insurance: "Seguros",
  taxes: "Impuestos",
  bank_fees: "Comisiones bancarias",
  transport: "Transporte",
  training: "Capacitacion",
  withdrawal: "Retiro de efectivo",
  other: "Otros",
};

const toHumanText = (value) => {
  if (!value) return "-";
  return String(value)
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const normalizePaymentMethod = (method) => PAYMENT_METHOD_LABELS[method] || toHumanText(method);

const normalizeExpenseCategory = (category) => EXPENSE_CATEGORY_LABELS[category] || toHumanText(category);

const normalizeExpenseSource = (source) => EXPENSE_SOURCE_LABELS[source] || toHumanText(source);

const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
};

const formatDate = (value) => {
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const toDateRange = (startDate, endDate) => {
  const from = new Date(startDate);
  const to = new Date(endDate);

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  return { from, to };
};

const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`No se pudo descargar logo. Status: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
};

const buildReportData = ({ sales, expenses, subscriptions }) => {
  const salesTotal = sales.reduce((acc, sale) => acc + Number(sale?.totals?.total || 0), 0);
  const subscriptionsTotal = subscriptions.reduce((acc, item) => acc + Number(item?.pricePaid || 0), 0);
  const expenseTotal = expenses.reduce((acc, expense) => acc + Number(expense?.amount || 0), 0);

  const incomeTotal = salesTotal + subscriptionsTotal;
  const netBalance = incomeTotal - expenseTotal;

  return {
    salesTotal,
    subscriptionsTotal,
    expenseTotal,
    incomeTotal,
    netBalance,
    salesCount: sales.length,
    subscriptionCount: subscriptions.length,
    expenseCount: expenses.length,
  };
};

const drawRoundedCard = (doc, x, y, width, height, backgroundColor) => {
  doc.save();
  doc.roundedRect(x, y, width, height, 10).fill(backgroundColor);
  doc.restore();
};

const ensurePageSpace = (doc, currentY, requiredHeight) => {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (currentY + requiredHeight <= bottomLimit) {
    return currentY;
  }

  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(brandTheme.colors.background || "#1a1a1e");
  return doc.page.margins.top;
};

const drawTable = ({
  doc,
  startY,
  contentX,
  contentWidth,
  title,
  columns,
  rows,
  palette,
  totalsRow = null,
  startOnNewPage = false,
  endWithNewPage = false,
}) => {
  const titleHeight = 46;
  const headerHeight = 28;
  const rowHeight = 24;
  // Configuracion de separaciones de tabla:
  // headerBodyGap: separa encabezado del cuerpo
  // footerBodyGap: separa cuerpo del footer (fila total)
  const headerBodyGap = 5;
  const footerBodyGap = 5;
  const columnGap = 4;
  const horizontalPadding = 12;
  const availableWidth = contentWidth - horizontalPadding * 2;
  const maxRowsForFirstCard = 10;
  let y = startY;

  if (startOnNewPage) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(brandTheme.colors.background || "#1a1a1e");
    y = doc.page.margins.top;
  }

  y = ensurePageSpace(doc, y, titleHeight + headerHeight + headerBodyGap + rowHeight * Math.min(rows.length || 1, maxRowsForFirstCard) + 24);

  const totalRequestedWidth = columns.reduce((acc, column) => acc + Number(column.width || 0), 0);
  const targetColumnsWidth = Math.max(120, availableWidth - columnGap * Math.max(0, columns.length - 1));
  const widthScale = totalRequestedWidth > targetColumnsWidth ? targetColumnsWidth / totalRequestedWidth : 1;
  const normalizedColumns = columns.map((column) => ({
    ...column,
    renderWidth: Math.max(60, Math.floor(column.width * widthScale)),
  }));

  const usedWidth = normalizedColumns.reduce((acc, column) => acc + column.renderWidth, 0);
  const remainder = targetColumnsWidth - usedWidth;
  if (normalizedColumns.length > 0 && remainder !== 0) {
    normalizedColumns[normalizedColumns.length - 1].renderWidth += remainder;
  }

  const drawHeaderCard = (cardY) => {
    drawRoundedCard(doc, contentX, cardY, contentWidth, titleHeight, palette.card);
    doc.fillColor(palette.cardForeground).fontSize(13).font("Helvetica-Bold").text(title, contentX + 16, cardY + 15);
    return cardY + titleHeight + 8;
  };

  const drawColumns = (tableY) => {
    doc.save();
    doc.roundedRect(contentX, tableY, contentWidth, headerHeight, 8).fill(palette.secondary || palette.card);
    doc.restore();

    let colX = contentX + horizontalPadding;
    normalizedColumns.forEach((column) => {
      doc
        .fillColor(palette.cardForeground)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(column.label, colX, tableY + 9, {
          width: column.renderWidth,
          align: column.align || "left",
          lineBreak: false,
        });
      colX += column.renderWidth + columnGap;
    });

    return tableY + headerHeight + headerBodyGap;
  };

  const writeCells = (rowData, rowY, textColor, fontName) => {
    let colX = contentX + horizontalPadding;
    normalizedColumns.forEach((column) => {
      doc
        .fillColor(textColor)
        .fontSize(9)
        .font(fontName)
        .text(String(rowData[column.key] ?? "-"), colX, rowY + 7, {
          width: column.renderWidth,
          align: column.align || "left",
          lineBreak: false,
        });
      colX += column.renderWidth + columnGap;
    });
  };

  const writeRow = (rowData, rowY, index) => {
    if (index % 2 === 0) {
      doc.save();
      doc.roundedRect(contentX, rowY, contentWidth, rowHeight, 6).fill("#2f2f35");
      doc.restore();
    }

    writeCells(rowData, rowY, palette.mutedForeground, "Helvetica");
  };

  y = drawHeaderCard(y);
  let tableY = drawColumns(y);

  if (!rows.length) {
    drawRoundedCard(doc, contentX, tableY + 8, contentWidth, rowHeight, palette.card);
    doc.fillColor(palette.mutedForeground).fontSize(10).font("Helvetica").text("Sin registros para mostrar.", contentX + 16, tableY + 15);
    if (endWithNewPage) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(brandTheme.colors.background || "#1a1a1e");
      return doc.page.margins.top;
    }
    return tableY + rowHeight + 20;
  }

  for (let i = 0; i < rows.length; i += 1) {
    if (tableY + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(brandTheme.colors.background || "#1a1a1e");
      y = doc.page.margins.top;
      y = drawHeaderCard(y);
      tableY = drawColumns(y);
    }

    writeRow(rows[i], tableY, i);
    tableY += rowHeight;
  }

  if (totalsRow) {
    tableY += footerBodyGap;
    if (tableY + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(brandTheme.colors.background || "#1a1a1e");
      y = doc.page.margins.top;
      y = drawHeaderCard(y);
      tableY = drawColumns(y);
    }

    doc.save();
    doc.roundedRect(contentX, tableY, contentWidth, rowHeight, 6).fill(palette.secondary || palette.card);
    doc.restore();
    writeCells(totalsRow, tableY, palette.cardForeground, "Helvetica-Bold");
    tableY += rowHeight;
  }

  if (endWithNewPage) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(brandTheme.colors.background || "#1a1a1e");
    return doc.page.margins.top;
  }

  return tableY + 16;
};

export const createFinancialReportPdf = async ({ storeId, startDate, endDate, brandId }) => {
  const { from, to } = toDateRange(startDate, endDate);

  const [brand, store, sales, expenses, subscriptions] = await Promise.all([
    Brand.findById(brandId).lean(),
    Store.findById(storeId).lean(),
    Sale.find({
      storeId,
      status: "completed",
      createdAt: { $gte: from, $lte: to },
    })
      .select("receiptNumber totals payment createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    Expense.find({
      ...(brandId ? { brandId } : {}),
      storeId,
      date: { $gte: from, $lte: to },
    })
      .select("amount category source description date")
      .sort({ date: -1 })
      .lean(),
    SubscriptionAssignment.find({
      ...(brandId ? { brandId } : {}),
      storeId,
      status: { $ne: "cancelled" },
      createdAt: { $gte: from, $lte: to },
    })
      .select("planId pricePaid paymentMethod status createdAt")
      .populate({ path: "planId", select: "name" })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  if (!store) {
    throw new Error("Tienda no encontrada");
  }

  const totals = buildReportData({ sales, expenses, subscriptions });

  let logoBuffer = null;
  try {
    logoBuffer = await downloadImage(brand.logo || LOGO_URL);
  } catch (error) {
    logoBuffer = null;
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 42,
    info: {
      Title: "Reporte financiero",
      Author: "Nexay",
      Subject: "Ventas y costos",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const palette = {
    background: brandTheme.colors.background || "#1a1a1e",
    card: brandTheme.colors.card || "#27272c",
    secondary: brandTheme.colors.secondary || "#3f3f46",
    cardForeground: brandTheme.colors.cardForeground || "#fafafa",
    primary: brandTheme.colors.primary || "#a855f7",
    mutedForeground: brandTheme.colors.mutedForeground || "#a1a1aa",
    chart1: brandTheme.colors.chart1 || "#d8b4fe",
    chart2: brandTheme.colors.chart2 || "#a855f7",
    chart3: brandTheme.colors.chart3 || "#9333ea",
    chart4: brandTheme.colors.chart4 || "#7e22ce",
    chart5: brandTheme.colors.chart5 || "#6b21a8",
  };

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(palette.background);

  let y = doc.page.margins.top;
  const contentX = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawRoundedCard(doc, contentX, y, contentWidth, 96, palette.card);
  if (logoBuffer) {
    doc.image(logoBuffer, contentX + 16, y + 18, { fit: [58, 58], align: "left", valign: "center" });
  }

  doc
    .fillColor(palette.primary)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(brand.name, contentX + 90, y + 22);

  doc
    .fillColor(palette.cardForeground)
    .fontSize(13)
    .font("Helvetica")
    .text("Reporte de Ventas y Costos", contentX + 90, y + 48);

  doc
    .fillColor(palette.mutedForeground)
    .fontSize(10)
    .text(
      `Sucursal: ${store.name} | Periodo: ${formatDate(from)} - ${formatDate(to)}`,
      contentX + 16,
      y + 81,
      { width: contentWidth - 32 }
    );

  y += 120;

  const cards = [
    { title: "Ingresos Totales", value: formatCurrency(totals.incomeTotal), color: palette.chart1 },
    { title: "Costos Totales", value: formatCurrency(totals.expenseTotal), color: palette.chart3 },
    { title: "Balance Neto", value: formatCurrency(totals.netBalance), color: totals.netBalance >= 0 ? palette.chart2 : "#ef4444" },
  ];

  const gap = 12;
  const cardWidth = (contentWidth - gap * 2) / 3;
  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    const x = contentX + i * (cardWidth + gap);
    drawRoundedCard(doc, x, y, cardWidth, 88, palette.card);

    doc
      .fillColor(palette.mutedForeground)
      .fontSize(10)
      .font("Helvetica")
      .text(card.title, x + 14, y + 14, { width: cardWidth - 28 });

    doc
      .fillColor(card.color)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(card.value, x + 14, y + 36, { width: cardWidth - 28 });
  }

  y += 108;

  y = ensurePageSpace(doc, y, 150);
  drawRoundedCard(doc, contentX, y, contentWidth, 130, palette.card);
  doc.fillColor(palette.cardForeground).fontSize(14).font("Helvetica-Bold").text("Resumen Operativo", contentX + 16, y + 16);

  const summaryData = {
    "Ventas completadas": `${totals.salesCount} (Total: ${formatCurrency(totals.salesTotal)})`,
    "Membresías cobradas": `${totals.subscriptionCount} (Total: ${formatCurrency(totals.subscriptionsTotal)})`,
    "Gastos registrados": totals.expenseCount,
    Generado: formatDate(new Date()),
  };

  Object.entries(summaryData).forEach(([key, value], index) => {
    doc
      .fillColor(palette.mutedForeground)
      .fontSize(11)
      .font("Helvetica")
      .text(`- ${key}: ${value}`, contentX + 20, y + 46 + index * 18, { width: contentWidth - 40 });
  });

  y += 148;

  const expenseRows = expenses.map((item) => ({
    date: formatDate(item.date),
    category: normalizeExpenseCategory(item.category),
    source: normalizeExpenseSource(item.source),
    amount: formatCurrency(item.amount),
  }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "Listado General de Gastos",
    palette,
    columns: [
      { key: "date", label: "Fecha", width: 140 },
      { key: "category", label: "Categoria", width: 185 },
      { key: "source", label: "Origen", width: 130 },
      { key: "amount", label: "Monto", width: 95, align: "right" },
    ],
    rows: expenseRows,
    totalsRow: {
      date: "",
      category: "TOTAL",
      source: `${expenses.length} registros`,
      amount: formatCurrency(totals.expenseTotal),
    },
    startOnNewPage: true,
    endWithNewPage: true,
  });

  const saleRows = sales.map((item) => ({
    receiptNumber: item.receiptNumber || "-",
    total: formatCurrency(item?.totals?.total),
    paymentMethod: normalizePaymentMethod(item?.payment?.method),
    createdAt: formatDate(item.createdAt),
  }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "Listado General de Ventas",
    palette,
    columns: [
      { key: "receiptNumber", label: "Receipt", width: 150 },
      { key: "total", label: "Total", width: 110, align: "right" },
      { key: "paymentMethod", label: "Método Pago", width: 120 },
      { key: "createdAt", label: "Fecha", width: contentWidth - 12 - 150 - 110 - 120 },
    ],
    rows: saleRows,
    totalsRow: {
      receiptNumber: "TOTAL",
      total: formatCurrency(totals.salesTotal),
      paymentMethod: `${sales.length} ventas`,
      createdAt: "",
    },
    startOnNewPage: false,
    endWithNewPage: true,
  });

  const subscriptionRows = subscriptions.map((item) => ({
    subscriptionName: item?.planId?.name || "-",
    pricePaid: formatCurrency(item.pricePaid),
    paymentMethod: normalizePaymentMethod(item.paymentMethod),
    // status: item.status || "-",
    createdAt: formatDate(item.createdAt),
  }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "Listado General de Membresías",
    palette,
    columns: [
      { key: "subscriptionName", label: "Membresía", width: 160 },
      { key: "pricePaid", label: "Precio", width: 100, align: "right" },
      { key: "paymentMethod", label: "Método Pago", width: 110 },
      // { key: "status", label: "Estatus", width: 90 },
      { key: "createdAt", label: "Fecha", width: 145 },
    ],
    rows: subscriptionRows,
    totalsRow: {
      subscriptionName: "TOTAL",
      pricePaid: formatCurrency(totals.subscriptionsTotal),
      paymentMethod: `${subscriptions.length} membresias`,
      createdAt: "",
    },
    startOnNewPage: false,
    endWithNewPage: false,
  });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
};
