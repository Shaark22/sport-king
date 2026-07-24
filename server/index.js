import { randomBytes, timingSafeEqual } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import multer from 'multer'
import { createAnalyticsStore } from './analytics.js'
import { createErrorLog } from './errors.js'
import { createGalleryStore } from './gallery.js'
import { createOrdersStore } from './orders.js'
import { createSettingsStore } from './settings.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadEnvFile() {
  const envPath = join(ROOT, '.env')
  if (!existsSync(envPath)) return
  const fromFile = {}
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
    fromFile[key] = value
  }
  for (const [key, value] of Object.entries(fromFile)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile()

const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'server', 'data')
const UPLOADS_DIR = join(DATA_DIR, 'uploads')
const STORE_PATH = join(DATA_DIR, 'store.json')
const ANALYTICS_PATH = join(DATA_DIR, 'analytics.json')
const ORDERS_PATH = join(DATA_DIR, 'orders.json')
const GALLERY_PATH = join(DATA_DIR, 'gallery.json')
const SETTINGS_PATH = join(DATA_DIR, 'settings.json')
const ERRORS_PATH = join(DATA_DIR, 'errors.json')
const DEFAULT_SETTINGS_PATH = join(ROOT, 'server', 'data', 'settings.defaults.json')
const DEFAULT_GALLERY_PATH = join(ROOT, 'server', 'data', 'gallery.json')
const DEFAULTS_PATH = join(ROOT, 'server', 'data', 'store.json')
const BUNDLED_UPLOADS_DIR = join(ROOT, 'server', 'data', 'uploads')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sportking'
const ADMIN_PATH = (process.env.ADMIN_PATH || 'sk-manage-kz8m2p').replace(/^\/|\/$/g, '')
const SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS) || 8
const LOGIN_MAX_ATTEMPTS = Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS) || 5
const LOGIN_WINDOW_MS = Number(process.env.ADMIN_LOGIN_WINDOW_MS) || 15 * 60 * 1000
const UPLOAD_MAX_PER_HOUR = Number(process.env.UPLOAD_MAX_PER_HOUR) || 30
const PORT = Number(process.env.PORT) || 3001
const isProd = process.env.NODE_ENV === 'production'

if (isProd && ADMIN_PASSWORD === 'sportking') {
  console.error(
    'FATAL: Set a strong ADMIN_PASSWORD in production (default password is not allowed).',
  )
  process.exit(1)
}

mkdirSync(DATA_DIR, { recursive: true })
mkdirSync(UPLOADS_DIR, { recursive: true })
seedDataFromProject()

function seedDataFromProject() {
  if (!existsSync(STORE_PATH) && existsSync(DEFAULTS_PATH)) {
    writeFileSync(STORE_PATH, readFileSync(DEFAULTS_PATH, 'utf8'))
  }

  if (!existsSync(SETTINGS_PATH) && existsSync(DEFAULT_SETTINGS_PATH)) {
    writeFileSync(SETTINGS_PATH, readFileSync(DEFAULT_SETTINGS_PATH, 'utf8'))
  }

  if (!existsSync(GALLERY_PATH) && existsSync(DEFAULT_GALLERY_PATH)) {
    writeFileSync(GALLERY_PATH, readFileSync(DEFAULT_GALLERY_PATH, 'utf8'))
  }

  if (!existsSync(BUNDLED_UPLOADS_DIR)) return

  for (const file of readdirSync(BUNDLED_UPLOADS_DIR)) {
    if (file === '.gitkeep') continue
    const target = join(UPLOADS_DIR, file)
    if (!existsSync(target)) {
      copyFileSync(join(BUNDLED_UPLOADS_DIR, file), target)
    }
  }
}

