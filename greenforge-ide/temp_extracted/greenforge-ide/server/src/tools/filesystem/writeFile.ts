// server/src/tools/filesystem/writeFile.ts
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { createPatch } from 'diff'; // npm install diff @types/diff
import type { Tool } from '../types.js';
import type { TrustedFolders } from '../../security/trustedFolders.js';

export class WriteFileTool implements Tool {
  name = 'write_file';
  description = 'Escreve ou sobrescreve um arquivo no workspace. Sempre será solicitada aprovação do usuário antes da execução.';
  isDestructive = true;
  inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Caminho relativo do arquivo a partir da raiz do workspace',
      },
      content: {
        type: 'string',
        description: 'Conteúdo completo a ser escrito no arquivo',
      },
    },
    required: ['path', 'content'],
  };

  constructor(private trustedFolders: TrustedFolders) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const relativePath = input.path as string;
    const content = input.content as string;
    const absolutePath = this.trustedFolders.resolve(relativePath);

    // Garante que o diretório pai existe
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, 'utf-8');

    return `Arquivo escrito com sucesso: ${relativePath} (${content.length} caracteres)`;
  }

  describeAction(input: Record<string, unknown>): string {
    const exists = existsSync(
      this.trustedFolders.resolve(input.path as string)
    );
    return exists
      ? `Sobrescrever arquivo existente: ${input.path}`
      : `Criar novo arquivo: ${input.path}`;
  }

  previewDiff(input: Record<string, unknown>): string | undefined {
    const relativePath = input.path as string;
    const newContent = input.content as string;
    const absolutePath = this.trustedFolders.resolve(relativePath);

    const oldContent = existsSync(absolutePath)
      ? readFileSync(absolutePath, 'utf-8')
      : '';

    return createPatch(
      relativePath,
      oldContent,
      newContent,
      'atual',
      'proposto',
    );
  }
}
