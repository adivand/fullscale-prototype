import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const key = 'fullscale.p1.session'
const heading = (page: Page) => page.locator('#phase-title')
const stack = (page: Page) => page.getByRole('list', { name: 'Order stack' })
const card = (page: Page, name: string) => stack(page).getByRole('button', { name: new RegExp(name) }).first()
const operations = (page: Page) => page.locator('.operations')

async function pass(page: Page, owner: 'West' | 'East') {
  await expect(heading(page)).toHaveText(`Pass to ${owner}`)
  await expect(stack(page)).toHaveCount(0)
  await page.getByRole('button', { name: `I’m ${owner}` }).tap()
  await expect(heading(page)).toHaveText('Program your orders')
}

async function seal(page: Page) {
  await page.getByRole('button', { name: 'Set unassigned reserve cards to L1' }).tap()
  await page.getByRole('button', { name: 'Commit orders' }).tap()
}

async function act(page: Page, name: string | RegExp) {
  await operations(page).getByRole('button', { name }).tap()
}

test('iPhone portrait programs private stacks, reveals both orders, and resolves a lane wave', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  await pass(page, 'West')

  await expect(page.getByRole('button', { name: 'Commit orders' })).toBeDisabled()
  await expect(stack(page).locator('li').first()).toContainText('END')
  await card(page, 'Infantry').tap()
  await page.getByRole('group', { name: 'Target lane' }).getByRole('button', { name: 'L2', exact: true }).tap()
  await act(page, 'Before END')
  await expect(stack(page).locator('li').first()).toContainText('Infantry')
  await expect(stack(page).locator('li').first()).toContainText('L2')
  await card(page, 'L2.*Activate').tap()
  await act(page, 'Before END')
  await act(page, 'Move up')
  await expect(stack(page).locator('li').first()).toContainText('Activate lane')
  await act(page, 'Move down')
  await expect(stack(page).locator('li').first()).toContainText('Infantry')
  await seal(page)

  // The whole private region is removed, rather than merely covered by an overlay.
  await expect(heading(page)).toHaveText('Pass to East')
  await expect(stack(page)).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('Infantry')
  await page.reload()
  await pass(page, 'East')
  await card(page, 'Infantry').tap()
  await page.getByRole('group', { name: 'Target lane' }).getByRole('button', { name: 'L3', exact: true }).tap()
  await act(page, 'Before END')
  await seal(page)

  await expect(heading(page)).toHaveText('Orders sealed')
  await expect(stack(page)).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('Infantry')
  await act(page, 'Reveal first beat')
  await expect(heading(page)).toHaveText('Reveal beat 1')
  await expect(page.locator('.pair .west')).toContainText(/Infantry\s*Target L2/)
  await expect(page.locator('.pair .east')).toContainText(/Infantry\s*Target L3/)
  await expect(page.getByRole('img', { name: /West Infantry at column 4, row 1/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /East Infantry at column 6, row 8/ })).toBeVisible()
  await page.reload()
  await expect(heading(page)).toHaveText('Reveal beat 1')
  await act(page, 'Next reveal beat')
  await expect(page.locator('.pair .east')).toContainText('END')
  await act(page, 'Next reveal beat')
  await expect(page.locator('.pair')).toContainText('Already ended')
  await act(page, 'Resolve wave 1')
  await expect(heading(page)).toHaveText('Lane wave 1')
  await expect(page.getByRole('img', { name: /West Infantry at column 3, row 2/ })).toBeVisible()
  await expect(page.locator('.effects')).toContainText('West Infantry moved to (3, 2)')
  await page.locator('.feed summary').tap()
  await expect(page.locator('.feed')).toContainText('Wave 1 · West L2 / East idle')
  await expect(page.locator('.feed')).not.toContainText('Move Right')
  await act(page, 'Finish turn')
  await expect(heading(page)).toHaveText('Pass to West')
  await expect(page.locator('.turn-block')).toContainText('TURN 02')
  expect(errors).toEqual([])
})

