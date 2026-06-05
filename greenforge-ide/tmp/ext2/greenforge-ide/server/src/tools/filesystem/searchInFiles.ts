// server/src/tools/filesystem/searchInFiles.ts
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import type { Tool } from '../types.js';
import type { TrustedFolders } from '../../security/trustedFolders.js';

export class SearchInFilesTool implements Tool {
  name = 'search_in_files';
  description = 'Busca por uma string em todos os arquivos do workspace.';
  isDestructive = false;
  inputSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'A string ou regex a ser buscada',
      },
      path: {
        type: 'string',
        description: 'Caminho relativo para limitar a busca',
        default: '.',
      },
    },
    required: ['query'],
  };

  constructor(private trustedFolders: TrustedFolders) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const query = input.query as string;
    const relativePath = (input.path as string) || '.';
    const absolutePath = this.trustedFolders.resolve(relativePath);

    const results: string[] = [];
    this.searchRecursively(absolutePath, relativePath, query, results);

    return results.length > 0 ? results.join('\n') : 'Nenhum resultado encontrado.';
  }

  private searchRecursively(absPath: string, relPath: string, query: string, results: string[]): void {
    if (results.length > 100) return; // Limite de resultados

    try {
      const entries = readdirSync(absPath);
      for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;

        const fullAbsPath = path.join(absPath, entry);
        const fullRelPath = path.join(relPath, entry);
        const stat = statSync(fullAbsPath);

        if (stat.isDirectory()) {
          this.searchRecursively(fullAbsPath, fullRelPath, query, results);
        } else if (stat.isFile()) {
          const content = readFileSync(fullAbsPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(query)) {
              results.push(`${fullRelPath}:${i + 1}: ${lines[i].trim()}`);
              if (results.length > 100) return;
            }
          }
        }
      }
    } catch (err) {
      // Ignora erros de leitura de arquivos binários ou inacessíveis
    }
  }

  describeAction(input: Record<string, unknown>): string {
    return `Buscar "${input.query}" em: ${input.path || '.'}`;
  }
}
