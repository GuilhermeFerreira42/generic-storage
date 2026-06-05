// server/src/tools/filesystem/readFile.ts
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import type { Tool } from '../types.js';
import type { TrustedFolders } from '../../security/trustedFolders.js';
import { SecretRedactor } from '../../security/secretRedactor.js';

/**
 * Ferramenta read_file - Lê o conteúdo de um arquivo do workspace
 */
export class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Lê o conteúdo de um arquivo do workspace. Use para inspecionar código existente antes de fazer modificações.';
  isDestructive = false;
  
  inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Caminho relativo ou absoluto do arquivo a ser lido',
      },
    },
    required: ['path'],
  };

  private trustedFolders: TrustedFolders;
  private redactor = new SecretRedactor();

  constructor(trustedFolders: TrustedFolders) {
    this.trustedFolders = trustedFolders;
  }

  execute(input: Record<string, unknown>): Promise<string> {
    const filePath = input.path as string;

    try {
      // Resolve e valida o path
      const resolvedPath = this.trustedFolders.resolve(filePath);

      // Verifica se é arquivo sensível
      if (TrustedFolders.isSensitiveFile(resolvedPath)) {
        return Promise.resolve(`Erro: Acesso negado. Arquivos sensíveis como .env, chaves privadas e certificados não podem ser lidos.`);
      }

      // Verifica existência
      if (!existsSync(resolvedPath)) {
        return Promise.resolve(`Erro: Arquivo não encontrado: ${filePath}`);
      }

      // Lê o conteúdo
      const content = readFileSync(resolvedPath, 'utf-8');

      // Redacta segredos antes de retornar
      const safeContent = this.redactor.redact(content);

      return Promise.resolve(safeContent);
    } catch (err) {
      return Promise.resolve(`Erro ao ler arquivo: ${(err as Error).message}`);
    }
  }

  describeAction(input: Record<string, unknown>): string {
    return `Ler arquivo: ${input.path}`;
  }
}
