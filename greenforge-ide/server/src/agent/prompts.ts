// server/src/agent/prompts.ts
import { readFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * Constrói o system prompt baseado no modo de execução atual
 * e no contexto do projeto
 */
export function buildSystemPrompt(
  mode: 'plan' | 'auto_edit' | 'yolo',
  workspacePath: string,
): string {
  const modeInstructions = {
    plan: `Você está no MODO PLANO (plan).
Antes de qualquer modificação de arquivo ou execução de comando, você DEVE:
1. Descrever completamente o que vai fazer em linguagem natural
2. Listar cada passo da implementação
3. Identificar riscos e efeitos colaterais
4. Aguardar aprovação explícita do usuário para cada ação
Nunca execute ações destrutivas sem confirmação.`,

    auto_edit: `Você está no MODO AUTO-EDIÇÃO (auto_edit).
Você pode ler arquivos e listar diretórios livremente.
Você DEVE pedir aprovação antes de escrever, deletar, ou executar comandos shell.
Mostre sempre o diff das mudanças propostas ao solicitar aprovação.`,

    yolo: `⚠️ MODO YOLO ATIVO. Você pode executar todas as ferramentas sem pedir aprovação.
Todas as ações são registradas em log. Seja criterioso: o usuário optou por não revisar cada passo.`,
  };

  // Lê o contexto do projeto se existir
  const contextFilePath = path.join(workspacePath, 'GREENFORGE.md');
  let projectContext = '';

  if (existsSync(contextFilePath)) {
    try {
      const content = readFileSync(contextFilePath, 'utf-8');
      projectContext = `\n\n## Contexto do Projeto\n${content}`;
    } catch {
      // Ignora erro de leitura
    }
  }

  return `Você é o GreenForge Agent, um assistente de programação integrado a uma IDE web.
Você tem acesso a ferramentas para ler e escrever arquivos, executar comandos shell, e buscar na web.
O workspace atual está em: ${workspacePath}
NUNCA acesse caminhos fora do workspace sem permissão explícita.
NUNCA exponha chaves de API, senhas, ou segredos em suas respostas.

## Modo de Execução Atual
${modeInstructions[mode]}
${projectContext}`;
}
