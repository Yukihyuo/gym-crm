import https from "https";
import PDFDocument from "pdfkit";

import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";
import SubscriptionAssignment from "../models/SubscriptionAssignment.js";
import Store from "../models/Store.js";
import Brand from "../models/Brand.js";
import Visit from "../models/Visit.js";
import CashCut from "../models/CashCut.js";
import { brandTheme } from "../config/theme.config.js";

// Logo de respaldo cuando la marca no tiene uno configurado.
const LOGO_URL =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrXVrgyHK8wrw9f9NQDGhQA7H2RNKnMurcjw&s";

// ---------------------------------------------------------------------------
// Tema claro del reporte (fondo blanco, texto oscuro, acento de la marca).
// ---------------------------------------------------------------------------
const palette = {
  background: "#ffffff",
  card: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  mutedText: "#475569",
  faintText: "#94a3b8",
  primary: brandTheme.colors?.primary || "#a855f7",
  primarySoft: "#f3e8ff",
  positive: "#16a34a",
  negative: "#dc2626",
  neutral: "#e2e8f0",
  stripe: "#f1f5f9",
};

const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

const EXPENSE_SOURCE_LABELS = {
  cash_drawer: "Caja física",
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
  training: "Capacitación",
  withdrawal: "Retiro de efectivo",
  other: "Otros",
};

const SUBSCRIPTION_STATUS_LABELS = {
  active: "Activa",
  expired: "Vencida",
  cancelled: "Cancelada",
};

const CASH_CUT_STATUS_LABELS = {
  balanced: "Cuadrada",
  shortage: "Faltante",
  surplus: "Sobrante",
  pending: "Abierta",
  incomplete: "Incompleta",
};

const VISIT_METHOD_LABELS = {
  qr: "QR",
  manual: "Manual",
  fingerprint: "Huella",
};

// ---------------------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------------------
const num = (value) => Number(value || 0);

const toHumanText = (value) => {
  if (!value) return "-";
  return String(value)
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const normalizePaymentMethod = (method) =>
  PAYMENT_METHOD_LABELS[method] || toHumanText(method);

const normalizeExpenseCategory = (category) =>
  EXPENSE_CATEGORY_LABELS[category] || toHumanText(category);

const normalizeExpenseSource = (source) =>
  EXPENSE_SOURCE_LABELS[source] || toHumanText(source);

const subscriptionStatusLabel = (status) =>
  SUBSCRIPTION_STATUS_LABELS[status] || toHumanText(status);

const cashCutStatusLabel = (status) =>
  CASH_CUT_STATUS_LABELS[status] || toHumanText(status);

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(num(value));

const formatSignedCurrency = (value) => {
  const amount = num(value);
  return amount > 0 ? `+${formatCurrency(amount)}` : formatCurrency(amount);
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("es-MX", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "-";

const formatDateOnly = (value) =>
  value
    ? new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "-";

const personName = (entity) => {
  if (!entity) return "-";
  const profile = entity.profile;
  const name = [profile?.names, profile?.lastNames].filter(Boolean).join(" ");
  return name || "-";
};

const toDateRange = (startDate, endDate) => {
  const from = new Date(startDate);
  const to = new Date(endDate);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
};

const downloadImage = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`No se pudo descargar el logo. Status: ${response.statusCode}`));
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });

// ---------------------------------------------------------------------------
// Helpers de dibujo (PDFKit)
// ---------------------------------------------------------------------------
const drawRoundedCard = (doc, x, y, width, height, backgroundColor, borderColor = null) => {
  doc.save();
  doc.roundedRect(x, y, width, height, 8).fill(backgroundColor);
  if (borderColor) {
    doc.lineWidth(1);
    doc.roundedRect(x, y, width, height, 8).stroke(borderColor);
  }
  doc.restore();
};

const ensurePageSpace = (doc, currentY, requiredHeight) => {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (currentY + requiredHeight <= bottomLimit) {
    return currentY;
  }

  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(palette.background);
  return doc.page.margins.top;
};

const drawSectionTitle = (doc, contentX, y, title) => {
  doc.save();
  doc.rect(contentX, y, 4, 16).fill(palette.primary);
  doc.fillColor(palette.text).fontSize(14).font("Helvetica-Bold").text(title, contentX + 12, y - 2);
  doc.restore();
  return y + 22;
};

