import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListDirectoryTool } from '@/server/src/tools/filesystem/listDirectory';
import { TrustedFolders } from '@/server/src/security/trustedFolders';
import * as fs from 'fs';

vi.mock('fs');
vi.mock('@/server/src/security/trustedFolders');

describe('ListDirectoryTool', () => {
  let tool: ListDirectoryTool;
  let mockTrustedFolders: TrustedFolders;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrustedFolders = new TrustedFolders(['/workspace']);
    tool = new ListDirectoryTool(mockTrustedFolders);
    (mockTrustedFolders.resolve as any).mockImplementation((p: string) => `/workspace/${p}`);
  });

  it('should list directory entries', async () => {
    (fs.readdirSync as any).mockReturnValue(['file1.txt', 'dir1']);
    (fs.statSync as any).mockImplementation((p: string) => ({
      isDirectory: () => p.endsWith('dir1')
    }));

    const result = await tool.execute({ path: '.' });

    expect(result).toContain('file1.txt');
    expect(result).toContain('dir1/');
  });

  it('should ignore node_modules and .git', async () => {
    (fs.readdirSync as any).mockReturnValue(['src', 'node_modules', '.git']);
    (fs.statSync as any).mockImplementation(() => ({ isDirectory: () => true }));

    const result = await tool.execute({ path: '.' });

    expect(result).toContain('src/');
    expect(result).not.toContain('node_modules');
    expect(result).not.toContain('.git');
  });

  it('should handle errors gracefully', async () => {
    (fs.readdirSync as any).mockImplementation(() => { throw new Error('Permission denied'); });

    const result = await tool.execute({ path: 'restricted' });

    expect(result).toContain('Erro ao ler diretório');
    expect(result).toContain('Permission denied');
  });
});
