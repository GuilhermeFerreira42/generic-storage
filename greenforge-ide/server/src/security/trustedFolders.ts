// server/src/security/trustedFolders.ts
import path from 'path';

/**
 * Política de Trusted Folders - valida se um path está dentro do workspace permitido
 * Previne path traversal e acesso a arquivos fora do contexto do projeto
 */

export class SecurityViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityViolation';
  }
}

export class TrustedFolders {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    // Normaliza o path do workspace
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  /**
   * Resolve e valida um path relativo ou absoluto
   * @param inputPath - Path fornecido pelo usuário/agente
   * @returns Path absoluto resolvido e validado
   * @throws SecurityViolation se o path estiver fora do workspace
   */
  resolve(inputPath: string): string {
    // Remove possíveis caracteres nulos
    const sanitized = inputPath.replace(/\0/g, '');
    
    // Se for path absoluto, verifica se está dentro do workspace
    if (path.isAbsolute(sanitized)) {
      const resolved = path.resolve(sanitized);
      
      if (!this.isWithinWorkspace(resolved)) {
        throw new SecurityViolation(
          `Acesso negado: "${resolved}" está fora do workspace permitido.`
        );
      }
      
      return resolved;
    }
    
    // Se for path relativo, resolve em relação ao workspace
    const resolved = path.resolve(this.workspaceRoot, sanitized);
    
    if (!this.isWithinWorkspace(resolved)) {
      throw new SecurityViolation(
        `Acesso negado: path traversal detectado. "${resolved}" está fora do workspace.`
      );
    }
    
    return resolved;
  }

  /**
   * Verifica se um path está dentro do workspace
   */
  private isWithinWorkspace(fullPath: string): boolean {
    const normalizedFull = path.normalize(fullPath);
    const normalizedWorkspace = path.normalize(this.workspaceRoot);
    
    // Garante que ambos terminam sem separator para comparação correta
    const full = normalizedFull.endsWith(path.sep) 
      ? normalizedFull.slice(0, -1) 
      : normalizedFull;
    const workspace = normalizedWorkspace.endsWith(path.sep)
      ? normalizedWorkspace.slice(0, -1)
      : normalizedWorkspace;
    
    // O path deve começar com o workspace + separator ou ser exatamente o workspace
    return full === workspace || full.startsWith(workspace + path.sep);
  }

  /**
   * Lista de arquivos sensíveis que nunca devem ser acessados
   */
  static SENSITIVE_PATTERNS: RegExp[] = [
    /\.env(\..+)?$/,
    /\.env\.local$/,
    /\.pem$/,
    /\.key$/,
    /\.cert$/,
    /id_rsa$/,
    /id_ed25519$/,
    /\.ssh\/.+$/,
    /\.git\/config$/,
    /\.npmrc$/,
    /\.pnp\.cjs$/,
  ];

  /**
   * Verifica se um arquivo é sensível e não deve ser lido
   */
  static isSensitiveFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const fullPath = filePath.toLowerCase();
    
    return TrustedFolders.SENSITIVE_PATTERNS.some(pattern => 
      pattern.test(fileName) || pattern.test(fullPath)
    );
  }
}
