import express from "express"
import CashCut from "../models/CashCut.js"
import Sale from "../models/Sale.js"
import SubscriptionAssignment from "../models/SubscriptionAssignment.js"
import Expense from "../models/Expense.js"

const router = express.Router()

const OPEN_STATUSES = ['pending', 'incomplete']

const isOpenCashCut = (status) => OPEN_STATUSES.includes(status)

const uniqueIds = (...values) => [...new Set(values.flat().filter(Boolean))]


const mergeSystemTotals = (current = {}, incoming = {}, totalExpenses = 0) => {
  const byMethod = {
    cash: incoming?.byMethod?.cash ?? current?.byMethod?.cash ?? 0,
    transfer: incoming?.byMethod?.transfer ?? current?.byMethod?.transfer ?? 0,
    card: incoming?.byMethod?.card ?? current?.byMethod?.card ?? 0,
  }

  const byCategory = {
    products: incoming?.byCategory?.products ?? current?.byCategory?.products ?? 0,
    subscriptions: incoming?.byCategory?.subscriptions ?? current?.byCategory?.subscriptions ?? 0,
  }

  // El Grand Total ahora es la suma de ventas MENOS los gastos totales registrados
  const computedGrandTotal = (byMethod.cash + byMethod.transfer + byMethod.card) - totalExpenses

  return {
    byMethod,
    byCategory,
    grandTotal: incoming?.grandTotal ?? computedGrandTotal,
  }
}

const mergeReportedTotals = (current = {}, incoming = {}) => ({
  cashInHand: incoming?.cashInHand ?? current?.cashInHand ?? 0,
  transferReceipts: incoming?.transferReceipts ?? current?.transferReceipts ?? 0,
  cardSlips: incoming?.cardSlips ?? current?.cardSlips ?? 0,
})

const calculateCashDifference = (initialCash, systemTotals, reportedTotals, cashExpenses = 0, bankExpenses = 0) => {
  // Efectivo esperado = (Fondo inicial + Ventas Efectivo) - Gastos de Caja
  const expectedCash = ((systemTotals?.byMethod?.cash ?? 0) + (initialCash ?? 0)) - cashExpenses
  const cashInHand = reportedTotals?.cashInHand ?? 0

  // Dinero Digital esperado = (Ventas Tarjeta + Ventas Transfer) - Gastos Bancarios
  const expectedDigital = ((systemTotals?.byMethod?.card ?? 0) + (systemTotals?.byMethod?.transfer ?? 0)) - bankExpenses
  const reportedDigital = (reportedTotals?.cardSlips ?? 0) + (reportedTotals?.transferReceipts ?? 0)

  // La diferencia total es la suma de ambas discrepancias
  const cashDiff = cashInHand - expectedCash
  const digitalDiff = reportedDigital - expectedDigital

  return cashDiff + digitalDiff
}

const resolveClosedStatus = (cashDifference) => {
  if (cashDifference === 0) {
    return 'balanced'
  }

  if (cashDifference < 0) {
    return 'shortage'
  }

  return 'surplus'
}

// POST - Abrir caja
router.post('/open', async (req, res) => {
  try {
    const { staffId, initialCash = 0 } = req.body
    const brandId = req.body.brandId || req.headers['x-brand-id']
    const storeId = req.body.storeId || req.headers['x-store-id']

    if (!staffId) {
      return res.status(400).json({
        message: 'staffId es requerido'
      })
    }

    if (!brandId) {
      return res.status(400).json({
        message: 'brandId es requerido'
      })
    }

    if (!storeId) {
      return res.status(400).json({
        message: 'storeId es requerido'
      })
    }

    const existingOpenCashCut = await CashCut.findOne({
      staffId: staffId,
      brandId: brandId,
      storeId: storeId,
      status: { $in: OPEN_STATUSES }
    }).sort({ createdAt: -1 })

    if (existingOpenCashCut) {
      return res.status(400).json({
        message: 'El usuario ya tiene una caja abierta',
        cashCut: existingOpenCashCut
      })
    }

    const cashCut = new CashCut({
      staffId: staffId,
      brandId: brandId,
      storeId: storeId,
      openingDate: new Date(),
      closingDate: null,
      initialCash,
      systemTotals: {
        byMethod: {
          cash: 0,
          transfer: 0,
          card: 0,
        },
        byCategory: {
          products: 0,
          subscriptions: 0,
        },
        grandTotal: 0,
      },
      reportedTotals: {
        cashInHand: 0,
        transferReceipts: 0,
        cardSlips: 0,
      },
      cashDifference: 0,
      status: 'pending',
      salesIds: [],
      subscriptionAssignmentIds: [],
      notes: "",
    })

    await cashCut.save()

    res.status(201).json({
      message: 'Caja abierta exitosamente',
      cashCut,
    })
  } catch (error) {
    console.error('Error en open cash cut:', error)
    res.status(500).json({
      message: 'Error al abrir la caja',
      error: error.message,
    })
  }
})

