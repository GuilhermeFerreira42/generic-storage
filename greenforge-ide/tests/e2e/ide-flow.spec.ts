import { test, expect } from '@playwright/test';

test.describe('GreenForge IDE E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should connect to backend and send a message', async ({ page }) => {
    // Verifica se o indicador de conexão está verde/conectado
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toContainText('Conectado');

    // Digita uma mensagem no chat
    const chatInput = page.locator('textarea[placeholder*="Descreva seu escopo"]');
    await chatInput.fill('Olá, quem é você?');
    await page.keyboard.press('Enter');

    // Verifica se a mensagem do usuário apareceu
    await expect(page.locator('#msg-user-1')).toBeVisible();

    // Aguarda a resposta do agente (streaming)
    const agentResponse = page.locator('.agent-message');
    await expect(agentResponse).not.toBeEmpty();
  });

  test('should handle file creation with approval', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="Descreva seu escopo"]');
    await chatInput.fill('Crie um arquivo chamado demo.txt');
    await page.keyboard.press('Enter');

    // Aguarda o modal de aprovação
    const approvalModal = page.locator('#approval-modal');
    await expect(approvalModal).toBeVisible();
    await expect(approvalModal).toContainText('Criar novo arquivo: demo.txt');

    // Clica em aprovar
    await page.click('button:has-text("Mesclar e Gravar")');

    // Verifica se o arquivo aparece no explorador
    const fileExplorer = page.locator('.file-explorer');
    await expect(fileExplorer).toContainText('demo.txt');
  });
});
