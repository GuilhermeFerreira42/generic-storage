/**
 * Resolve um caminho de forma segura contra ataques de Path Traversal.
 * @param inputPath O caminho de entrada (relativo ou absoluto).
 * @param allowedRoot O diretório raiz permitido.
 * @returns O caminho real resolvido.
 */
export declare function safeResolve(inputPath: string, allowedRoot: string): Promise<string>;
/**
 * Resolve um caminho para escrita de arquivo novo de forma segura.
 * @param inputPath O caminho do arquivo novo.
 * @param allowedRoot O diretório raiz permitido.
 */
export declare function safeResolveForWrite(inputPath: string, allowedRoot: string): Promise<string>;
