import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadMCPConfig } from '@/server/src/mcp/loader';
import * as fs from 'fs';

vi.mock('fs');

describe('loadMCPConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(config));

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

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(config));

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

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(config));

    const result = loadMCPConfig('/workspace');

    expect(result[0].args?.[0]).toBe('expanded_value');
  });
});
