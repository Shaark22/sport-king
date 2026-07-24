/**
 * API smoke tests: gallery endpoints + product inStock persistence.
 * Run with dev server: npm run dev (in another terminal), then npm run test:api
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(ROOT, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

const BASE = process.env.API_BASE || 'http://localhost:5173'

async function json(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

let failed = 0
function ok(label, condition) {
  if (condition) {
    console.log(`OK  ${label}`)
    return
  }
  failed += 1
  console.error(`FAIL ${label}`)
}

const health = await json('/api/health')
ok('health', health.res.ok && health.data.ok === true)

const gallery = await json('/api/gallery')
ok('gallery public', gallery.res.ok && Array.isArray(gallery.data.photos))

const storeBefore = await json('/api/store')
ok('store', storeBefore.res.ok && storeBefore.data.products?.length > 0)

const login = await json('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'sportking' }),
})
ok('admin login', login.res.ok && login.data.token)
const token = login.data.token

const product = storeBefore.data.products[0]
const put = await json(`/api/products/${product.id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ inStock: false }),
})
ok('set inStock false', put.res.ok && put.data.inStock === false)

const storeAfter = await json('/api/store')
const updated = storeAfter.data.products.find((p) => p.id === product.id)
ok('store reflects inStock false', updated?.inStock === false)

await json(`/api/products/${product.id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ inStock: true }),
})

const galleryAll = await json('/api/gallery/all', {
  headers: { Authorization: `Bearer ${token}` },
})
ok('gallery admin', galleryAll.res.ok && Array.isArray(galleryAll.data.photos))

console.log(failed ? `\n${failed} test(s) failed` : '\nAll API tests passed')
process.exit(failed ? 1 : 0)
