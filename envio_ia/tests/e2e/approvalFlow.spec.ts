import { test, expect } from '@playwright/test'

test.describe('E2E - User-Agent Approval Flow', () => {
  test('completes full file creation with agent request and user approval confirmation', async ({ page }) => {
    // 1. Visit the app
    await page.goto('/')

    // Expect layout components to render
    await expect(page.locator('#file-explorer-container')).toBeVisible()
    await expect(page.locator('#terminal-wrapper')).toBeVisible()

    // 2. Locate chat input and request file creation
    const chatInput = page.locator('textarea[placeholder*="Descreva seu escopo"]')
    await chatInput.fill('Crie o arquivo main.ts contendo console.log("hello world")')
    await chatInput.press('Enter')

    // 3. Verify agent message starts streaming and thinking concludes
    // A gate card should eventually appear requesting approval
    const gateCard = page.locator('[id^="gate-card-"]')
    await expect(gateCard).toBeVisible({ timeout: 15000 })
    await expect(gateCard).toContainText('GATE ADVERSARIAL')

    // 4. Click the confirmation merge button
    const mergeBtn = gateCard.locator('button:has-text("Mesclar e Gravar Workspace")')
    await expect(mergeBtn).toBeVisible()
    await mergeBtn.click()

    // 5. Verify the node appears in the file explorer tree
    const fileNode = page.locator('#item-main\\.ts')
    await expect(fileNode).toBeVisible()
    await expect(fileNode).toContainText('main.ts')
  })
})
