// server/src/tools/web/webFetch.ts
import type { Tool } from '../types.js';

export class WebFetchTool implements Tool {
  name = 'web_fetch';
  description = 'Busca o conteúdo de uma URL e retorna o texto limpo (sem HTML).';
  isDestructive = false;
  inputSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'A URL para buscar',
      },
    },
    required: ['url'],
  };

  async execute(input: Record<string, unknown>): Promise<string> {
    const url = input.url as string;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GreenForge-Agent/1.0',
        },
      });

      if (!response.ok) {
        return `Erro ao buscar URL: ${response.status} ${response.statusText}`;
      }

      const text = await response.text();
      // Simples limpeza de HTML (apenas para o placeholder da Fase 1)
      return text.replace(/<[^>]*>?/gm, '').trim().substring(0, 10000);
    } catch (err) {
      return `Erro de rede ao buscar URL: ${(err as Error).message}`;
    }
  }

  describeAction(input: Record<string, unknown>): string {
    return `Buscar conteúdo da URL: ${input.url}`;
  }
}
