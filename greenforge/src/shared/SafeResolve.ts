import { realpath } from 'fs/promises';
import path from 'path';
import { SecurityError } from './errors.js';

/**
 * Resolve um caminho de forma segura contra ataques de Path Traversal.
 * @param inputPath O caminho de entrada (relativo ou absoluto).
 * @param allowedRoot O diretório raiz permitido.
 * @returns O caminho real resolvido.
 */
export async function safeResolve(inputPath: string, allowedRoot: string): Promise<string> {
  const resolvedRoot = path.normalize(await realpath(allowedRoot));
  const absolutePath = path.resolve(resolvedRoot, inputPath);
  
  let realResolved: string;
  try {
    realResolved = path.normalize(await realpath(absolutePath));
  } catch {
    throw new SecurityError(`Path does not exist: ${inputPath}`);
  }

  const relative = path.relative(resolvedRoot, realResolved);
  
  const isInside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

  if (!isInside) {
    throw new SecurityError(`Path Traversal Detectado: ${realResolved} está fora de ${resolvedRoot}`);
  }

  return realResolved;
}

/**
 * Resolve um caminho para escrita de arquivo novo de forma segura.
 * @param inputPath O caminho do arquivo novo.
 * @param allowedRoot O diretório raiz permitido.
 */
export async function safeResolveForWrite(inputPath: string, allowedRoot: string): Promise<string> {
  const resolvedRoot = path.normalize(await realpath(allowedRoot));
  const absolutePath = path.resolve(resolvedRoot, inputPath);
  const parentDir = path.dirname(absolutePath);

  let resolvedParent: string;
  try {
    resolvedParent = path.normalize(await realpath(parentDir));
  } catch {
    // Se o pai não existe, recursivamente não poderíamos escrever sem criar,
    // mas para validação, o pai do destino deve ser validável.
    throw new SecurityError(`Parent directory does not exist: ${parentDir}`);
  }

  const relative = path.relative(resolvedRoot, resolvedParent);
  const isInside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

  if (!isInside) {
    throw new SecurityError(`Tentativa de escrita fora da raiz: ${absolutePath}`);
  }

  return path.normalize(absolutePath);
}