test('board and controls fit iPhone portrait, tablet and desktop widths', async ({ page }) => {
  await page.goto('./')
  const grid = page.locator('.board')
  await expect(grid.locator('.cell')).toHaveCount(48)
  await expect(grid.locator('.barrier')).toHaveCount(21)
  await expect(grid.locator('.border')).toHaveCount(16)
  await expect(page.locator('.wall')).toHaveCount(2)
  expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')).toContain('/fullscale-prototype/icons/')
  const manifest = await page.request.get('./manifest.webmanifest')
  expect(manifest.ok()).toBeTruthy()
  expect((await manifest.json()).display).toBe('standalone')
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 620 }, { width: 768, height: 960 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    const geometry = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      width: document.documentElement.clientWidth,
      board: document.querySelector('.board')!.getBoundingClientRect().right,
      tap: document.querySelector<HTMLButtonElement>('[data-action="unlock"]')!.getBoundingClientRect().height,
    }))
    expect(geometry.scrollWidth).toBe(geometry.width)
    expect(geometry.board).toBeLessThanOrEqual(geometry.width)
    expect(geometry.tap).toBeGreaterThanOrEqual(44)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await pass(page, 'West')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.reload()
  await expect(heading(page)).toHaveText('Pass to West')
  await expect(stack(page)).toHaveCount(0)
})

test('a complete 12-turn match reaches game over and can be safely restarted', async ({ page }) => {
  await page.goto('./')
  const initialSeed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).seed, key)
  for (let turn = 1; turn <= 12; turn++) {
    await pass(page, 'West')
    await seal(page)
    await pass(page, 'East')
    await seal(page)
    await act(page, 'Reveal first beat')
    await act(page, 'Finish turn')
  }

  await expect(heading(page)).toHaveText('Draw')
  await expect(page.getByRole('button', { name: 'Finish turn' })).toHaveCount(0)
  await page.reload()
  await expect(heading(page)).toHaveText('Draw')

  await page.getByRole('button', { name: 'Reset', exact: true }).tap()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).tap()
  await expect(heading(page)).toHaveText('Draw')
  await page.getByRole('button', { name: 'Reset', exact: true }).tap()
  await page.getByRole('dialog').getByRole('button', { name: 'Reset game' }).tap()
  await expect(heading(page)).toHaveText('Pass to West')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).seed, key)).toBe(initialSeed)

  await page.getByRole('button', { name: 'New Game' }).tap()
  await page.getByRole('dialog').getByRole('button', { name: 'New Game' }).tap()
  await expect(heading(page)).toHaveText('Pass to West')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).commands, key)).toEqual([])
})

test('invalid local saves fall back to a fresh private handoff', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(key => localStorage.setItem(key, '{invalid'), key)
  await page.reload()
  await expect(heading(page)).toHaveText('Pass to West')
  await expect(page.getByRole('status')).toContainText('saved match was invalid')
  await expect(stack(page)).toHaveCount(0)
})

test('shows a simultaneous Clash, removes both units, and records combat in the log', async ({ page }) => {
  await page.goto('./')
  for (let turn = 1; turn <= 3; turn++) {
    for (const owner of ['West', 'East'] as const) {
      await pass(page, owner)
      if (turn === 1) {
        await card(page, 'Infantry').tap()
        await page.getByRole('group', { name: 'Target lane' }).getByRole('button', { name: 'L1', exact: true }).tap()
        await act(page, 'Before END')
      }
      if (turn === 2 && owner === 'West') {
        await card(page, 'Move Right').tap()
        await page.getByRole('group', { name: 'Target lane' }).getByRole('button', { name: 'L1', exact: true }).tap()
        await act(page, 'Before END')
      }
      await card(page, 'L1.*Activate').tap()
      await act(page, 'Before END')
      await seal(page)
    }
    await act(page, 'Reveal first beat')
    await act(page, 'Next reveal beat')
    if (turn !== 3) await act(page, 'Next reveal beat')
    await act(page, 'Resolve wave 1')
    if (turn !== 3) await act(page, 'Finish turn')
  }
  await expect(page.locator('.effects')).toContainText(/Clash.*East Infantry.*West Infantry/)
  await expect(page.locator('.unit')).toHaveCount(0)
  await expect(page.locator('.board .impact')).toHaveCount(1)
  await page.locator('.feed summary').tap()
  await expect(page.locator('.feed')).toContainText('West Infantry destroyed')
  await expect(page.locator('.feed')).toContainText('East Infantry destroyed')
})
