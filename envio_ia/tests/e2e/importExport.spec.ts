import { test, expect } from '@playwright/test'

test.describe('E2E - Import & Export Zip Workspace Flow', () => {
  test('modifies workspace nodes and exports a zip archive', async ({ page }) => {
    // 1. Visit the app
    await page.goto('/')

    // 2. Pre-populate file nodes if tree is empty, or interact with toolbar
    // Let's create a file using root button to ensure a node exists to edit
    const addFileBtn = page.locator('#btn-add-root-file')
    await expect(addFileBtn).toBeVisible()
    await addFileBtn.click()

    const nameInput = page.locator('#new-node-name-input')
    await nameInput.fill('script.js')
    await nameInput.press('Enter')

    // Expect node to appear
    const fileNode = page.locator('#item-script\\.js')
    await expect(fileNode).toBeVisible()

    // 3. Double-click to open rename or select file to edit
    // Double click to trigger editing mode in tree view or edit text
    await fileNode.dblclick()
    
    const renameInput = page.locator('input[value="script.js"]')
    await expect(renameInput).toBeVisible()
    await renameInput.fill('run.js')
    await renameInput.press('Enter')

    await expect(page.locator('#item-run\\.js')).toBeVisible()

    // 4. Trigger the ZIP export download process
    const exportBtn = page.locator('#btn-export-all-zip')
    await expect(exportBtn).toBeVisible()

    // Start waiting for download before clicking the export button
    const downloadPromise = page.waitForEvent('download')
    await exportBtn.click()
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.zip')

    // Wait for file download to complete
    const pathResult = await download.path()
    expect(pathResult).not.toBeNull()
  })
})
