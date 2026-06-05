// server/src/tools/types.ts

export interface Tool {
  // Nome que o LLM vai usar para chamar a ferramenta
  name: string;

  // Descrição em linguagem natural para o LLM entender quando usar
  description: string;

  // JSON Schema compatível com a API da Anthropic
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
