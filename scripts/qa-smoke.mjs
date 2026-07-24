import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args: ['--no-sandbox'],
})

const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
})

await page.setViewport({ width: 1280, height: 900 })
await page.goto('http://localhost:5173/catalog', {
  waitUntil: 'networkidle2',
  timeout: 30000,
})
await page.waitForFunction(
  () => /Найдено:\s*\d+\s*товаров/.test(document.body.innerText),
  { timeout: 15000 },
)
const catalogText =
  (await page.evaluate(() =>
    document.body.innerText.match(/Найдено:\s*\d+\s*товаров/)?.[0],
  )) ?? 'not found'
console.log('Desktop catalog:', catalogText)

const cardCount = await page.$$eval('.card-shell', (els) => els.length)
console.log('Product cards rendered:', cardCount)

await page.setViewport({ width: 390, height: 844 })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })
const homeCats = await page.evaluate(() =>
  [...document.querySelectorAll('h3')]
    .map((h) => h.textContent?.trim())
    .filter(Boolean),
)
console.log('Mobile home categories:', homeCats.filter((t) => t !== 'Меню').join(', '))
const hasEmptyFallback = homeCats.some((t) => t === 'Брусья' || t === 'Перекладины')
console.log('Empty fallback categories visible:', hasEmptyFallback)

await page.goto(
  'http://localhost:5173/category/swedish-walls',
  { waitUntil: 'networkidle2' },
)
const categoryCount = await page.evaluate(() =>
  document.body.innerText.match(/Найдено:\s*\d+\s*товаров|(\d+)\s*товар/)?.[0] ??
    document.body.innerText.slice(0, 200),
)
console.log('Category page:', categoryCount)

await page.goto(
  'http://localhost:5173/product/shvedskaya-stenka-sportking-lyuks-belyy-seryy-160499654',
  { waitUntil: 'networkidle2' },
)
await page.waitForFunction(
  () =>
    [...document.querySelectorAll('button')].some((b) =>
      /kaspi/i.test(b.textContent ?? b.getAttribute('aria-label') ?? ''),
    ),
  { timeout: 10000 },
)
const kaspiText = await page.evaluate(() =>
  [...document.querySelectorAll('button')].some((b) =>
    /kaspi/i.test(b.textContent ?? b.getAttribute('aria-label') ?? ''),
  ),
)
console.log('Product page Kaspi button:', kaspiText)

await page.goto('http://localhost:5173/gallery', { waitUntil: 'networkidle2' })
await page.waitForFunction(
  () => document.body.innerText.toUpperCase().includes('ФОТОГАЛЕРЕЯ'),
  { timeout: 10000 },
)
const galleryTitle = await page.evaluate(() =>
  document.body.innerText.toUpperCase().includes('ФОТОГАЛЕРЕЯ'),
)
console.log('Gallery page title:', galleryTitle)

console.log('Console errors:', errors.length ? errors.join(' | ') : 'none')
await browser.close()
