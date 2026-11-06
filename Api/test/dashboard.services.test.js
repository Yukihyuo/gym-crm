import test from 'node:test'
import assert from 'node:assert/strict'
import dayjs from 'dayjs'
import { resolvePeriodRange, buildCreatedAtFilter } from '../src/services/DashboardOverview.services.js'

const NOW = dayjs('2026-11-05T15:00:00')

test('resolvePeriodRange: today', () => {
  const r = resolvePeriodRange('today', NOW)
  assert.equal(r.period, 'today')
  assert.equal(dayjs(r.current.start).format('YYYY-MM-DD HH:mm'), '2026-11-05 00:00')
  assert.equal(dayjs(r.current.end).format('YYYY-MM-DD HH:mm'), '2026-11-05 15:00')
  assert.equal(dayjs(r.previous.start).format('YYYY-MM-DD HH:mm'), '2026-11-04 00:00')
  assert.equal(dayjs(r.previous.end).format('YYYY-MM-DD HH:mm'), '2026-11-04 15:00')
})

test('resolvePeriodRange: week', () => {
  const r = resolvePeriodRange('week', NOW)
  assert.equal(r.period, 'week')
  assert.equal(dayjs(r.current.start).format('YYYY-MM-DD'), '2026-10-30')
  assert.equal(dayjs(r.previous.start).format('YYYY-MM-DD'), '2026-10-23')
  assert.equal(dayjs(r.previous.end).format('YYYY-MM-DD HH:mm'), '2026-10-29 15:00')
})

test('resolvePeriodRange: month', () => {
  const r = resolvePeriodRange('month', NOW)
  assert.equal(r.period, 'month')
  assert.equal(dayjs(r.current.start).format('YYYY-MM-DD'), '2026-11-01')
  assert.equal(dayjs(r.previous.start).format('YYYY-MM-DD'), '2026-10-01')
  assert.equal(dayjs(r.previous.end).format('YYYY-MM-DD HH:mm'), '2026-10-05 15:00')
})

test('resolvePeriodRange: periodo desconocido cae a today', () => {
  const r = resolvePeriodRange('invalid', NOW)
  assert.equal(r.period, 'today')
})

test('buildCreatedAtFilter: sin datos devuelve undefined', () => {
  assert.equal(buildCreatedAtFilter({}), undefined)
})

test('buildCreatedAtFilter: con period devuelve un rango de fechas', () => {
  const f = buildCreatedAtFilter({ period: 'today' })
  assert.ok(f.$gte instanceof Date)
  assert.ok(f.$lte instanceof Date)
})

test('buildCreatedAtFilter: con startDate/endDate explícitas', () => {
  const f = buildCreatedAtFilter({ startDate: '2026-01-01', endDate: '2026-01-31' })
  assert.equal(dayjs(f.$gte).format('YYYY-MM-DD'), '2026-01-01')
  assert.equal(dayjs(f.$lte).format('YYYY-MM-DD'), '2026-01-31')
})