const sessions = new Map()
const analytics = createAnalyticsStore(ANALYTICS_PATH)
const orders = createOrdersStore(ORDERS_PATH)
const gallery = createGalleryStore(GALLERY_PATH)
const siteSettings = createSettingsStore(SETTINGS_PATH, DEFAULT_SETTINGS_PATH)
const errorLog = createErrorLog(ERRORS_PATH)
const rateBuckets = new Map()
const loginRateBuckets = new Map()
const uploadRateBuckets = new Map()

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function safeEqualPassword(input, expected) {
  const a = Buffer.from(String(input ?? ''))
  const b = Buffer.from(String(expected ?? ''))
  if (a.length !== b.length) {
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

function pruneExpiredSessions() {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(token)
  }
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

function rateLimit(req, max = 120, windowMs = 60_000, buckets = rateBuckets) {
  const ip = clientIp(req)
  const now = Date.now()
  const bucket = buckets.get(ip) || { count: 0, resetAt: now + windowMs }
  if (now > bucket.resetAt) {
    bucket.count = 0
    bucket.resetAt = now + windowMs
  }
  bucket.count += 1
  buckets.set(ip, bucket)
  return bucket.count <= max
}

function loginRateLimit(req) {
  return rateLimit(req, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, loginRateBuckets)
}

function uploadRateLimit(req) {
  return rateLimit(req, UPLOAD_MAX_PER_HOUR, 60 * 60 * 1000, uploadRateBuckets)
}

function logApiError(req, err, status = 500) {
  try {
    errorLog.logError({
      message: err?.message || String(err),
      path: req?.originalUrl || req?.url,
      status,
      stack: err?.stack,
    })
  } catch {
    /* ignore logging failures */
  }
}

function readStore() {
  if (!existsSync(STORE_PATH)) {
    if (existsSync(DEFAULTS_PATH)) {
      const defaults = readFileSync(DEFAULTS_PATH, 'utf8')
      writeFileSync(STORE_PATH, defaults)
    } else {
      writeFileSync(
        STORE_PATH,
        JSON.stringify({ version: 2, products: [], categories: [], reviews: [] }),
      )
    }
  }
  return normalizeStoreForResponse(ensureReviews(JSON.parse(readFileSync(STORE_PATH, 'utf8'))))
}

function writeStore(store) {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2))
}

function ensureReviews(store) {
  if (!Array.isArray(store.reviews)) store.reviews = []
  return store
}

function normalizeInStock(value) {
  return value !== false && value !== 'false' && value !== 0
}

function normalizeProductInput(data) {
  const next = { ...data }
  if ('inStock' in next) {
    next.inStock = next.inStock === true || next.inStock === 'true'
  }
  return next
}

function normalizeStoreForResponse(store) {
  store.products = store.products.map((product) => ({
    ...product,
    inStock: normalizeInStock(product.inStock),
  }))
  return store
}

function syncProductReviewStats(store, productId) {
  const reviews = store.reviews.filter((r) => r.productId === productId)
  const product = store.products.find((p) => p.id === productId)
  if (!product) return
  product.reviewsCount = reviews.length
  if (reviews.length > 0) {
    const avg =
      reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
      reviews.length
    product.rating = Math.round(avg * 10) / 10
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

function authMiddleware(req, res, next) {
  pruneExpiredSessions()
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg'
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)
      ? ext
      : 'jpg'
    cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}.${safeExt}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || ''
    if (ext === 'svg' || file.mimetype === 'image/svg+xml') {
      cb(new Error('SVG uploads are not allowed'))
      return
    }
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only images allowed'))
  },
})

const app = express()

if (isProd) {
  app.set('trust proxy', 1)
}

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/store', (_req, res) => {
  res.json(readStore())
})

app.get('/api/gallery', (_req, res) => {
  try {
    res.json({ photos: gallery.list({ publishedOnly: true }) })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка загрузки галереи' })
  }
})

app.get('/api/gallery/all', authMiddleware, (_req, res) => {
  try {
    res.json({ photos: gallery.list({ publishedOnly: false }) })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка загрузки галереи' })
  }
})

app.post('/api/gallery', authMiddleware, (req, res) => {
  try {
    const photo = gallery.create(req.body || {})
    res.status(201).json(photo)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Не удалось добавить фото' })
  }
})

app.put('/api/gallery/:id', authMiddleware, (req, res) => {
  try {
    res.json(gallery.update(req.params.id, req.body || {}))
  } catch (err) {
    const status = err.message === 'Фото не найдено' ? 404 : 400
    res.status(status).json({ error: err.message || 'Не удалось обновить фото' })
  }
})

app.delete('/api/gallery/:id', authMiddleware, (req, res) => {
  try {
    res.json(gallery.remove(req.params.id))
  } catch (err) {
    const status = err.message === 'Фото не найдено' ? 404 : 400
    res.status(status).json({ error: err.message || 'Не удалось удалить фото' })
  }
})

app.get('/api/settings', (_req, res) => {
  res.json(siteSettings.getSettings())
})

app.put('/api/settings', authMiddleware, (req, res) => {
  try {
    const updated = siteSettings.updateSettings(req.body || {})
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Не удалось сохранить настройки' })
  }
})

app.post('/api/settings/reset', authMiddleware, (_req, res) => {
  try {
    res.json(siteSettings.resetSettings())
  } catch (err) {
    logApiError(req, err, 500)
    res.status(500).json({ error: err.message || 'Не удалось сбросить настройки' })
  }
})

