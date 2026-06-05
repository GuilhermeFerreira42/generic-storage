// server/src/tools/filesystem/readFile.ts
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import type { Tool } from '../types.js';
import type { TrustedFolders } from '../../security/trustedFolders.js';
import { SecretRedactor } from '../../security/secretRedactor.js';

// Arquivos que nunca podem ser lidos, independente do modo
const BLOCKED_PATTERNS = [
  /\.env$/,
  /\.env\..+$/,
  /\.key$/,
  /\.pem$/,
  /\.cert$/,
  /id_rsa$/,
  /id_ed25519$/,
  /\.secret$/,
];

export class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Lê o conteúdo de um arquivo do workspace. Use para inspecionar código existente antes de fazer modificações.';
  isDestructive = false;
  inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Caminho relativo do arquivo a partir da raiz do workspace',
      },
    },
    required: ['path'],
  };

  private redactor = new SecretRedactor();

  constructor(private trustedFolders: TrustedFolders) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const relativePath = input.path as string;
    const absolutePath = this.trustedFolders.resolve(relativePath);

    // Verifica blocked patterns
    const filename = path.basename(absolutePath);
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(filename)) {
        throw new Error(`SecurityViolation: acesso negado ao arquivo "${filename}". Este arquivo pode conter segredos.`);
      }
    }

    if (!existsSync(absolutePath)) {
      return `Arquivo não encontrado: ${relativePath}`;
    }

    const content = readFileSync(absolutePath, 'utf-8');
    return this.redactor.redact(content);
  }

  describeAction(input: Record<string, unknown>): string {
    return `Ler arquivo: ${input.path}`;
  }
}
