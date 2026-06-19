/**
 * Escreve um arquivo de forma atômica usando o padrão Temp-Sync-Rename.
 * @param targetPath O caminho do arquivo de destino.
 * @param content O conteúdo a ser escrito (UTF-8).
 */
export declare function atomicWrite(targetPath: string, content: string): Promise<void>;
