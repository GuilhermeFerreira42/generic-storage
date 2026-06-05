import path from 'path';
import fs from 'fs';

export function validatePath(requestedPath: string): string {
  let defaultWorkspace = path.join(process.cwd(), 'workspaces', 'default');
  if (!fs.existsSync(defaultWorkspace)) {
    fs.mkdirSync(defaultWorkspace, { recursive: true });
  }

  let envWorkspace = process.env.WORKSPACE_ROOT;
  const root = (!envWorkspace || envWorkspace === '.' || envWorkspace === './')
    ? defaultWorkspace
    : envWorkspace;
  
  // Resolve the requested path against the root
  // Remove leading slash if present to avoid resolving to system root
  const cleanRequestedPath = requestedPath.replace(/^(\/|\\)/, '');
  const resolvedPath = path.resolve(root, cleanRequestedPath);
  
  if (!resolvedPath.startsWith(root)) {
    throw new Error('Path traversal detected: Access denied.');
  }

  return resolvedPath;
}
