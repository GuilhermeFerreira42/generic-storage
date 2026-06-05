import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WriteFileTool } from '@/server/src/tools/filesystem/writeFile';
import { TrustedFolders } from '@/server/src/security/trustedFolders';
import * as fs from 'fs';
import path from 'path';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn(),
  promises: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  }
}));
vi.mock('@/server/src/security/trustedFolders');

describe('WriteFileTool', () => {
  let tool: WriteFileTool;
  let mockTrustedFolders: TrustedFolders;
  let mockedFS = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrustedFolders = new TrustedFolders(['/workspace']);
    tool = new WriteFileTool(mockTrustedFolders);
    mockedFS = vi.mocked(fs);
    (mockTrustedFolders.resolve as any).mockImplementation((p: string) => `/workspace/${p}`);
  });

  it('should write a file successfully', async () => {
    const input = { path: 'new.txt', content: 'hello world' };
    
    const result = await tool.execute(input);

    expect(mockedFS.mkdirSync).toHaveBeenCalledWith('/workspace', { recursive: true });
    expect(mockedFS.writeFileSync).toHaveBeenCalledWith('/workspace/new.txt', 'hello world', 'utf-8');
    expect(result).toContain('Arquivo escrito com sucesso');
  });

  it('should generate a diff correctly', () => {
    const input = { path: 'test.txt', content: 'new content' };
    mockedFS.existsSync.mockReturnValue(true as any);
    mockedFS.readFileSync.mockReturnValue('old content' as any);

    const diff = tool.previewDiff?.(input);

    expect(diff).toContain('test.txt');
    expect(diff).toContain('-old content');
    expect(diff).toContain('+new content');
  });

  it('should describe the action correctly', () => {
    mockedFS.existsSync.mockReturnValue(false as any);
    expect(tool.describeAction({ path: 'new.txt' })).toContain('Criar novo arquivo');

    mockedFS.existsSync.mockReturnValue(true as any);
    expect(tool.describeAction({ path: 'existing.txt' })).toContain('Sobrescrever arquivo existente');
  });
});
