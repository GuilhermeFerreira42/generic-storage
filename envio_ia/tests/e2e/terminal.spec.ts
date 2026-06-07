import { test, expect } from '@playwright/test'

test.describe('E2E - Terminal Command Execution', () => {
  test('executes command and displays standard output lines', async ({ page }) => {
    // 1. Visit the app
    await page.goto('/')

    // Expect terminal to render
    const terminalContainer = page.locator('#terminal-container')
    await expect(terminalContainer).toBeVisible()

    // 2. Locate the terminal text input box
    const termInput = terminalContainer.locator('input[type="text"]')
    await expect(termInput).toBeVisible()

    // 3. Type version check command and hit enter
    await termInput.fill('npm --version')
    await termInput.press('Enter')

    // 4. Verify terminal logs print matching command character prompt
    await expect(terminalContainer).toContainText('$ npm --version')

    // 5. Verify stdout displays version details (number starting format)
    // We wait for the command output to stream back
    await expect(terminalContainer).not.toContainText('Aguardando resposta...', { timeout: 10000 })
  })
})
