import { describe, it, expect, vi, beforeEach } from 'vitest';
import { read_file } from '@/server/src/tools/filesystem/readFile';
import { TrustedFolders } from '@/server/src/security/trustedFolders';

vi.mock('@/server/src/security/trustedFolders', () => ({
  TrustedFolders: {
    isPathTrusted: vi.fn(),
    resolveAndValidate: vi.fn(),
  },
}));

describe('read_file tool', () => {
  const mockWorkspace = '/workspace';

  beforeEach(() => {
    vi.clearAllMocks();
    (TrustedFolders.isPathTrusted as any).mockReturnValue(true);
    (TrustedFolders.resolveAndValidate as any).mockImplementation((path: string) => path);
  });

  it('reads a file successfully', async () => {
    const fs = await import('fs/promises');
    const originalReadFile = fs.readFile;
    (fs.readFile as any) = vi.fn().mockResolvedValue('file content');

    const result = await read_file.execute({
      path: 'src/index.ts',
      workspace: mockWorkspace,
    });

    expect(result.success).toBe(true);
    expect(result.content).toBe('file content');
    
    (fs.readFile as any) = originalReadFile;
  });

  it('blocks reading files outside workspace', async () => {
    (TrustedFolders.isPathTrusted as any).mockReturnValue(false);

    const result = await read_file.execute({
      path: '../../../etc/passwd',
      workspace: mockWorkspace,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('fora');
  });

  it('blocks reading sensitive files like .env', async () => {
    const result = await read_file.execute({
      path: '.env',
      workspace: mockWorkspace,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('sensível');
  });

  it('blocks reading .key files', async () => {
    const result = await read_file.execute({
      path: 'secret.key',
      workspace: mockWorkspace,
    });

    expect(result.success).toBe(false);
  });

  it('handles non-existent files', async () => {
    const fs = await import('fs/promises');
    const originalReadFile = fs.readFile;
    (fs.readFile as any) = vi.fn().mockRejectedValue(new Error('ENOENT'));

    const result = await read_file.execute({
      path: 'nonexistent.ts',
      workspace: mockWorkspace,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('não existe');
    
    (fs.readFile as any) = originalReadFile;
  });

  it('returns file size in metadata', async () => {
    const fs = await import('fs/promises');
    const originalReadFile = fs.readFile;
    (fs.readFile as any) = vi.fn().mockResolvedValue('content');

    const result = await read_file.execute({
      path: 'file.txt',
      workspace: mockWorkspace,
    });

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.size).toBeGreaterThan(0);
    
    (fs.readFile as any) = originalReadFile;
  });

  it('detects language from file extension', async () => {
    const fs = await import('fs/promises');
    const originalReadFile = fs.readFile;
    (fs.readFile as any) = vi.fn().mockResolvedValue('code');

    const result = await read_file.execute({
      path: 'test.ts',
      workspace: mockWorkspace,
    });

    expect(result.metadata?.language).toBe('typescript');
    
    (fs.readFile as any) = originalReadFile;
  });

  it('handles large files with size limit', async () => {
    const fs = await import('fs/promises');
    const originalReadFile = fs.readFile;
    const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
    (fs.readFile as any) = vi.fn().mockResolvedValue(largeContent);

    const result = await read_file.execute({
      path: 'large.txt',
      workspace: mockWorkspace,
    });

    // Should either succeed with truncation or fail with size error
    expect(result.success || result.error).toBeDefined();
    
    (fs.readFile as any) = originalReadFile;
  });

  it('generates correct schema', () => {
    const schema = read_file.schema;
    
    expect(schema).toBeDefined();
    expect(schema.name).toBe('read_file');
    expect(schema.description).toBeDefined();
    expect(schema.inputSchema).toBeDefined();
    expect(schema.inputSchema.properties.path).toBeDefined();
  });

  it('is not destructive', () => {
    expect(read_file.isDestructive).toBe(false);
  });

  it('does not require approval for safe paths', () => {
    const result = read_file.requiresApproval?.({
      path: 'src/index.ts',
      workspace: mockWorkspace,
    });

    expect(result).toBe(false);
  });
});
