import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadFileTool } from '@/server/src/tools/filesystem/readFile';
import { TrustedFolders } from '@/server/src/security/trustedFolders';
import * as fs from 'fs';

vi.mock('fs');
vi.mock('@/server/src/security/trustedFolders');

describe('ReadFileTool', () => {
  let tool: ReadFileTool;
  let mockTrustedFolders: TrustedFolders;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrustedFolders = new TrustedFolders(['/workspace']);
    tool = new ReadFileTool(mockTrustedFolders);
    (mockTrustedFolders.resolve as any).mockImplementation((p: string) => `/workspace/${p}`);
  });

  it('should read a file successfully', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue('file content');

    const result = await tool.execute({ path: 'test.txt' });

    expect(result).toBe('file content');
    expect(fs.readFileSync).toHaveBeenCalledWith('/workspace/test.txt', 'utf-8');
  });

  it('should return an error message if file does not exist', async () => {
    (fs.existsSync as any).mockReturnValue(false);

    const result = await tool.execute({ path: 'missing.txt' });

    expect(result).toContain('Arquivo não encontrado');
  });

  it('should throw an error for blocked files', async () => {
    await expect(tool.execute({ path: '.env' })).rejects.toThrow('SecurityViolation');
    await expect(tool.execute({ path: 'id_rsa' })).rejects.toThrow('SecurityViolation');
  });

  it('should redact secrets in the file content', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue('My key is sk-ant-abc12345678901234567890');

    const result = await tool.execute({ path: 'secrets.txt' });

    expect(result).toBe('My key is [REDACTED]');
  });
});