const drawKpi = (doc, x, y, width, height, label, value, valueColor, sub = "") => {
  drawRoundedCard(doc, x, y, width, height, palette.card, palette.border);
  doc.fillColor(palette.mutedText).fontSize(9).font("Helvetica").text(label.toUpperCase(), x + 14, y + 12, {
    width: width - 28,
  });
  doc.fillColor(valueColor || palette.text).fontSize(16).font("Helvetica-Bold").text(value, x + 14, y + 28, {
    width: width - 28,
  });
  if (sub) {
    doc.fillColor(palette.faintText).fontSize(8).font("Helvetica").text(sub, x + 14, y + 52, {
      width: width - 28,
    });
  }
};

const drawKpiRow = (doc, contentX, contentWidth, y, items, gap = 10) => {
  const height = 68;
  const cardWidth = (contentWidth - gap * (items.length - 1)) / items.length;
  let x = contentX;

  items.forEach((item) => {
    drawKpi(doc, x, y, cardWidth, height, item.label, item.value, item.valueColor, item.sub);
    x += cardWidth + gap;
  });

  return y + height;
};

const drawTable = ({
  doc,
  startY,
  contentX,
  contentWidth,
  title,
  columns,
  rows,
  palette: tablePalette,
  totalsRow = null,
  startOnNewPage = false,
  endWithNewPage = false,
}) => {
  const titleHeight = 40;
  const headerHeight = 26;
  const rowHeight = 24;
  const headerBodyGap = 4;
  const footerBodyGap = 4;
  const columnGap = 4;
  const horizontalPadding = 12;
  const availableWidth = contentWidth - horizontalPadding * 2;
  const maxRowsForFirstCard = 12;
  let y = startY;

  if (startOnNewPage) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(tablePalette.background);
    y = doc.page.margins.top;
  }

  y = ensurePageSpace(
    doc,
    y,
    titleHeight + headerHeight + headerBodyGap + rowHeight * Math.min(rows.length || 1, maxRowsForFirstCard) + 24
  );

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
    drawRoundedCard(doc, contentX, cardY, contentWidth, titleHeight, tablePalette.card, tablePalette.border);
    doc.fillColor(tablePalette.text).fontSize(13).font("Helvetica-Bold").text(title, contentX + 16, cardY + 12);
    return cardY + titleHeight + 8;
  };

  const drawColumns = (tableY) => {
    doc.save();
    doc.roundedRect(contentX, tableY, contentWidth, headerHeight, 8).fill(tablePalette.neutral);
    doc.restore();

    let colX = contentX + horizontalPadding;
    normalizedColumns.forEach((column) => {
      doc
        .fillColor(tablePalette.text)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(column.label, colX, tableY + 8, {
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
      doc.roundedRect(contentX, rowY, contentWidth, rowHeight, 4).fill(tablePalette.stripe);
      doc.restore();
    }
    writeCells(rowData, rowY, tablePalette.mutedText, "Helvetica");
  };

  y = drawHeaderCard(y);
  let tableY = drawColumns(y);

  if (!rows.length) {
    drawRoundedCard(doc, contentX, tableY + 4, contentWidth, rowHeight, tablePalette.card, tablePalette.border);
    doc
      .fillColor(tablePalette.faintText)
      .fontSize(10)
      .font("Helvetica")
      .text("Sin registros para mostrar.", contentX + 16, tableY + 11);

    if (endWithNewPage) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(tablePalette.background);
      return doc.page.margins.top;
    }
    return tableY + rowHeight + 16;
  }

  for (let i = 0; i < rows.length; i += 1) {
    if (tableY + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(tablePalette.background);
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
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(tablePalette.background);
      y = doc.page.margins.top;
      y = drawHeaderCard(y);
      tableY = drawColumns(y);
    }

    doc.save();
    doc.roundedRect(contentX, tableY, contentWidth, rowHeight, 4).fill(tablePalette.neutral);
    doc.restore();
    writeCells(totalsRow, tableY, tablePalette.text, "Helvetica-Bold");
    tableY += rowHeight;
  }

  if (endWithNewPage) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(tablePalette.background);
    return doc.page.margins.top;
  }

  return tableY + 16;
};

