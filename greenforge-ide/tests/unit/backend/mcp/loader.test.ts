import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadMCPConfig } from '@/server/src/mcp/loader';
import * as fs from 'fs';

vi.mock('fs');

describe('loadMCPConfig', () => {
  let mockedFS = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedFS = vi.mocked(fs);
  });

  it('should load servers from config file', () => {
    const config = {
      mcpServers: {
        sqlite: {
          transport: 'stdio',
          command: 'npx',
          args: ['@mcp/server-sqlite']
        }
      }
    };

    mockedFS.existsSync.mockReturnValue(true as any);
    mockedFS.readFileSync.mockReturnValue(JSON.stringify(config) as any);

    const result = loadMCPConfig('/workspace');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('sqlite');
    expect(result[0].command).toBe('npx');
  });

  it('should ignore disabled servers', () => {
    const config = {
      mcpServers: {
        sqlite: {
          transport: 'stdio',
          command: 'npx',
          disabled: true
        }
      }
    };

    mockedFS.existsSync.mockReturnValue(true as any);
    mockedFS.readFileSync.mockReturnValue(JSON.stringify(config) as any);

    const result = loadMCPConfig('/workspace');

    expect(result).toHaveLength(0);
  });

  it('should expand environment variables', () => {
    process.env.TEST_VAR = 'expanded_value';
    const config = {
      mcpServers: {
        test: {
          transport: 'stdio',
          command: 'echo',
          args: ['${TEST_VAR}']
        }
      }
    };

    mockedFS.existsSync.mockReturnValue(true as any);
    mockedFS.readFileSync.mockReturnValue(JSON.stringify(config) as any);

    const result = loadMCPConfig('/workspace');

    expect(result[0].args?.[0]).toBe('expanded_value');
  });
});
