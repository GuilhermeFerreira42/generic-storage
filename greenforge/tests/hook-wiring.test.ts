import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function readJsonSafe(path: string) {
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

describe('Fase 21 — Hook Wiring Configuration', () => {
  describe('A. .qwen/settings.json', () => {
    it('1. settings.json is valid JSON and parseable', () => {
      const settings = readJsonSafe(join(projectRoot, '.qwen/settings.json'));
      expect(settings).toBeDefined();
      expect(settings.hooks).toBeDefined();
    });

    it('2. All hooks use type "command" (no http)', () => {
      const settings = readJsonSafe(join(projectRoot, '.qwen/settings.json'));
      const allHooks = Object.values(settings.hooks).flatMap((arr: any) => 
        arr.flatMap((item: any) => item.hooks || [])
      );
      for (const h of allHooks) {
        expect(h.type).toBe('command');
        expect(h).not.toHaveProperty('url');
      }
    });

    it('3. All hooks point to "dist/index.js hook"', () => {
      const settings = readJsonSafe(join(projectRoot, '.qwen/settings.json'));
      const allHooks = Object.values(settings.hooks).flatMap((arr: any) => 
        arr.flatMap((item: any) => item.hooks || [])
      );
      for (const h of allHooks) {
        expect(h.command).toMatch(/dist\/index\.js hook/);
      }
    });

    it('4. No localhost:7777 remains in settings.json', () => {
      const raw = readFileSync(join(projectRoot, '.qwen/settings.json'), 'utf-8');
      expect(raw).not.toMatch(/localhost:7777/);
    });
  });

  describe('B. qwen-extension.json', () => {
    it('5. qwen-extension.json is valid JSON and parseable', () => {
      const manifest = readJsonSafe(join(projectRoot, 'qwen-extension.json'));
      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('greenforge');
    });

    it('6. mcpServers points to dist/index.js with mcp', () => {
      const manifest = readJsonSafe(join(projectRoot, 'qwen-extension.json'));
      const server = manifest.mcpServers.greenforge;
      expect(server).toBeDefined();
      expect(server.args).toEqual(expect.arrayContaining(['mcp']));
      expect(server.command).toBe('node');
    });

    it('7. hooks field points to .qwen/settings.json', () => {
      const manifest = readJsonSafe(join(projectRoot, 'qwen-extension.json'));
      expect(manifest.hooks).toBe('.qwen/settings.json');
    });
  });

  describe('C. No legacy references', () => {
    it('8. No localhost:7777 in qwen-extension.json', () => {
      const raw = readFileSync(join(projectRoot, 'qwen-extension.json'), 'utf-8');
      expect(raw).not.toMatch(/localhost:7777/);
    });
  });
});
