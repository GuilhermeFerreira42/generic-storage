import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchInFilesTool } from '@/server/src/tools/filesystem/searchInFiles';
import { TrustedFolders } from '@/server/src/security/trustedFolders';
import * as fs from 'fs';

vi.mock('fs');
vi.mock('@/server/src/security/trustedFolders');

describe('SearchInFilesTool', () => {
  let tool: SearchInFilesTool;
  let mockTrustedFolders: TrustedFolders;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrustedFolders = new TrustedFolders(['/workspace']);
    tool = new SearchInFilesTool(mockTrustedFolders);
    (mockTrustedFolders.resolve as any).mockImplementation((p: string) => `/workspace/${p}`);
  });

  it('should find query in files', async () => {
    (fs.readdirSync as any).mockImplementation((p: string) => {
      if (p === '/workspace/.') return ['test.txt'];
      return [];
    });
    (fs.statSync as any).mockImplementation(() => ({
      isDirectory: () => false,
      isFile: () => true
    }));
    (fs.readFileSync as any).mockReturnValue('line 1\nline with query\nline 3');

    const result = await tool.execute({ query: 'query' });

    expect(result).toContain('test.txt:2: line with query');
  });

  it('should return "not found" message if no results', async () => {
    (fs.readdirSync as any).mockReturnValue([]);

    const result = await tool.execute({ query: 'missing' });

    expect(result).toBe('Nenhum resultado encontrado.');
  });
});
