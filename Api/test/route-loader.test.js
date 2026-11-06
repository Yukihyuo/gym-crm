import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const routesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'routes')

test('todas las rutas exportan routeConfig válido con paths únicos', async () => {
  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.js') && !f.startsWith('.'))

  assert.ok(files.length >= 19, `Se esperaban al menos 19 rutas, se encontraron ${files.length}`)

  const seenPaths = new Set()

  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(routesDir, file)).href)

    assert.ok(mod.routeConfig, `${file} debe exportar routeConfig`)
    assert.equal(typeof mod.routeConfig.path, 'string', `${file}: routeConfig.path debe ser string`)
    assert.match(mod.routeConfig.path, /^\/v1\//, `${file}: routeConfig.path debe empezar con /v1/`)
    assert.equal(typeof mod.routeConfig.router, 'function', `${file}: routeConfig.router debe ser una función (Router de Express)`)
    assert.ok(!seenPaths.has(mod.routeConfig.path), `${file}: path duplicado ${mod.routeConfig.path}`)
    seenPaths.add(mod.routeConfig.path)
  }
})