router.post('/close/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { reportedTotals, notes, closingDate } = req.body

    // Usamos populate para obtener los montos de los gastos vinculados
    const cashCut = await CashCut.findById(id).populate('expensesIds')

    if (!cashCut) return res.status(404).json({ message: 'Corte de caja no encontrado' })
    if (!isOpenCashCut(cashCut.status)) return res.status(400).json({ message: 'El corte de caja ya fue cerrado' })

    // 1. Separar y sumar gastos por fuente
    const expenses = cashCut.expensesIds || []
    const cashExpenses = expenses
      .filter(e => e.source === 'cash_drawer')
      .reduce((sum, e) => sum + e.amount, 0)
    const bankExpenses = expenses
      .filter(e => e.source === 'bank_account')
      .reduce((sum, e) => sum + e.amount, 0)
    const totalExpenses = cashExpenses + bankExpenses

    // 2. Realizar cálculos integrando gastos
    const nextSystemTotals = mergeSystemTotals(cashCut.systemTotals, {}, totalExpenses)
    const nextReportedTotals = mergeReportedTotals(cashCut.reportedTotals, reportedTotals)

    // Pasamos los gastos a la función de diferencia
    const cashDifference = calculateCashDifference(
      cashCut.initialCash,
      nextSystemTotals,
      nextReportedTotals,
      cashExpenses,
      bankExpenses
    )

    cashCut.systemTotals = nextSystemTotals
    cashCut.reportedTotals = nextReportedTotals
    cashCut.cashDifference = cashDifference
    cashCut.status = resolveClosedStatus(cashDifference)
    cashCut.closingDate = closingDate ? new Date(closingDate) : new Date()

    if (notes !== undefined) cashCut.notes = notes

    await cashCut.save()
    res.status(200).json({ message: 'Caja cerrada exitosamente', cashCut })
  } catch (error) {
    console.error('Error en close cash cut:', error)
    res.status(500).json({ message: 'Error al cerrar la caja', error: error.message })
  }
})

// PATCH - Actualizar corte en curso
router.patch('/update/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      systemTotals,
      reportedTotals,
      saleId,
      salesIds,
      subscriptionAssignmentId,
      subscriptionAssignmentIds,
      notes,
      status,
    } = req.body

    const cashCut = await CashCut.findById(id)

    if (!cashCut) {
      return res.status(404).json({
        message: 'Corte de caja no encontrado'
      })
    }

    if (!isOpenCashCut(cashCut.status)) {
      return res.status(400).json({
        message: 'Solo se pueden modificar cortes de caja abiertos'
      })
    }

    if (systemTotals) {
      cashCut.systemTotals = mergeSystemTotals(cashCut.systemTotals, systemTotals)
    }

    if (reportedTotals) {
      cashCut.reportedTotals = mergeReportedTotals(cashCut.reportedTotals, reportedTotals)
    }

    if (systemTotals || reportedTotals) {
      cashCut.cashDifference = calculateCashDifference(
        cashCut.initialCash,
        cashCut.systemTotals,
        cashCut.reportedTotals
      )
    }

    const nextSalesIds = uniqueIds(cashCut.salesIds, salesIds, saleId)
    const nextSubscriptionAssignmentIds = uniqueIds(
      cashCut.subscriptionAssignmentIds,
      subscriptionAssignmentIds,
      subscriptionAssignmentId
    )

    cashCut.salesIds = nextSalesIds
    cashCut.subscriptionAssignmentIds = nextSubscriptionAssignmentIds

    if (notes !== undefined) {
      cashCut.notes = notes
    }

    if (status && OPEN_STATUSES.includes(status)) {
      cashCut.status = status
    }

    await cashCut.save()

    res.status(200).json({
      message: 'Corte de caja actualizado exitosamente',
      cashCut,
    })
  } catch (error) {
    console.error('Error en update cash cut:', error)
    res.status(500).json({
      message: 'Error al actualizar el corte de caja',
      error: error.message,
    })
  }
})