app.post('/api/auth/login', (req, res) => {
  if (!loginRateLimit(req)) {
    return res.status(429).json({
      error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    })
  }

  const { password } = req.body || {}
  if (!safeEqualPassword(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Неверный пароль' })
  }

  pruneExpiredSessions()
  loginRateBuckets.delete(clientIp(req))

  const token = randomBytes(32).toString('hex')
  sessions.set(token, {
    expiresAt: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  })
  res.json({ token })
})

app.get('/api/auth/me', (req, res) => {
  pruneExpiredSessions()
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  res.json({ ok: true })
})

app.post('/api/orders', (req, res) => {
  if (!rateLimit(req, 15, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Слишком много заявок. Попробуйте позже.' })
  }
  try {
    const store = readStore()
    const body = req.body || {}
    const productId = String(body.productId || '').trim()
    const product = store.products.find((p) => p.id === productId)
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' })
    }
    const order = orders.createOrder({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productPrice: product.price,
      customerName: body.customerName,
      phone: body.phone,
      comment: body.comment,
    })
    res.status(201).json(order)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Не удалось отправить заявку' })
  }
})

app.get('/api/orders', authMiddleware, (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    res.json(orders.listOrders({ status }))
  } catch (err) {
    logApiError(req, err, 500)
    res.status(500).json({ error: err.message || 'Ошибка загрузки заявок' })
  }
})

app.patch('/api/orders/:id', authMiddleware, (req, res) => {
  try {
    const order = orders.updateOrder(req.params.id, req.body || {})
    res.json(order)
  } catch (err) {
    const status = err.message === 'Заявка не найдена' ? 404 : 400
    res.status(status).json({ error: err.message || 'Не удалось обновить заявку' })
  }
})

app.delete('/api/orders/:id', authMiddleware, (req, res) => {
  try {
    res.json(orders.deleteOrder(req.params.id))
  } catch (err) {
    const status = err.message === 'Заявка не найдена' ? 404 : 400
    res.status(status).json({ error: err.message || 'Не удалось удалить заявку' })
  }
})

app.post('/api/analytics/event', (req, res) => {
  if (!rateLimit(req, 180)) {
    return res.status(429).json({ error: 'Too many requests' })
  }
  try {
    analytics.trackEvent(req.body)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid event' })
  }
})

app.get('/api/analytics', authMiddleware, (_req, res) => {
  try {
    const store = readStore()
    res.json(analytics.getSummary(store?.products ?? []))
  } catch (err) {
    logApiError(req, err, 500)
    res.status(500).json({ error: err.message || 'Ошибка статистики' })
  }
})

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  sessions.delete(token)
  res.json({ ok: true })
})

app.post('/api/upload', authMiddleware, (req, res, _next) => {
  if (!uploadRateLimit(req)) {
    return res.status(429).json({ error: 'Слишком много загрузок. Попробуйте позже.' })
  }
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
      return res.status(status).json({ error: err.message || 'Upload failed' })
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    res.json({ url: `/uploads/${req.file.filename}` })
  })
})

app.post('/api/products', authMiddleware, (req, res) => {
  const store = readStore()
  const data = normalizeProductInput(req.body || {})
  const id = data.id || data.slug || slugify(data.name)
  if (store.products.some((p) => p.id === id)) {
    return res.status(409).json({ error: 'Товар с таким ID уже существует' })
  }
  const product = { ...data, id, inStock: normalizeInStock(data.inStock) }
  if (typeof product.rating === 'number') {
    product.rating = Math.min(5, Math.max(0, product.rating))
  }
  store.products.push(product)
  writeStore(store)
  res.status(201).json(product)
})

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const store = readStore()
  const index = store.products.findIndex((p) => p.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Not found' })
  const patch = normalizeProductInput(req.body || {})
  delete patch.id
  if (typeof patch.rating === 'number') {
    patch.rating = Math.min(5, Math.max(0, patch.rating))
  }
  if (typeof patch.reviewsCount === 'number') {
    patch.reviewsCount = Math.max(0, Math.round(patch.reviewsCount))
  }
  if ('inStock' in patch) {
    patch.inStock = patch.inStock === true
  }
  store.products[index] = { ...store.products[index], ...patch }
  writeStore(store)
  res.json({ ...store.products[index], inStock: normalizeInStock(store.products[index].inStock) })
})

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const store = readStore()
  store.products = store.products.filter((p) => p.id !== req.params.id)
  store.reviews = store.reviews.filter((r) => r.productId !== req.params.id)
  writeStore(store)
  res.json({ ok: true })
})

app.get('/api/reviews', (_req, res) => {
  const store = readStore()
  res.json(store.reviews)
})

