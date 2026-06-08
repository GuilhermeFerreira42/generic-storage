import path from 'path';
import fs from 'fs';
import os from 'os';

export function validatePath(requestedPath: string): string {
  // Fallback isolado fora da árvore do projeto: ~/.greenforge/workspace
  const defaultWorkspace = path.join(os.homedir(), '.greenforge', 'workspace');

  let envWorkspace = process.env.WORKSPACE_ROOT;
  const root = (!envWorkspace || envWorkspace === '.' || envWorkspace === './')
    ? defaultWorkspace
    : envWorkspace;

  // Garantir que o diretório raiz exista
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  
  // Resolve the requested path against the root
  // Remove leading slash if present to avoid resolving to system root
  const cleanRequestedPath = requestedPath.replace(/^(\/|\\)/, '');
  const resolvedPath = path.resolve(root, cleanRequestedPath);
  
  if (!resolvedPath.startsWith(root)) {
    throw new Error('Path traversal detected: Access denied.');
  }

  return resolvedPath;
}