// GET - Obtener corte abierto por usuario
router.get('/open/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const brandId = req.headers['x-brand-id'] || req.query.brandId
    const storeId = req.headers['x-store-id'] || req.query.storeId
    const filters = {
      staffId: userId,
      status: { $in: OPEN_STATUSES }
    }

    if (brandId) {
      filters.brandId = brandId
    }

    if (storeId) {
      filters.storeId = storeId
    }

    const cashCut = await CashCut.findOne(filters).sort({ createdAt: -1 })

    if (!cashCut) {
      return res.status(404).json({
        message: 'No hay una caja abierta para este usuario'
      })
    }

    res.status(200).json({
      message: 'Caja abierta obtenida exitosamente',
      cashCut,
    })
  } catch (error) {
    console.error('Error en get open cash cut:', error)
    res.status(500).json({
      message: 'Error al obtener la caja abierta',
      error: error.message,
    })
  }
})

// GET - Obtener todos los cortes
router.get('/getAll', async (req, res) => {
  try {
    const { userId, staffId, status } = req.query
    const brandId = req.headers['x-brand-id'] || req.query.brandId
    const storeId = req.headers['x-store-id'] || req.query.storeId
    const filters = {}

    if (staffId || userId) {
      filters.staffId = staffId || userId
    }

    if (brandId) {
      filters.brandId = brandId
    }

    if (storeId) {
      filters.storeId = storeId
    }

    if (status) {
      filters.status = status
    }

    const cashCuts = await CashCut.find(filters)
      .populate('staffId', 'username email')
      .select("staffId openingDate closingDate initialCash systemTotals reportedTotals cashDifference status")
      .sort({ createdAt: -1 })

    res.status(200).json({
      message: 'Cortes de caja obtenidos exitosamente',
      count: cashCuts.length,
      cashCuts,
    })
  } catch (error) {
    console.error('Error en getAll cash cuts:', error)
    res.status(500).json({
      message: 'Error al obtener los cortes de caja',
      error: error.message,
    })
  }
})

// GET - Obtener corte por id
router.get('/getById/:id', async (req, res) => {
  try {
    const { id } = req.params
    const cashCut = await CashCut.findById(id)
      .populate("staffId", "username email profile")
      .populate("salesIds")
      .populate("subscriptionAssignmentIds")
      .populate('expensesIds')

    if (!cashCut) {
      return res.status(404).json({
        message: 'Corte de caja no encontrado'
      })
    }

    res.status(200).json({
      message: 'Corte de caja obtenido exitosamente',
      cashCut,
    })
  } catch (error) {
    console.error('Error en getById cash cut:', error)
    res.status(500).json({
      message: 'Error al obtener el corte de caja',
      error: error.message,
    })
  }
})

// DELETE - Eliminar corte por id
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params
    const cashCut = await CashCut.findByIdAndDelete(id)

    if (!cashCut) {
      return res.status(404).json({
        message: 'Corte de caja no encontrado'
      })
    }

    res.status(200).json({
      message: 'Corte de caja eliminado exitosamente',
      cashCut,
    })
  } catch (error) {
    console.error('Error en delete cash cut:', error)
    res.status(500).json({
      message: 'Error al eliminar el corte de caja',
      error: error.message,
    })
  }
})

// Helper function to update cash cut with new document (sale or subscription assignment)
// Handles null/undefined cashCutId internally without throwing errors
export const updateCashCutWithDocument = async (cashCutId, documentType, documentId, documentData) => {
  // Manejar null/undefined internamente, sin propagar errores
  if (!cashCutId || !documentId) return null

  try {
    const cashCut = await CashCut.findById(cashCutId)
    if (!cashCut) return null

    // Determinar el método de pago y el monto según el tipo de documento
    let paymentMethod = 'cash'
    let amount = 0
    let categoryField = 'products'

    if (documentType === 'sale') {
      paymentMethod = documentData?.payment?.method || 'cash'
      amount = documentData?.totals?.total || 0
      categoryField = 'products'

      // Agregar a salesIds si no existe
      if (!cashCut.salesIds.includes(documentId)) {
        cashCut.salesIds.push(documentId)
      }
    } else if (documentType === 'subscription') {
      paymentMethod = documentData?.paymentMethod || 'cash'
      amount = documentData?.pricePaid || 0
      categoryField = 'subscriptions'

      // Agregar a subscriptionAssignmentIds si no existe
      if (!cashCut.subscriptionAssignmentIds.includes(documentId)) {
        cashCut.subscriptionAssignmentIds.push(documentId)
      }
    }

    // Actualizar systemTotals si hay monto válido
    if (amount > 0) {
      // Actualizar byMethod
      if (paymentMethod && cashCut.systemTotals.byMethod.hasOwnProperty(paymentMethod)) {
        cashCut.systemTotals.byMethod[paymentMethod] =
          (cashCut.systemTotals.byMethod[paymentMethod] || 0) + amount
      }

      // Actualizar byCategory
      if (cashCut.systemTotals.byCategory.hasOwnProperty(categoryField)) {
        cashCut.systemTotals.byCategory[categoryField] =
          (cashCut.systemTotals.byCategory[categoryField] || 0) + amount
      }

      // Recalcular grandTotal sumando los métodos de pago
      cashCut.systemTotals.grandTotal =
        (cashCut.systemTotals.byMethod.cash || 0) +
        (cashCut.systemTotals.byMethod.transfer || 0) +
        (cashCut.systemTotals.byMethod.card || 0)
    }

    await cashCut.save()
    return cashCut
  } catch (error) {
    console.error(`Error updating cash cut ${cashCutId}:`, error)
    return null // No propagar el error, solo retornar null
  }
}