// ---------------------------------------------------------------------------
// Agregaciones de negocio
// ---------------------------------------------------------------------------
const buildSalesByMethod = (sales) => {
  const byMethod = { cash: 0, card: 0, transfer: 0 };
  for (const sale of sales) {
    const method = sale?.payment?.method;
    if (byMethod.hasOwnProperty(method)) {
      byMethod[method] += num(sale?.totals?.total);
    }
  }
  return byMethod;
};

const buildMembershipsByMethod = (subscriptions) => {
  const byMethod = { cash: 0, card: 0, transfer: 0 };
  for (const sub of subscriptions) {
    const method = sub?.paymentMethod;
    if (byMethod.hasOwnProperty(method)) {
      byMethod[method] += num(sub?.pricePaid);
    }
  }
  return byMethod;
};

const buildExpensesBySource = (expenses) => {
  const bySource = { cash_drawer: 0, bank_account: 0 };
  for (const expense of expenses) {
    const source = expense?.source;
    if (bySource.hasOwnProperty(source)) {
      bySource[source] += num(expense?.amount);
    }
  }
  return bySource;
};

const buildExpensesByCategory = (expenses) => {
  const byCategory = {};
  for (const expense of expenses) {
    const category = expense?.category || "other";
    byCategory[category] = (byCategory[category] || 0) + num(expense?.amount);
  }
  return byCategory;
};

const buildVisitsSummary = (visits) => {
  const byMethod = { qr: 0, manual: 0, fingerprint: 0 };
  let trial = 0;

  for (const visit of visits) {
    if (byMethod.hasOwnProperty(visit?.accessMethod)) {
      byMethod[visit.accessMethod] += 1;
    }
    if (visit?.isTrial) {
      trial += 1;
    }
  }

  return { total: visits.length, byMethod, trial };
};

const buildCashCutsSummary = (cashCuts) => {
  const byStatus = { balanced: 0, shortage: 0, surplus: 0, pending: 0, incomplete: 0 };
  let totalDifference = 0;

  for (const cashCut of cashCuts) {
    if (byStatus.hasOwnProperty(cashCut?.status)) {
      byStatus[cashCut.status] += 1;
    }
    totalDifference += num(cashCut?.cashDifference);
  }

  return { total: cashCuts.length, byStatus, totalDifference };
};

