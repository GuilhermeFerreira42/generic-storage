// server/src/security/trustedFolders.ts
import path from 'path';

export class TrustedFolders {
  private allowedPaths: string[];

  constructor(allowedPaths: string[]) {
    // Normaliza todos os paths para absolutos
    this.allowedPaths = allowedPaths.map((p) => path.resolve(p));
  }

  // Resolve um caminho relativo e verifica se está dentro do workspace
  resolve(relativePath: string): string {
    const normalized = path.resolve(this.allowedPaths[0], relativePath);

    const isAllowed = this.allowedPaths.some((allowed) =>
      normalized.startsWith(allowed + path.sep) ||
      normalized === allowed
    );

    if (!isAllowed) {
      throw new Error(
        `SecurityViolation: caminho "${relativePath}" está fora do workspace permitido. ` +
        `Paths permitidos: ${this.allowedPaths.join(', ')}`
      );
    }

    return normalized;
  }

  addPath(absolutePath: string): void {
    const normalized = path.resolve(absolutePath);
    if (!this.allowedPaths.includes(normalized)) {
      this.allowedPaths.push(normalized);
    }
  }
}