export const linkExpenseToCashCut = async (cashCutId, expenseId) => {
  if (!cashCutId || !expenseId) return null;

  try {
    const cashCut = await CashCut.findById(cashCutId);
    if (!cashCut) return null;

    // Solo hacemos el push si no existe ya en el array
    if (!cashCut.expensesIds.includes(expenseId)) {
      cashCut.expensesIds.push(expenseId);
      await cashCut.save();
    }

    return cashCut;
  } catch (error) {
    console.error(`Error linking expense ${expenseId} to cash cut ${cashCutId}:`, error);
    return null;
  }
};

// PATCH - Recalcular todos los totales de un CashCut a partir de sus documentos vinculados
// Util cuando se modifica una venta, suscripcion o gasto ya registrado en el corte
router.patch('/recalculate/:id', async (req, res) => {
  try {
    const { id } = req.params

    const cashCut = await CashCut.findById(id)
    if (!cashCut) {
      return res.status(404).json({ message: 'Corte de caja no encontrado' })
    }

    // Obtener los documentos reales vinculados al corte
    const [sales, subscriptions, expenses] = await Promise.all([
      Sale.find({ _id: { $in: cashCut.salesIds } }).select('totals payment').lean(),
      SubscriptionAssignment.find({ _id: { $in: cashCut.subscriptionAssignmentIds } }).select('pricePaid paymentMethod').lean(),
      Expense.find({ _id: { $in: cashCut.expensesIds } }).select('amount source').lean(),
    ])

    // Recalcular byMethod desde cero sumando ventas + suscripciones
    const byMethod = { cash: 0, transfer: 0, card: 0 }

    for (const sale of sales) {
      const method = sale?.payment?.method
      const amount = Number(sale?.totals?.total || 0)
      if (method && byMethod.hasOwnProperty(method)) {
        byMethod[method] += amount
      }
    }

    for (const sub of subscriptions) {
      const method = sub?.paymentMethod
      const amount = Number(sub?.pricePaid || 0)
      if (method && byMethod.hasOwnProperty(method)) {
        byMethod[method] += amount
      }
    }

    // Recalcular byCategory desde cero
    const byCategory = {
      products: sales.reduce((acc, s) => acc + Number(s?.totals?.total || 0), 0),
      subscriptions: subscriptions.reduce((acc, s) => acc + Number(s?.pricePaid || 0), 0),
    }

    // Separar gastos por origen
    const cashExpenses = expenses
      .filter(e => e.source === 'cash_drawer')
      .reduce((acc, e) => acc + Number(e.amount || 0), 0)
    const bankExpenses = expenses
      .filter(e => e.source === 'bank_account')
      .reduce((acc, e) => acc + Number(e.amount || 0), 0)
    const totalExpenses = cashExpenses + bankExpenses

    // grandTotal = ingresos brutos - gastos totales
    const grandTotal = (byMethod.cash + byMethod.transfer + byMethod.card) - totalExpenses

    const nextSystemTotals = { byMethod, byCategory, grandTotal }

    // Recalcular la diferencia de caja usando los reportedTotals existentes
    const cashDifference = calculateCashDifference(
      cashCut.initialCash,
      nextSystemTotals,
      cashCut.reportedTotals,
      cashExpenses,
      bankExpenses
    )

    cashCut.systemTotals = nextSystemTotals
    cashCut.cashDifference = cashDifference

    // Si el corte ya estaba cerrado, recalcular su estado final
    if (!isOpenCashCut(cashCut.status)) {
      cashCut.status = resolveClosedStatus(cashDifference)
    }

    await cashCut.save()

    return res.status(200).json({
      message: 'Corte de caja recalculado exitosamente',
      cashCut,
    })
  } catch (error) {
    console.error('Error en recalculate cash cut:', error)
    return res.status(500).json({
      message: 'Error al recalcular el corte de caja',
      error: error.message,
    })
  }
})

export const routeConfig = { path: "/v1/cash-cuts", router }