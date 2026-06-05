// server/src/tools/registry.ts
import type { Tool } from './types.js';
import { ReadFileTool } from './filesystem/readFile.js';
import { WriteFileTool } from './filesystem/writeFile.js';
import { ListDirectoryTool } from './filesystem/listDirectory.js';
import { SearchInFilesTool } from './filesystem/searchInFiles.js';
import { ExecuteCommandTool } from './shell/executeCommand.js';
import { WebFetchTool } from './web/webFetch.js';
import { TrustedFolders } from '../security/trustedFolders.js';

/**
 * Tool Registry - Catálogo central de ferramentas disponíveis ao LLM
 */
export class ToolRegistry {
  private tools = new Map<string, Tool>();

  /**
   * Registra uma ferramenta no registry
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Obtém uma ferramenta pelo nome
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Formato que a API da Anthropic espera para tool_use
   */
  getAnthropicToolDefinitions(): Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  /**
   * Lista todas as ferramentas registradas
   */
  listTools(): Array<{ name: string; description: string; isDestructive: boolean }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      isDestructive: t.isDestructive,
    }));
  }
}

/**
 * Factory que cria o registry com todas as ferramentas nativas
 * workspacePath é passado para garantir Trusted Folders
 */
export function buildToolRegistry(workspacePath: string): ToolRegistry {
  const trustedFolders = new TrustedFolders(workspacePath);
  const registry = new ToolRegistry();

  registry.register(new ReadFileTool(trustedFolders));
  registry.register(new WriteFileTool(trustedFolders));
  registry.register(new ListDirectoryTool(trustedFolders));
  registry.register(new SearchInFilesTool(trustedFolders));
  registry.register(new ExecuteCommandTool(workspacePath));
  registry.register(new WebFetchTool());

  return registry;
}
