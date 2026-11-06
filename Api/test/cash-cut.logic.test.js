import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mergeSystemTotals,
  mergeReportedTotals,
  calculateCashDifference,
  resolveClosedStatus,
} from '../src/routes/CashCuts.js'

test('mergeSystemTotals: sin datos produce totales en cero', () => {
  const totals = mergeSystemTotals()
  assert.deepEqual(totals.byMethod, { cash: 0, transfer: 0, card: 0 })
  assert.deepEqual(totals.byCategory, { products: 0, subscriptions: 0 })
  assert.equal(totals.grandTotal, 0)
})

test('mergeSystemTotals: conserva el valor actual y resta gastos', () => {
  const current = {
    byMethod: { cash: 100, transfer: 0, card: 50 },
    byCategory: { products: 150, subscriptions: 0 },
  }
  const totals = mergeSystemTotals(current, {}, 30)
  assert.equal(totals.byMethod.cash, 100)
  assert.equal(totals.byMethod.card, 50)
  assert.equal(totals.grandTotal, 120)
})

test('mergeSystemTotals: respeta grandTotal entrante', () => {
  const current = { byMethod: { cash: 100, transfer: 0, card: 0 }, byCategory: {} }
  const totals = mergeSystemTotals(current, { grandTotal: 999 }, 0)
  assert.equal(totals.grandTotal, 999)
})

test('mergeReportedTotals: fusiona valores entrantes sobre los actuales', () => {
  const merged = mergeReportedTotals(
    { cashInHand: 100, transferReceipts: 20, cardSlips: 10 },
    { cashInHand: 150 }
  )
  assert.deepEqual(merged, { cashInHand: 150, transferReceipts: 20, cardSlips: 10 })
})

test('calculateCashDifference: caja cuadrada da 0', () => {
  const diff = calculateCashDifference(
    100,
    { byMethod: { cash: 200, card: 50, transfer: 50 } },
    { cashInHand: 300, cardSlips: 50, transferReceipts: 50 }
  )
  assert.equal(diff, 0)
})

test('calculateCashDifference: faltante de efectivo', () => {
  const diff = calculateCashDifference(
    100,
    { byMethod: { cash: 200, card: 0, transfer: 0 } },
    { cashInHand: 250, cardSlips: 0, transferReceipts: 0 }
  )
  assert.equal(diff, -50)
})

test('calculateCashDifference: considera gastos de caja', () => {
  const diff = calculateCashDifference(
    100,
    { byMethod: { cash: 200, card: 100, transfer: 50 } },
    { cashInHand: 280, cardSlips: 100, transferReceipts: 50 },
    20,
    0
  )
  assert.equal(diff, 0)
})

test('resolveClosedStatus: balanced/shortage/surplus', () => {
  assert.equal(resolveClosedStatus(0), 'balanced')
  assert.equal(resolveClosedStatus(-1), 'shortage')
  assert.equal(resolveClosedStatus(1), 'surplus')
})
