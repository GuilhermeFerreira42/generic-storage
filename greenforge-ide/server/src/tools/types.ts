// server/src/tools/types.ts
import { z } from 'zod';

/**
 * Interface que toda ferramenta deve implementar
 * para ser registrada no Tool Registry
 */
export interface Tool {
  // Nome que o LLM vai usar para chamar a ferramenta
  name: string;

  // Descrição em linguagem natural para o LLM entender quando usar
  description: string;

  // JSON Schema compatível com a API da Anthropic/OpenAI
  inputSchema: Record<string, unknown>;

  // true se a ferramenta modifica ou deleta dados
  isDestructive: boolean;

  // Executa a ferramenta e retorna o resultado como string
  execute(input: Record<string, unknown>): Promise<string>;

  // Gera uma descrição humana da ação para o modal de aprovação
  describeAction(input: Record<string, unknown>): string;

  // Opcional: gera um diff antes da execução para mostrar no modal
  previewDiff?(input: Record<string, unknown>): string | undefined;
}

/**
 * Helper para criar schemas JSON válidos
 */
export function createJsonSchema(
  properties: Record<string, unknown>,
  required?: string[]
): Record<string, unknown> {
  return {
    type: 'object',
    properties,
    required: required ?? [],
  };
}
