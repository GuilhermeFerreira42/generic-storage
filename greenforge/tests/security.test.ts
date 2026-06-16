import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { safeResolve, safeResolveForWrite } from '../src/shared/SafeResolve.js';
import { atomicWrite } from '../src/shared/AtomicWrite.js';
import { SecurityError } from '../src/shared/errors.js';
import { mkdtemp, rm, writeFile, readFile, mkdir, symlink, readdir } from 'fs/promises';
import path from 'path';
import os from 'os';
import { existsSync } from 'fs';

describe('Security (SafeResolve & AtomicWrite)', () => {
  let rootPath: string;

  beforeEach(async () => {
    rootPath = await mkdtemp(path.join(os.tmpdir(), 'gf-security-test-'));
  });

  afterEach(async () => {
    await rm(rootPath, { recursive: true, force: true });
  });

  describe('SafeResolve', () => {
    it('should resolve a valid path inside root', async () => {
      const filePath = path.join(rootPath, 'test.txt');
      await writeFile(filePath, 'hello');
      
      const resolved = await safeResolve('test.txt', rootPath);
      expect(resolved.toLowerCase()).toBe(path.normalize(filePath).toLowerCase());
    });

    it('should reject path traversal with "../"', async () => {
      await expect(safeResolve('../outside.txt', rootPath))
        .rejects.toThrow(SecurityError);
    });

    it('should reject absolute paths outside root', async () => {
      const absoluteOutside = path.resolve(rootPath, '..', 'outside.txt');
      await expect(safeResolve(absoluteOutside, rootPath))
        .rejects.toThrow(SecurityError);
    });

    it('should reject prefix tricks (root vs root-evil)', async () => {
      // Create a sibling directory to root
      const rootEvil = rootPath + '-evil';
      await mkdir(rootEvil, { recursive: true });
      try {
        const secretFile = path.join(rootEvil, 'secret.txt');
        await writeFile(secretFile, 'stolen');
        
        // Input path that might try to trick a simple startsWith validation
        const relativeEvil = path.relative(rootPath, secretFile);
        
        await expect(safeResolve(relativeEvil, rootPath))
          .rejects.toThrow(SecurityError);
      } finally {
        await rm(rootEvil, { recursive: true, force: true });
      }
    });

    it('should reject symlinks pointing outside root', async () => {
      const outsideDir = await mkdtemp(path.join(os.tmpdir(), 'gf-outside-'));
      const outsideFile = path.join(outsideDir, 'secret.txt');
      await writeFile(outsideFile, 'confidential');
      
      const linkPath = path.join(rootPath, 'evil-link');
      
      try {
        // Create symlink inside root pointing outside
        await symlink(outsideFile, linkPath);
        
        await expect(safeResolve('evil-link', rootPath))
          .rejects.toThrow(SecurityError);
      } catch (e: any) {
        // Some environments might not allow symlinks without admin rights
        if (e.code === 'EPERM') {
          console.warn('Skipping symlink test due to missing permissions');
          return;
        }
        throw e;
      } finally {
        await rm(outsideDir, { recursive: true, force: true });
      }
    });
  });

  describe('SafeResolveForWrite', () => {
    it('should allow resolving a non-existent file path inside root', async () => {
      const resolved = await safeResolveForWrite('new-file.ts', rootPath);
      const expected = path.normalize(path.join(rootPath, 'new-file.ts'));
      expect(resolved.toLowerCase()).toBe(expected.toLowerCase());
    });

    it('should reject writing outside root via "../"', async () => {
      await expect(safeResolveForWrite('../../etc/passwd', rootPath))
        .rejects.toThrow(SecurityError);
    });
  });

  describe('AtomicWrite', () => {
    it('should write content correctly using patterns', async () => {
      const target = path.join(rootPath, 'config.json');
      const content = JSON.stringify({ key: 'value' });
      
      await atomicWrite(target, content);
      
      const saved = await readFile(target, 'utf8');
      expect(saved).toBe(content);
      
      // Verify no temp files left
      const files = await readdir(path.dirname(target));
      const tempFiles = files.filter(f => f.includes('.tmp.'));
      expect(tempFiles.length).toBe(0);
    });

    it('should substitute an existing file correctly', async () => {
      const target = path.join(rootPath, 'existing.txt');
      await writeFile(target, 'old content');
      
      await atomicWrite(target, 'new content');
      
      const saved = await readFile(target, 'utf8');
      expect(saved).toBe('new content');
    });

    it('should handle UTF-8 content correctly', async () => {
      const target = path.join(rootPath, 'utf8.txt');
      const content = 'Café com Ação 🚀';
      
      await atomicWrite(target, content);
      
      const saved = await readFile(target, 'utf8');
      expect(saved).toBe(content);
    });
  });
});
