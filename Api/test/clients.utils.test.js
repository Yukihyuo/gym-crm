import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeClientCreateInput,
  resolveUsername,
  resolveDefaultPassword,
  buildClientCreatePayload,
  buildClientResponse,
} from '../src/utils/clients.utils.js'

test('normalizeClientCreateInput: normaliza email, accessCode y phone', () => {
  const input = normalizeClientCreateInput({
    email: '  Cliente@Mail.COM ',
    accessCode: ' ABC ',
    storeId: 'store1',
    username: ' user ',
    profile: { phone: ' 55-1234 ' },
  })
  assert.equal(input.normalizedEmail, 'cliente@mail.com')
  assert.equal(input.normalizedAccessCode, 'ABC')
  assert.equal(input.normalizedPhone, '55-1234')
})

test('resolveUsername: usa el username explícito si viene', () => {
  assert.equal(resolveUsername({ requestedUsername: '  ana  ', normalizedEmail: 'ana@mail.com' }), 'ana')
})

test('resolveUsername: deriva del email si no hay username', () => {
  assert.equal(resolveUsername({ requestedUsername: '', normalizedEmail: 'ana@mail.com' }), 'ana')
})

test('resolveUsername: lanza si no hay username ni email', () => {
  assert.throws(() => resolveUsername({ requestedUsername: '', normalizedEmail: '' }), /Username inválido/)
})

test('resolveDefaultPassword: sin email y sin accessCode -> aleatorio', () => {
  const password = resolveDefaultPassword({
    username: 'ana',
    normalizedEmail: '',
    normalizedAccessCode: '',
    generateRandomValue: () => 'RANDOM6',
  })
  assert.equal(password, 'RANDOM6')
})

test('resolveDefaultPassword: sin email pero con accessCode -> accessCode', () => {
  const password = resolveDefaultPassword({
    username: 'ana',
    normalizedEmail: '',
    normalizedAccessCode: 'A1B2',
    generateRandomValue: () => 'RANDOM6',
  })
  assert.equal(password, 'A1B2')
})

test('resolveDefaultPassword: con email -> username (flujo del correo de bienvenida)', () => {
  const password = resolveDefaultPassword({
    username: 'ana',
    normalizedEmail: 'ana@mail.com',
    normalizedAccessCode: 'A1B2',
    generateRandomValue: () => 'RANDOM6',
  })
  assert.equal(password, 'ana')
})

test('buildClientCreatePayload: arma el documento con brandId del store', () => {
  const payload = buildClientCreatePayload({
    store: { _id: 's1', brandId: 'b1' },
    username: 'ana',
    accessCode: 'A1B2',
    normalizedEmail: 'ana@mail.com',
    normalizedPhone: '555',
    profile: { names: 'Ana', lastNames: 'Lopez' },
    hashedPassword: 'HASH',
  })
  assert.equal(payload.brandId, 'b1')
  assert.equal(payload.storeId, 's1')
  assert.equal(payload.email, 'ana@mail.com')
  assert.equal(payload.profile.names, 'Ana')
})

test('buildClientResponse: expone los campos esperados sin filtrar password', () => {
  const client = {
    _id: 'c1',
    username: 'ana',
    email: 'ana@mail.com',
    profile: { names: 'Ana' },
    status: true,
    brandId: 'b1',
    storeId: 's1',
    accessCode: 'A1B2',
  }
  const res = buildClientResponse(client)
  assert.equal(res.id, 'c1')
  assert.equal(res.accessCode, 'A1B2')
  assert.equal(res.password, undefined)
})
