// server/src/tools/filesystem/listDirectory.ts
import { readdirSync, statSync } from 'fs';
import path from 'path';
import type { Tool } from '../types.js';
import type { TrustedFolders } from '../../security/trustedFolders.js';

export class ListDirectoryTool implements Tool {
  name = 'list_directory';
  description = 'Lista o conteúdo de um diretório no workspace.';
  isDestructive = false;
  inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Caminho relativo do diretório a partir da raiz do workspace',
      },
      recursive: {
        type: 'boolean',
        description: 'Se deve listar recursivamente',
        default: false,
      },
    },
    required: ['path'],
  };

  constructor(private trustedFolders: TrustedFolders) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const relativePath = (input.path as string) || '.';
    const recursive = (input.recursive as boolean) || false;
    const absolutePath = this.trustedFolders.resolve(relativePath);

    const entries = this.listEntries(absolutePath, relativePath, recursive, 0);
    return entries.join('\n');
  }

  private listEntries(absPath: string, relPath: string, recursive: boolean, depth: number): string[] {
    if (depth > 3) return []; // Limite de profundidade para evitar loops ou excesso de dados

    try {
      const files = readdirSync(absPath);
      let results: string[] = [];

      for (const file of files) {
        if (file === 'node_modules' || file === '.git') continue;

        const fullAbsPath = path.join(absPath, file);
        const fullRelPath = path.join(relPath, file);
        const isDirectory = statSync(fullAbsPath).isDirectory();

        results.push(`${fullRelPath}${isDirectory ? '/' : ''}`);

        if (isDirectory && recursive) {
          results = results.concat(this.listEntries(fullAbsPath, fullRelPath, recursive, depth + 1));
        }
      }

      return results;
    } catch (err) {
      return [`Erro ao ler diretório ${relPath}: ${(err as Error).message}`];
    }
  }

  describeAction(input: Record<string, unknown>): string {
    return `Listar diretório: ${input.path}`;
  }
}