app.post('/api/reviews', authMiddleware, (req, res) => {
  const store = readStore()
  const data = req.body || {}
  const id =
    data.id ||
    `${data.productId}-${Date.now()}-${randomBytes(4).toString('hex')}`
  if (store.reviews.some((r) => r.id === id)) {
    return res.status(409).json({ error: 'Отзыв с таким ID уже существует' })
  }
  const review = {
    id,
    productId: data.productId,
    authorName: String(data.authorName || '').trim(),
    rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
    text: String(data.text || '').trim(),
    date: data.date || new Date().toISOString().slice(0, 10),
    source: data.source === 'kaspi' ? 'kaspi' : 'manual',
  }
  if (!review.productId || !review.authorName || !review.text) {
    return res.status(400).json({ error: 'Заполните товар, автора и текст' })
  }
  if (!store.products.some((p) => p.id === review.productId)) {
    return res.status(404).json({ error: 'Товар не найден' })
  }
  store.reviews.push(review)
  syncProductReviewStats(store, review.productId)
  writeStore(store)
  res.status(201).json(review)
})

app.put('/api/reviews/:id', authMiddleware, (req, res) => {
  const store = readStore()
  const index = store.reviews.findIndex((r) => r.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Not found' })
  const old = store.reviews[index]
  const patch = { ...req.body }
  if (typeof patch.rating === 'number') {
    patch.rating = Math.min(5, Math.max(1, patch.rating))
  }
  if (typeof patch.authorName === 'string') {
    patch.authorName = patch.authorName.trim()
  }
  if (typeof patch.text === 'string') patch.text = patch.text.trim()
  const review = { ...old, ...patch, id: old.id }
  store.reviews[index] = review
  syncProductReviewStats(store, old.productId)
  if (review.productId !== old.productId) {
    syncProductReviewStats(store, review.productId)
  }
  writeStore(store)
  res.json(review)
})

app.delete('/api/reviews/:id', authMiddleware, (req, res) => {
  const store = readStore()
  const review = store.reviews.find((r) => r.id === req.params.id)
  if (!review) return res.status(404).json({ error: 'Not found' })
  store.reviews = store.reviews.filter((r) => r.id !== req.params.id)
  syncProductReviewStats(store, review.productId)
  writeStore(store)
  res.json({ ok: true })
})

app.post('/api/categories', authMiddleware, (req, res) => {
  const store = readStore()
  const data = req.body
  const id = data.id || data.slug || slugify(data.name)
  if (store.categories.some((c) => c.id === id)) {
    return res.status(409).json({ error: 'Категория с таким ID уже существует' })
  }
  const category = { ...data, id }
  store.categories.push(category)
  writeStore(store)
  res.status(201).json(category)
})

app.put('/api/categories/:id', authMiddleware, (req, res) => {
  const store = readStore()
  const index = store.categories.findIndex((c) => c.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Not found' })
  const old = store.categories[index]
  store.categories[index] = { ...old, ...req.body }
  if (req.body.slug && req.body.slug !== old.slug) {
    store.products = store.products.map((p) =>
      p.category === old.slug ? { ...p, category: req.body.slug } : p,
    )
  }
  writeStore(store)
  res.json(store.categories[index])
})

app.delete('/api/categories/:id', authMiddleware, (req, res) => {
  const store = readStore()
  const cat = store.categories.find((c) => c.id === req.params.id)
  if (!cat) return res.status(404).json({ error: 'Not found' })
  store.categories = store.categories.filter((c) => c.id !== req.params.id)
  store.products = store.products.filter((p) => p.category !== cat.slug)
  writeStore(store)
  res.json({ ok: true })
})

app.post('/api/store/reset', authMiddleware, (_req, res) => {
  if (!existsSync(DEFAULTS_PATH)) {
    return res.status(500).json({ error: 'Defaults not found' })
  }
  const defaults = readFileSync(DEFAULTS_PATH, 'utf8')
  writeFileSync(STORE_PATH, defaults)
  res.json(readStore())
})

app.get('/api/errors', authMiddleware, (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    res.json({ entries: errorLog.listErrors(limit) })
  } catch (err) {
    logApiError(req, err, 500)
    res.status(500).json({ error: err.message || 'Ошибка загрузки логов' })
  }
})

app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', 'attachment')
    }
  },
}))

if (isProd) {
  const distPath = join(ROOT, 'dist')

  app.get(/^\/admin(\/.*)?$/, (_req, res) => {
    res.status(404).type('text/plain').send('Not Found')
  })

  app.get(new RegExp(`^/${escapeRegExp(ADMIN_PATH)}(/.*)?$`), (_req, res) => {
    res.sendFile(join(distPath, 'admin.html'))
  })

  app.use(express.static(distPath))

  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

app.use((err, req, res, _next) => {
  const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
  if (status >= 500) logApiError(req, err, status)
  res.status(status).json({ error: err.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`SPORT KING server http://localhost:${PORT}`)
  if (isProd) {
    console.log('Serving production build from /dist')
    console.log(`Admin panel path: /${ADMIN_PATH}/login`)
    if (ADMIN_PASSWORD === 'sportking') {
      console.warn(
        'WARNING: default ADMIN_PASSWORD is active. Set ADMIN_PASSWORD in environment.',
      )
    }
  }
})
