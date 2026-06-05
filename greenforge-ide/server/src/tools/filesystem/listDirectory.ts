// server/src/tools/filesystem/listDirectory.ts
import { readdirSync, statSync } from 'fs';
import path from 'path';
import type { Tool } from '../types.js';
import type { TrustedFolders } from '../../security/trustedFolders.js';

/**
 * Ferramenta list_directory - Lista conteúdo de um diretório
 */
export class ListDirectoryTool implements Tool {
  name = 'list_directory';
  description = 'Lista o conteúdo de um diretório no workspace. Use para explorar a estrutura de arquivos.';
  isDestructive = false;
  
  inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Caminho do diretório a listar',
      },
      recursive: {
        type: 'boolean',
        description: 'Se true, lista recursivamente (padrão: false)',
      },
    },
    required: ['path'],
  };

  private trustedFolders: TrustedFolders;

  constructor(trustedFolders: TrustedFolders) {
    this.trustedFolders = trustedFolders;
  }

  async execute(input: Record<string, unknown>): Promise<string> {
    const relativePath = input.path as string;
    const recursive = (input.recursive as boolean) ?? false;
    
    try {
      const absolutePath = this.trustedFolders.resolve(relativePath);
      
      // Verifica se é diretório
      const stats = statSync(absolutePath);
      if (!stats.isDirectory()) {
        return `Erro: "${relativePath}" não é um diretório.`;
      }

      const entries = readdirSync(absolutePath, { withFileTypes: true });
      
      // Filtra entradas ignoradas
      const ignored = ['node_modules', '.git', '.greenforge-workers'];
      const filtered = entries.filter(e => !ignored.includes(e.name));

      if (recursive) {
        return this.buildRecursiveTree(absolutePath, filtered, 0, 3);
      }

      const lines = filtered.map(e => {
        const type = e.isDirectory() ? '[DIR] ' : '[FILE]';
        return `${type}${e.name}`;
      });

      return lines.join('\n') || '(diretório vazio)';
    } catch (err) {
      return `Erro ao listar diretório: ${(err as Error).message}`;
    }
  }

  private buildRecursiveTree(
    basePath: string,
    entries: typeof Array.prototype,
    depth: number,
    maxDepth: number
  ): string {
    if (depth >= maxDepth) {
      return '... (limite de profundidade atingido)';
    }

    const lines: string[] = [];
    const indent = '  '.repeat(depth);
    const ignored = ['node_modules', '.git', '.greenforge-workers'];

    for (const entry of entries) {
      if (ignored.includes(entry.name)) continue;
      
      const fullPath = path.join(basePath, entry.name);
      const prefix = entry.isDirectory() ? '[DIR] ' : '[FILE] ';
      lines.push(`${indent}${prefix}${entry.name}`);

      if (entry.isDirectory()) {
        try {
          const subEntries = readdirSync(fullPath, { withFileTypes: true });
          lines.push(this.buildRecursiveTree(fullPath, subEntries, depth + 1, maxDepth));
        } catch {
          // Ignora erros de permissão
        }
      }
    }

    return lines.join('\n');
  }

  describeAction(input: Record<string, unknown>): string {
    const recursive = (input.recursive as boolean) ?? false;
    return `Listar diretório${recursive ? ' (recursivo)' : ''}: ${input.path}`;
  }
}
