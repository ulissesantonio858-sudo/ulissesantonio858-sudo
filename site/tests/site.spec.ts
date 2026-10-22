import { expect, test } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const url = pathToFileURL(resolve('dist/index.html')).href
const widths = [360, 390, 768, 1280, 1440]

for (const w of widths) {
  test(`layout ${w}px: sem scroll horizontal, marcação visível sem ir ao rodapé`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 })
    await page.goto(url)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    // CTA de marcação visível no primeiro ecrã.
    await expect(page.getByRole('banner').getByRole('link', { name: 'Marcar' })).toBeInViewport()
    await page.screenshot({ path: `test-results/shot-${w}.png`, fullPage: true })
  })
}

test('escolher serviço pré-preenche a marcação e move o foco', async ({ page }) => {
  await page.goto(url)
  await page.getByRole('button', { name: 'Marcar Drenagem linfática' }).click()
  const select = page.getByLabel('Serviço', { exact: true })
  await expect(select).toHaveValue('drenagem')
  await expect(select).toBeFocused()
  await expect(page.getByText('Olá! Gostaria de marcar: Drenagem linfática.')).toBeVisible()
  await page.getByLabel(/Período preferido/).selectOption('à tarde')
  await expect(page.getByText('Olá! Gostaria de marcar: Drenagem linfática. Prefiro à tarde.')).toBeVisible()
  // Sem canal configurado, nada finge enviar.
  await expect(page.getByText('Enviar pedido')).toHaveAttribute('aria-disabled', 'true')
})

test('filtro de serviços por área', async ({ page }) => {
  await page.goto(url)
  await page.getByRole('button', { name: 'Corpo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Corpo', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Limpeza de pele' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Drenagem linfática' })).toBeVisible()
})

test('galeria: teclado, setas, Escape e reposição de foco', async ({ page }) => {
  await page.goto(url)
  const first = page.getByRole('button', { name: 'Ampliar: Rosto' })
  await first.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('1 / 3 · Rosto')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByText('2 / 3 · Corpo')).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(dialog.getByText('3 / 3')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(first).toBeFocused()
})

test('menu móvel abre, fecha com Escape e devolve foco', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(url)
  const btn = page.getByRole('button', { name: 'Menu' })
  await btn.click()
  await expect(page.getByRole('navigation', { name: 'Principal (móvel)' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('navigation', { name: 'Principal (móvel)' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused()
})

test('nenhum preço ou duração inventado', async ({ page }) => {
  await page.goto(url)
  await expect(page.locator('#servicos')).not.toContainText('€')
  await expect(page.locator('#servicos')).not.toContainText(/\d+\s?min/)
})
