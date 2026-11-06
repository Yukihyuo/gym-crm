import test from 'node:test'
import assert from 'node:assert/strict'
import dayjs from 'dayjs'
import { describeMembership, MEMBERSHIP_STATES } from '../src/services/ClientMembership.services.js'

test('describeMembership: active', () => {
  assert.equal(
    describeMembership({ state: MEMBERSHIP_STATES.ACTIVE, endDate: dayjs('2026-12-31').toDate() }),
    'Vigente hasta 31/12/2026'
  )
})

test('describeMembership: expiring', () => {
  assert.equal(
    describeMembership({ state: MEMBERSHIP_STATES.EXPIRING, endDate: dayjs('2026-11-10').toDate() }),
    'Vence 10/11/2026'
  )
})

test('describeMembership: upcoming', () => {
  assert.equal(
    describeMembership({ state: MEMBERSHIP_STATES.UPCOMING, startDate: dayjs('2026-11-20').toDate() }),
    'Inicia 20/11/2026'
  )
})

test('describeMembership: expired', () => {
  assert.equal(
    describeMembership({ state: MEMBERSHIP_STATES.EXPIRED, endDate: dayjs('2026-10-01').toDate() }),
    'Vencida 01/10/2026'
  )
})

test('describeMembership: cancelled', () => {
  assert.equal(describeMembership({ state: MEMBERSHIP_STATES.CANCELLED }), 'Membresía cancelada')
})

test('describeMembership: sin membresía', () => {
  assert.equal(describeMembership({ state: MEMBERSHIP_STATES.NONE }), 'Sin membresía')
})
