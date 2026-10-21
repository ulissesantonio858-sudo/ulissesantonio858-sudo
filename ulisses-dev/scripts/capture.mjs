// Capturas e verificações rápidas num browser real.
// Uso: npm run capture -- [url] [--og]
//   url por omissão: http://localhost:4173 (npm run preview)
//   --og gera public/og-image.jpg (1200 × 630) a partir da hero.
// Browser: CHROME_PATH, ou o Chrome instalado no sistema.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173'
const makeOg = args.includes('--og')
const WIDTHS = [360, 390, 768, 1024, 1200, 1440, 1920]

const launch = process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH }
  : { channel: 'chrome' }
const browser = await chromium.launch(launch)
await mkdir('captures', { recursive: true })

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`))

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  // Mostra as secções que entram com animação, para a captura inteira.
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible')))
  await page.waitForTimeout(700)

  const info = await page.evaluate(() => {
    const w = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = document.createRange()
      r.selectNodeContents(el)
      return Math.round(r.getBoundingClientRect().width)
    }
    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // fonts.check() devolve true quando a família nem existe; isto confirma faces carregadas.
      clashLoaded: [...document.fonts].some((f) => f.family.replace(/["']/g, '') === 'Clash Display' && f.status === 'loaded'),
      displayFont: getComputedStyle(document.querySelector('.hero__l1')).fontFamily,
      developer: w('.hero__l1'),
      amp: w('.hero__amp'),
      webDesigner: w('.hero__l3'),
      webDesignerLines: Math.round(
        document.querySelector('.hero__l3').getBoundingClientRect().height /
          parseFloat(getComputedStyle(document.querySelector('.hero__l3')).lineHeight),
      ),
    }
  })
  console.log(width, JSON.stringify(info), problems.length ? problems : 'sem erros')
  await page.screenshot({ path: `captures/full-${width}.png`, fullPage: true })
  await page.close()
}

if (makeOg) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1227 }, deviceScaleFactor: 0.625 })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: 'public/og-image.jpg',
    type: 'jpeg',
    quality: 86,
    clip: { x: 0, y: 40, width: 1920, height: 1008 },
  })
  console.log('public/og-image.jpg gerado')
  await page.close()
}

await browser.close()
