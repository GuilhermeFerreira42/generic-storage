// server/src/mcp/loader.ts
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  disabled?: boolean;
}

export function loadMCPConfig(workspacePath: string): MCPServerConfig[] {
  const configPath = path.join(workspacePath, 'greenforge.config.json');

  if (!existsSync(configPath)) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    console.error('[MCP] Erro ao parsear greenforge.config.json');
    return [];
  }

  const config = raw as { mcpServers?: Record<string, Omit<MCPServerConfig, 'name'>> };
  if (!config.mcpServers) return [];

  return Object.entries(config.mcpServers)
    .filter(([, server]) => !server.disabled)
    .map(([name, server]) => ({
      name,
      ...server,
      // Expande variáveis de ambiente nos args e env
      args: server.args?.map(expandEnvVars),
      env: server.env
        ? Object.fromEntries(
            Object.entries(server.env).map(([k, v]) => [k, expandEnvVars(v)])
          )
        : undefined,
    }));
}

function expandEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    return process.env[varName] ?? '';
  });
}
