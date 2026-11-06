import test from 'node:test'
import assert from 'node:assert/strict'
import dayjs from 'dayjs'
import { calculateEndDate, buildSubscriptionsError } from '../src/utils/subscriptions.utils.js'

test('calculateEndDate: sin duración o valor 0 devuelve null', () => {
  const start = new Date('2026-01-15T10:00:00')
  assert.equal(calculateEndDate(start, undefined), null)
  assert.equal(calculateEndDate(start, { value: 0, unit: 'days' }), null)
})

test('calculateEndDate: duración negativa devuelve null', () => {
  assert.equal(calculateEndDate(new Date(), { value: -1, unit: 'days' }), null)
})

test('calculateEndDate: 1 día termina al final del mismo día', () => {
  const start = new Date('2026-01-15T10:00:00')
  const end = calculateEndDate(start, { value: 1, unit: 'days' })
  assert.equal(dayjs(end).format('YYYY-MM-DD HH:mm'), '2026-01-15 23:59')
})

test('calculateEndDate: suma meses y cierra al final del día', () => {
  const start = new Date('2026-01-15T10:00:00')
  const end = calculateEndDate(start, { value: 1, unit: 'months' })
  assert.equal(dayjs(end).format('YYYY-MM-DD'), '2026-02-15')
  assert.equal(dayjs(end).format('HH:mm'), '23:59')
})

test('calculateEndDate: unit por defecto es months', () => {
  const start = new Date('2026-01-31T10:00:00')
  const end = calculateEndDate(start, { value: 1 })
  assert.equal(dayjs(end).format('YYYY-MM-DD'), '2026-02-28')
})

test('calculateEndDate: suma semanas', () => {
  const start = new Date('2026-01-01T10:00:00')
  const end = calculateEndDate(start, { value: 2, unit: 'weeks' })
  assert.equal(dayjs(end).format('YYYY-MM-DD'), '2026-01-15')
})

test('buildSubscriptionsError: incluye message y statusCode', () => {
  const err = buildSubscriptionsError('boom', 422)
  assert.ok(err instanceof Error)
  assert.equal(err.message, 'boom')
  assert.equal(err.statusCode, 422)
})
