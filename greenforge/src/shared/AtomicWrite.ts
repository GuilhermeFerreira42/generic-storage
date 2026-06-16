import { writeFile, open, rename, rm } from 'fs/promises';

/**
 * Escreve um arquivo de forma atômica usando o padrão Temp-Sync-Rename.
 * @param targetPath O caminho do arquivo de destino.
 * @param content O conteúdo a ser escrito (UTF-8).
 */
export async function atomicWrite(targetPath: string, content: string): Promise<void> {
  const tempPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(7)}`;

  try {
    // 1. Escrever no arquivo temporário
    await writeFile(tempPath, content, 'utf8');

    // 2. Flush para o hardware
    const handle = await open(tempPath, 'r+');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }

    // 3. Rename atômico
    await rename(tempPath, targetPath);
  } catch (error: unknown) {
    // Tentativa de limpeza em caso de erro
    try {
      await rm(tempPath, { force: true });
    } catch {
      // Ignora erro de limpeza para não mascarar o erro principal
    }
    throw error;
  }
}
