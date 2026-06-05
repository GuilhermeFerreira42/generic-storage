import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchInFilesTool } from '@/server/src/tools/filesystem/searchInFiles';
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

describe('SearchInFilesTool', () => {
  let tool: SearchInFilesTool;
  let mockTrustedFolders: TrustedFolders;
  let mockedFS = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrustedFolders = new TrustedFolders(['/workspace']);
    tool = new SearchInFilesTool(mockTrustedFolders);
    mockedFS = vi.mocked(fs);
    (mockTrustedFolders.resolve as any).mockImplementation((p: string) => `/workspace/${p}`);
  });

  it('should find query in files', async () => {
    mockedFS.readdirSync.mockImplementation((p: string) => {
      if (p === '/workspace/.') return ['test.txt'] as any;
      return [];
    });
    mockedFS.statSync.mockImplementation(() => ({
      isDirectory: () => false,
      isFile: () => true
    } as any));
    mockedFS.readFileSync.mockReturnValue('line 1\nline with query\nline 3' as any);

    const result = await tool.execute({ query: 'query' });

    expect(result).toContain('test.txt:2: line with query');
  });

  it('should return "not found" message if no results', async () => {
    mockedFS.readdirSync.mockReturnValue([] as any);

    const result = await tool.execute({ query: 'missing' });

    expect(result).toBe('Nenhum resultado encontrado.');
  });
});
