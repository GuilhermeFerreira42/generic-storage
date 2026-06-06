import { test, expect } from '@playwright/test';

test.describe('Advanced IDE Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should execute command in terminal and see output', async ({ page }) => {
    // Focar no terminal e digitar comando
    // Nota: XTerm.js requer interação específica, mas aqui assumimos que temos acesso ao input
    // No nosso componente, o terminal captura o teclado quando focado.
    
    // Podemos simular a execução via chat se o terminal for difícil de testar via Playwright
    // Ou simplesmente verificar se o painel do terminal responde.
    
    // Vamos tentar focar o terminal
    await page.click('#terminal-container');
    await page.keyboard.type('npm --version');
    await page.keyboard.press('Enter');

    // Verifica se há alguma saída numérica (versão)
    const terminalOutput = page.locator('.xterm-rows');
    await expect(terminalOutput).toContainText(/[0-9]+\.[0-9]+\.[0-9]+/);
  });

  test('should create a file, edit it and export workspace', async ({ page }) => {
    // Criar arquivo via explorador
    await page.click('#btn-add-root-file');
    await page.fill('#new-node-name-input', 'test-export.txt');
    await page.click('#btn-confirm-create-node');

    // Abrir no editor
    await page.click('text=test-export.txt');

    // Editar conteúdo
    // CodeMirror é chato de preencher, mas podemos tentar
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.type('Hello from E2E');

    // Exportar ZIP
    const [ download ] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#btn-export-all-zip')
    ]);

    expect(download.suggestedFilename()).toBe('greenforge-workspace.zip');
  });
});