// ---------------------------------------------------------------------------
// Reporte maestro
// ---------------------------------------------------------------------------
export const createFinancialReportPdf = async ({ storeId, startDate, endDate, brandId }) => {
  const { from, to } = toDateRange(startDate, endDate);

  const store = await Store.findById(storeId).lean();
  if (!store) {
    throw new Error("Tienda no encontrada");
  }

  const brand = await Brand.findById(brandId || store.brandId).lean();
  const brandName = brand?.name || store.name || "Gimnasio";

  const [sales, nonCompletedSales, expenses, subscriptions, visits, cashCuts] = await Promise.all([
    Sale.find({
      storeId,
      status: "completed",
      createdAt: { $gte: from, $lte: to },
    })
      .select("receiptNumber totals payment createdAt userId clientId items")
      .populate("clientId", "profile.names profile.lastNames")
      .populate("userId", "profile.names profile.lastNames")
      .sort({ createdAt: 1 })
      .lean(),
    Sale.find({
      storeId,
      status: { $ne: "completed" },
      createdAt: { $gte: from, $lte: to },
    })
      .select("status totals cancellationReason createdAt")
      .sort({ createdAt: 1 })
      .lean(),
    Expense.find({
      ...(brandId ? { brandId } : {}),
      storeId,
      date: { $gte: from, $lte: to },
    })
      .select("amount category source description date")
      .sort({ date: 1 })
      .lean(),
    SubscriptionAssignment.find({
      ...(brandId ? { brandId } : {}),
      storeId,
      createdAt: { $gte: from, $lte: to },
    })
      .select("planId clientId startDate endDate pricePaid paymentMethod status createdAt")
      .populate({ path: "planId", select: "name price" })
      .populate("clientId", "profile.names profile.lastNames")
      .sort({ createdAt: 1 })
      .lean(),
    Visit.find({ storeId, createdAt: { $gte: from, $lte: to } })
      .select("accessMethod isTrial createdAt")
      .lean(),
    CashCut.find({ storeId, createdAt: { $gte: from, $lte: to } })
      .select("staffId openingDate closingDate initialCash reportedTotals cashDifference status")
      .populate("staffId", "profile.names profile.lastNames")
      .sort({ openingDate: 1 })
      .lean(),
  ]);

  // Totales generales
  const salesTotal = sales.reduce((acc, sale) => acc + num(sale?.totals?.total), 0);
  const taxTotal = sales.reduce((acc, sale) => acc + num(sale?.totals?.tax), 0);
  const discountTotal = sales.reduce((acc, sale) => acc + num(sale?.totals?.discount), 0);
  const subscriptionsTotal = subscriptions.reduce((acc, sub) => acc + num(sub?.pricePaid), 0);
  const expenseTotal = expenses.reduce((acc, expense) => acc + num(expense?.amount), 0);

  const incomeTotal = salesTotal + subscriptionsTotal;
  const netBalance = incomeTotal - expenseTotal;
  const margin = incomeTotal > 0 ? (netBalance / incomeTotal) * 100 : null;
  const averageTicket = sales.length ? salesTotal / sales.length : 0;

  // Desgloses
  const salesByMethod = buildSalesByMethod(sales);
  const membershipsByMethod = buildMembershipsByMethod(subscriptions);
  const expensesBySource = buildExpensesBySource(expenses);
  const expensesByCategory = buildExpensesByCategory(expenses);
  const visitsSummary = buildVisitsSummary(visits);
  const cashCutsSummary = buildCashCutsSummary(cashCuts);

  // Resumen por membresía: cuántas veces se compró cada plan, su precio y el total que produjo.
  const membershipSummaryMap = new Map();
  for (const sub of subscriptions) {
    const plan = sub.planId;
    const key = plan?._id?.toString() ?? plan?.toString() ?? "unknown";

    if (!membershipSummaryMap.has(key)) {
      membershipSummaryMap.set(key, {
        name: plan?.name || "Plan eliminado",
        count: 0,
        price: plan?.price?.amount,
        total: 0,
      });
    }

    const entry = membershipSummaryMap.get(key);
    entry.count += 1;
    entry.total += num(sub.pricePaid);
  }

  const membershipSummaryRows = [...membershipSummaryMap.values()]
    .sort((a, b) => b.total - a.total)
    .map((entry) => ({
      plan: entry.name,
      count: String(entry.count),
      price: entry.price !== undefined && entry.price !== null ? formatCurrency(entry.price) : "—",
      total: formatCurrency(entry.total),
    }));

  // Resumen por producto: unidades vendidas, precio de venta y total que produjo.
  const productSummaryMap = new Map();
  for (const sale of sales) {
    for (const item of sale.items || []) {
      const key = String(item.productId ?? "unknown");

      if (!productSummaryMap.has(key)) {
        productSummaryMap.set(key, {
          name: item.name || "Producto eliminado",
          quantity: 0,
          lastPrice: num(item.price),
          total: 0,
        });
      }

      const entry = productSummaryMap.get(key);
      entry.quantity += num(item.quantity);
      entry.total += num(item.subtotal ?? item.price * item.quantity);
      entry.lastPrice = num(item.price);
    }
  }

  const productSummaryRows = [...productSummaryMap.values()]
    .sort((a, b) => b.total - a.total)
    .map((entry) => ({
      product: entry.name,
      count: String(entry.quantity),
      price: formatCurrency(entry.lastPrice),
      total: formatCurrency(entry.total),
    }));

  const productUnitsTotal = [...productSummaryMap.values()].reduce((acc, entry) => acc + entry.quantity, 0);
  const productRevenueTotal = [...productSummaryMap.values()].reduce((acc, entry) => acc + entry.total, 0);

  let logoBuffer = null;
  try {
    logoBuffer = await downloadImage(brand?.logo || LOGO_URL);
  } catch {
    logoBuffer = null;
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 42,
    info: {
      Title: "Reporte financiero integral",
      Author: "Nexay",
      Subject: "Ventas, gastos, membresías y caja",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const contentX = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let y = doc.page.margins.top;

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(palette.background);
  doc.rect(0, 0, doc.page.width, 8).fill(palette.primary);

  // --- Encabezado ---
  y = 24;
  drawRoundedCard(doc, contentX, y, contentWidth, 92, palette.card, palette.border);
  if (logoBuffer) {
    doc.image(logoBuffer, contentX + 16, y + 16, { fit: [60, 60] });
  }
  doc.fillColor(palette.text).fontSize(20).font("Helvetica-Bold").text(brandName, contentX + 92, y + 16);
  doc.fillColor(palette.primary).fontSize(12).font("Helvetica-Bold").text("Reporte Financiero Integral", contentX + 92, y + 44);
  doc
    .fillColor(palette.mutedText)
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Sucursal: ${store.name}    |    Periodo: ${formatDateOnly(from)} – ${formatDateOnly(to)}`,
      contentX + 16,
      y + 72,
      { width: contentWidth - 32 }
    );
  y += 108;

  // --- Resumen ejecutivo ---
  y = drawSectionTitle(doc, contentX, y, "Resumen ejecutivo");
  y = drawKpiRow(doc, contentX, contentWidth, y, [
    {
      label: "Ingresos totales",
      value: formatCurrency(incomeTotal),
      sub: `Ventas + membresías`,
    },
    {
      label: "Gastos totales",
      value: formatCurrency(expenseTotal),
      sub: `${expenses.length} registros`,
    },
    {
      label: "Balance neto",
      value: formatCurrency(netBalance),
      valueColor: netBalance >= 0 ? palette.positive : palette.negative,
      sub: netBalance >= 0 ? "Utilidad del periodo" : "Pérdida del periodo",
    },
  ]);
  y += 10;
  y = drawKpiRow(doc, contentX, contentWidth, y, [
    {
      label: "Ventas",
      value: String(sales.length),
      sub: `Ticket promedio ${formatCurrency(averageTicket)}`,
    },
    {
      label: "Membresías",
      value: String(subscriptions.length),
      sub: formatCurrency(subscriptionsTotal),
    },
    {
      label: "Accesos",
      value: String(visitsSummary.total),
      sub: `${visitsSummary.trial} de prueba`,
    },
  ]);
  y += 14;

  // --- Indicadores secundarios ---
  y = drawKpiRow(doc, contentX, contentWidth, y, [
    { label: "IVA cobrado", value: formatCurrency(taxTotal) },
    { label: "Descuentos", value: formatCurrency(discountTotal) },
    {
      label: "Margen neto",
      value: margin === null ? "—" : `${margin.toFixed(1)}%`,
      valueColor: margin === null ? palette.text : margin >= 0 ? palette.positive : palette.negative,
    },
    {
      label: "Canceladas / reembolsadas",
      value: String(nonCompletedSales.length),
      valueColor: nonCompletedSales.length ? palette.negative : palette.text,
    },
  ]);
  y += 16;

  // --- Ingresos por método de pago ---
  y = ensurePageSpace(doc, y, 120);
  y = drawSectionTitle(doc, contentX, y, "Ingresos por método de pago");
  const revenueMethodRows = ["cash", "card", "transfer"].map((method) => ({
    method: normalizePaymentMethod(method),
    sales: formatCurrency(salesByMethod[method]),
    memberships: formatCurrency(membershipsByMethod[method]),
    total: formatCurrency(salesByMethod[method] + membershipsByMethod[method]),
  }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "Ventas y membresías por forma de pago",
    palette,
    columns: [
      { key: "method", label: "Método", width: 150 },
      { key: "sales", label: "Ventas", width: 110, align: "right" },
      { key: "memberships", label: "Membresías", width: 110, align: "right" },
      { key: "total", label: "Total", width: 110, align: "right" },
    ],
    rows: revenueMethodRows,
    totalsRow: {
      method: "TOTAL",
      sales: formatCurrency(salesTotal),
      memberships: formatCurrency(subscriptionsTotal),
      total: formatCurrency(incomeTotal),
    },
  });
  y += 4;

  // --- Gastos por categoría ---
  y = ensurePageSpace(doc, y, 120);
  y = drawSectionTitle(doc, contentX, y, "Gastos por categoría");
  const expenseCategoryRows = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category: normalizeExpenseCategory(category),
      amount: formatCurrency(amount),
      share: expenseTotal ? `${((amount / expenseTotal) * 100).toFixed(1)}%` : "0%",
    }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "Distribución del gasto",
    palette,
    columns: [
      { key: "category", label: "Categoría", width: 250 },
      { key: "amount", label: "Monto", width: 110, align: "right" },
      { key: "share", label: "Participación", width: 110, align: "right" },
    ],
    rows: expenseCategoryRows,
    totalsRow: {
      category: "TOTAL",
      amount: formatCurrency(expenseTotal),
      share: "100%",
    },
  });
  y += 4;

  // --- Gastos por origen ---
  y = ensurePageSpace(doc, y, 120);
  y = drawSectionTitle(doc, contentX, y, "Gastos por origen");
  const expenseSourceRows = ["cash_drawer", "bank_account"].map((source) => ({
    source: normalizeExpenseSource(source),
    amount: formatCurrency(expensesBySource[source]),
  }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "¿De dónde salió el dinero?",
    palette,
    columns: [
      { key: "source", label: "Origen", width: 220 },
      { key: "amount", label: "Monto", width: 120, align: "right" },
    ],
    rows: expenseSourceRows,
    totalsRow: {
      source: "TOTAL",
      amount: formatCurrency(expenseTotal),
    },
  });
  y += 4;

  // --- Corte de caja ---
  y = ensurePageSpace(doc, y, 120);
  y = drawSectionTitle(doc, contentX, y, "Corte de caja");
  const cashCutRows = cashCuts.map((cashCut) => ({
    opening: formatDate(cashCut.openingDate),
    closing: cashCut.closingDate ? formatDate(cashCut.closingDate) : "—",
    staff: personName(cashCut.staffId),
    initial: formatCurrency(cashCut.initialCash),
    reported: formatCurrency(cashCut.reportedTotals?.cashInHand),
    difference: formatSignedCurrency(cashCut.cashDifference),
    status: cashCutStatusLabel(cashCut.status),
  }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: `Cajas del periodo (${cashCuts.length})`,
    palette,
    columns: [
      { key: "opening", label: "Apertura", width: 95 },
      { key: "closing", label: "Cierre", width: 95 },
      { key: "staff", label: "Responsable", width: 105 },
      { key: "initial", label: "Fondo", width: 70, align: "right" },
      { key: "reported", label: "Efectivo", width: 75, align: "right" },
      { key: "difference", label: "Diferencia", width: 75, align: "right" },
      { key: "status", label: "Estado", width: 75 },
    ],
    rows: cashCutRows,
    totalsRow: {
      opening: `${cashCutsSummary.byStatus.balanced} cuadradas`,
      closing: `${cashCutsSummary.byStatus.shortage} faltantes`,
      staff: `${cashCutsSummary.byStatus.surplus} sobrantes`,
      initial: "",
      reported: "",
      difference: formatSignedCurrency(cashCutsSummary.totalDifference),
      status: `${cashCutsSummary.byStatus.pending} abiertas`,
    },
  });
  y += 4;

  // --- Ventas (detalle) ---
  y = ensurePageSpace(doc, y, 120);
  y = drawSectionTitle(doc, contentX, y, "Ventas del periodo");
  const saleRows = sales.map((sale) => ({
    receipt: sale.receiptNumber || "-",
    date: formatDate(sale.createdAt),
    client: personName(sale.clientId),
    seller: personName(sale.userId),
    items: String(sale.items?.reduce((acc, item) => acc + num(item.quantity), 0) || 0),
    method: normalizePaymentMethod(sale.payment?.method),
    total: formatCurrency(sale.totals?.total),
  }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "Listado de ventas",
    palette,
    columns: [
      { key: "receipt", label: "Recibo", width: 85 },
      { key: "date", label: "Fecha", width: 95 },
      { key: "client", label: "Cliente", width: 105 },
      { key: "seller", label: "Vendedor", width: 105 },
      { key: "items", label: "Arts.", width: 40, align: "right" },
      { key: "method", label: "Pago", width: 70 },
      { key: "total", label: "Total", width: 80, align: "right" },
    ],
    rows: saleRows,
    totalsRow: {
      receipt: `${sales.length} ventas`,
      date: "",
      client: "",
      seller: "",
      items: "",
      method: "",
      total: formatCurrency(salesTotal),
    },
    startOnNewPage: true,
  });
  y += 4;

  // --- Membresías (detalle) ---
  y = ensurePageSpace(doc, y, 120);
  y = drawSectionTitle(doc, contentX, y, "Membresías del periodo");
  const subscriptionRows = subscriptions.map((sub) => ({
    plan: sub.planId?.name || "—",
    client: personName(sub.clientId),
    start: formatDateOnly(sub.startDate),
    end: sub.endDate ? formatDateOnly(sub.endDate) : "Sin vencimiento",
    price: formatCurrency(sub.pricePaid),
    method: normalizePaymentMethod(sub.paymentMethod),
    status: subscriptionStatusLabel(sub.status),
  }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "Listado de membresías",
    palette,
    columns: [
      { key: "plan", label: "Plan", width: 95 },
      { key: "client", label: "Cliente", width: 105 },
      { key: "start", label: "Inicio", width: 70 },
      { key: "end", label: "Fin", width: 70 },
      { key: "price", label: "Precio", width: 75, align: "right" },
      { key: "method", label: "Pago", width: 70 },
      { key: "status", label: "Estado", width: 70 },
    ],
    rows: subscriptionRows,
    totalsRow: {
      plan: `${subscriptions.length} membresías`,
      client: "",
      start: "",
      end: "",
      price: formatCurrency(subscriptionsTotal),
      method: "",
      status: "",
    },
  });
  y += 4;

  // --- Accesos ---
  y = ensurePageSpace(doc, y, 120);
  y = drawSectionTitle(doc, contentX, y, "Actividad de accesos");
  const accessRows = ["qr", "manual", "fingerprint"].map((method) => ({
    method: VISIT_METHOD_LABELS[method],
    count: String(visitsSummary.byMethod[method]),
    share: visitsSummary.total
      ? `${((visitsSummary.byMethod[method] / visitsSummary.total) * 100).toFixed(1)}%`
      : "0%",
  }));

  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: `Accesos por método (${visitsSummary.total} totales · ${visitsSummary.trial} de prueba)`,
    palette,
    columns: [
      { key: "method", label: "Método", width: 200 },
      { key: "count", label: "Accesos", width: 110, align: "right" },
      { key: "share", label: "Participación", width: 110, align: "right" },
    ],
    rows: accessRows,
    totalsRow: {
      method: "TOTAL",
      count: String(visitsSummary.total),
      share: "100%",
    },
  });
  y += 4;

  // --- Resumen por membresía ---
  y = ensurePageSpace(doc, y, 120);
  y = drawSectionTitle(doc, contentX, y, "Resumen por membresía");
  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "Veces comprada, precio y total por plan",
    palette,
    columns: [
      { key: "plan", label: "Membresía", width: 190 },
      { key: "count", label: "Veces comprada", width: 90, align: "right" },
      { key: "price", label: "Precio", width: 100, align: "right" },
      { key: "total", label: "Total", width: 100, align: "right" },
    ],
    rows: membershipSummaryRows,
    totalsRow: {
      plan: `${membershipSummaryMap.size} planes`,
      count: String(subscriptions.length),
      price: "",
      total: formatCurrency(subscriptionsTotal),
    },
  });
  y += 4;

  // --- Resumen por producto ---
  y = ensurePageSpace(doc, y, 120);
  y = drawSectionTitle(doc, contentX, y, "Resumen por producto");
  y = drawTable({
    doc,
    startY: y,
    contentX,
    contentWidth,
    title: "Unidades vendidas, precio y total por producto",
    palette,
    columns: [
      { key: "product", label: "Producto", width: 190 },
      { key: "count", label: "Cantidad vendida", width: 90, align: "right" },
      { key: "price", label: "Precio", width: 100, align: "right" },
      { key: "total", label: "Total", width: 100, align: "right" },
    ],
    rows: productSummaryRows,
    totalsRow: {
      product: `${productSummaryMap.size} productos`,
      count: String(productUnitsTotal),
      price: "",
      total: formatCurrency(productRevenueTotal),
    },
  });
  y += 4;

  // --- Pie de página ---
  y = ensurePageSpace(doc, y, 50);
  doc.moveTo(contentX, y).lineTo(contentX + contentWidth, y).strokeColor(palette.border).stroke();
  doc
    .fillColor(palette.faintText)
    .fontSize(9)
    .font("Helvetica")
    .text(
      `Generado el ${formatDate(new Date())} · Nexay CRM · ${brandName}`,
      contentX,
      y + 10,
      { width: contentWidth, align: "center" }
    );

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
};
