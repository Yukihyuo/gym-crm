import dayjs from 'dayjs'

import CashCut from '../models/CashCut.js'

export const CASH_CUT_ERROR_CODES = {
  REQUIRED: 'CASH_CUT_REQUIRED',
  INVALID: 'CASH_CUT_INVALID',
  EXPIRED: 'CASH_CUT_EXPIRED',
  STORE_MISMATCH: 'CASH_CUT_STORE_MISMATCH',
}

const buildCashCutError = (code, message) => {
  const error = new Error(message)
  error.statusCode = 409
  error.code = code
  return error
}

// Una caja vence al terminar el día en que se abrió.
export const expireStaleCashCuts = async (filter = {}) => {
  const now = dayjs()

  const result = await CashCut.updateMany(
    {
      ...filter,
      status: 'pending',
      openingDate: { $lt: now.startOf('day').toDate() },
    },
    { $set: { status: 'incomplete', closingDate: now.toDate() } }
  )

  return result.modifiedCount
}

/**
 * Verifica que la caja enviada en un movimiento (venta, membresía, gasto) siga abierta
 * y pertenezca a la sucursal donde se registra. Lanza un error 409 con `code` si no.
 */
export const assertUsableCashCut = async (cashCutId, { storeId, required = false } = {}) => {
  if (!cashCutId) {
    if (required) {
      throw buildCashCutError(
        CASH_CUT_ERROR_CODES.REQUIRED,
        'Debes abrir una caja en esta sucursal antes de registrar cobros'
      )
    }
    return null
  }

  await expireStaleCashCuts({ _id: cashCutId })

  const cashCut = await CashCut.findById(cashCutId)

  if (!cashCut) {
    throw buildCashCutError(CASH_CUT_ERROR_CODES.INVALID, 'La caja indicada no existe')
  }

  if (cashCut.status !== 'pending') {
    throw buildCashCutError(
      cashCut.status === 'incomplete' ? CASH_CUT_ERROR_CODES.EXPIRED : CASH_CUT_ERROR_CODES.INVALID,
      cashCut.status === 'incomplete'
        ? 'La caja expiró y se cerró automáticamente. Abre una nueva caja'
        : 'La caja indicada ya está cerrada. Abre una nueva caja'
    )
  }

  if (storeId && cashCut.storeId !== storeId) {
    throw buildCashCutError(
      CASH_CUT_ERROR_CODES.STORE_MISMATCH,
      'La caja abierta pertenece a otra sucursal. Abre una caja en esta sucursal'
    )
  }

  return cashCut
}

export const sendCashCutError = (res, error) =>
  res.status(error.statusCode).json({ message: error.message, code: error.code })
