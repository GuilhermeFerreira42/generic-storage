import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadFileTool } from '@/server/src/tools/filesystem/readFile';
import { TrustedFolders } from '@/server/src/security/trustedFolders';
import * as fs from 'fs';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn(),
  promises: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  }
}));
vi.mock('@/server/src/security/trustedFolders');

describe('ReadFileTool', () => {
  let tool: ReadFileTool;
  let mockTrustedFolders: TrustedFolders;
  let mockedFS = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrustedFolders = new TrustedFolders(['/workspace']);
    tool = new ReadFileTool(mockTrustedFolders);
    mockedFS = vi.mocked(fs);
    (mockTrustedFolders.resolve as any).mockImplementation((p: string) => `/workspace/${p}`);
  });

  it('should read a file successfully', async () => {
    mockedFS.existsSync.mockReturnValue(true as any);
    mockedFS.readFileSync.mockReturnValue('file content' as any);

    const result = await tool.execute({ path: 'test.txt' });

    expect(result).toBe('file content');
    expect(mockedFS.readFileSync).toHaveBeenCalledWith('/workspace/test.txt', 'utf-8');
  });

  it('should return an error message if file does not exist', async () => {
    mockedFS.existsSync.mockReturnValue(false as any);

    const result = await tool.execute({ path: 'missing.txt' });

    expect(result).toContain('Arquivo não encontrado');
  });

  it('should throw an error for blocked files', async () => {
    await expect(tool.execute({ path: '.env' })).rejects.toThrow('SecurityViolation');
    await expect(tool.execute({ path: 'id_rsa' })).rejects.toThrow('SecurityViolation');
  });

  it('should redact secrets in the file content', async () => {
    mockedFS.existsSync.mockReturnValue(true as any);
    mockedFS.readFileSync.mockReturnValue('My key is sk-ant-abc12345678901234567890' as any);

    const result = await tool.execute({ path: 'secrets.txt' });

    expect(result).toBe('My key is [REDACTED]');
  });
});
