import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WriteFileTool } from '@/server/src/tools/filesystem/writeFile';
import { TrustedFolders } from '@/server/src/security/trustedFolders';
import * as fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('@/server/src/security/trustedFolders');

describe('WriteFileTool', () => {
  let tool: WriteFileTool;
  let mockTrustedFolders: TrustedFolders;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrustedFolders = new TrustedFolders(['/workspace']);
    tool = new WriteFileTool(mockTrustedFolders);
    (mockTrustedFolders.resolve as any).mockImplementation((p: string) => `/workspace/${p}`);
  });

  it('should write a file successfully', async () => {
    const input = { path: 'new.txt', content: 'hello world' };
    
    const result = await tool.execute(input);

    expect(fs.mkdirSync).toHaveBeenCalledWith('/workspace', { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith('/workspace/new.txt', 'hello world', 'utf-8');
    expect(result).toContain('Arquivo escrito com sucesso');
  });

  it('should generate a diff correctly', () => {
    const input = { path: 'test.txt', content: 'new content' };
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue('old content');

    const diff = tool.previewDiff?.(input);

    expect(diff).toContain('test.txt');
    expect(diff).toContain('-old content');
    expect(diff).toContain('+new content');
  });

  it('should describe the action correctly', () => {
    (fs.existsSync as any).mockReturnValue(false);
    expect(tool.describeAction({ path: 'new.txt' })).toContain('Criar novo arquivo');

    (fs.existsSync as any).mockReturnValue(true);
    expect(tool.describeAction({ path: 'existing.txt' })).toContain('Sobrescrever arquivo existente');
  });
});
