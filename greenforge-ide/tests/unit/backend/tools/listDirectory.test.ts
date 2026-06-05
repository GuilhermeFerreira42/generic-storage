import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListDirectoryTool } from '@/server/src/tools/filesystem/listDirectory';
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

describe('ListDirectoryTool', () => {
  let tool: ListDirectoryTool;
  let mockTrustedFolders: TrustedFolders;
  let mockedFS = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrustedFolders = new TrustedFolders(['/workspace']);
    tool = new ListDirectoryTool(mockTrustedFolders);
    mockedFS = vi.mocked(fs);
    (mockTrustedFolders.resolve as any).mockImplementation((p: string) => `/workspace/${p}`);
  });

  it('should list directory entries', async () => {
    mockedFS.readdirSync.mockReturnValue(['file1.txt', 'dir1'] as any);
    mockedFS.statSync.mockImplementation((p: string) => ({
      isDirectory: () => p.endsWith('dir1')
    } as any));

    const result = await tool.execute({ path: '.' });

    expect(result).toContain('file1.txt');
    expect(result).toContain('dir1/');
  });

  it('should ignore node_modules and .git', async () => {
    mockedFS.readdirSync.mockReturnValue(['src', 'node_modules', '.git'] as any);
    mockedFS.statSync.mockImplementation(() => ({ isDirectory: () => true } as any));

    const result = await tool.execute({ path: '.' });

    expect(result).toContain('src/');
    expect(result).not.toContain('node_modules');
    expect(result).not.toContain('.git');
  });

  it('should handle errors gracefully', async () => {
    mockedFS.readdirSync.mockImplementation(() => { throw new Error('Permission denied'); });

    const result = await tool.execute({ path: 'restricted' });

    expect(result).toContain('Erro ao ler diretório');
    expect(result).toContain('Permission denied');
  });
});
