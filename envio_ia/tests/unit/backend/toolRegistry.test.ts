import { describe, it, expect, vi } from 'vitest'

// Mock dependencies of server/src/tools/registry.ts before importing it
vi.mock('@/server/src/tools/filesystem/readFile.js', () => {
  return {
    ReadFileTool: class {
      name = 'read_file'
      description = 'Reads a file'
      inputSchema = { type: 'object' }
      isDestructive = false
      execute = async () => 'file content'
      describeAction = () => 'reading file'
    }
  }
})

vi.mock('@/server/src/tools/filesystem/writeFile.js', () => {
  return {
    WriteFileTool: class {
      name = 'write_file'
      description = 'Writes to a file'
      inputSchema = { type: 'object' }
      isDestructive = true
      execute = async () => 'success'
      describeAction = () => 'writing file'
      previewDiff = () => 'diff text'
    }
  }
})

vi.mock('@/server/src/tools/filesystem/listDirectory.js', () => {
  return {
    ListDirectoryTool: class {
      name = 'list_directory'
      description = 'Lists directory contents'
      inputSchema = { type: 'object' }
      isDestructive = false
      execute = async () => 'dir list'
      describeAction = () => 'listing directory'
    }
  }
})

vi.mock('@/server/src/tools/filesystem/searchInFiles.js', () => {
  return {
    SearchInFilesTool: class {
      name = 'search_in_files'
      description = 'Searches text in files'
      inputSchema = { type: 'object' }
      isDestructive = false
      execute = async () => 'search matches'
      describeAction = () => 'searching files'
    }
  }
})

vi.mock('@/server/src/tools/shell/executeCommand.js', () => {
  return {
    ExecuteCommandTool: class {
      name = 'execute_command'
      description = 'Executes a command'
      inputSchema = { type: 'object' }
      isDestructive = true
      execute = async () => 'command success'
      describeAction = () => 'executing command'
    }
  }
})

vi.mock('@/server/src/tools/web/webFetch.js', () => {
  return {
    WebFetchTool: class {
      name = 'web_fetch'
      description = 'Fetches a URL'
      inputSchema = { type: 'object' }
      isDestructive = false
      execute = async () => 'html content'
      describeAction = () => 'fetching web'
    }
  }
})

// Now import the registry safely
import { ToolRegistry, buildToolRegistry } from '@/server/src/tools/registry'

describe('ToolRegistry', () => {
  it('registers and retrieves tools successfully', () => {
    const registry = new ToolRegistry()
    const dummyTool = {
      name: 'dummy_tool',
      description: 'just a dummy',
      inputSchema: { properties: {} },
      isDestructive: false,
      execute: async () => 'done',
      describeAction: () => 'acting dummy'
    }

    registry.register(dummyTool)
    
    expect(registry.getTool('dummy_tool')).toBe(dummyTool)
    expect(registry.getTool('non_existent')).toBeUndefined()
  })

  it('generates definitions formatted for Gemini api function declarations', () => {
    const registry = new ToolRegistry()
    const dummyTool = {
      name: 'dummy_tool',
      description: 'just a dummy',
      inputSchema: { type: 'object' },
      isDestructive: false,
      execute: async () => 'done',
      describeAction: () => 'acting dummy'
    }

    registry.register(dummyTool)
    const definitions = registry.getGeminiToolDefinitions()

    expect(definitions).toHaveLength(1)
    expect(definitions[0]).toEqual({
      name: 'dummy_tool',
      description: 'just a dummy',
      parameters: { type: 'object' }
    })
  })

  it('lists registered tools with destructive flag details', () => {
    const registry = new ToolRegistry()
    const read = {
      name: 'read',
      description: 'r',
      inputSchema: {},
      isDestructive: false,
      execute: async () => '',
      describeAction: () => ''
    }
    const write = {
      name: 'write',
      description: 'w',
      inputSchema: {},
      isDestructive: true,
      execute: async () => '',
      describeAction: () => ''
    }

    registry.register(read)
    registry.register(write)

    const list = registry.listTools()
    expect(list).toHaveLength(2)
    expect(list).toContainEqual({ name: 'read', description: 'r', isDestructive: false })
    expect(list).toContainEqual({ name: 'write', description: 'w', isDestructive: true })
  })

  it('factory buildToolRegistry registers all native tools', () => {
    const registry = buildToolRegistry('/test/workspace')
    
    expect(registry.getTool('read_file')).toBeDefined()
    expect(registry.getTool('write_file')).toBeDefined()
    expect(registry.getTool('list_directory')).toBeDefined()
    expect(registry.getTool('search_in_files')).toBeDefined()
    expect(registry.getTool('execute_command')).toBeDefined()
    expect(registry.getTool('web_fetch')).toBeDefined()
  })
})
