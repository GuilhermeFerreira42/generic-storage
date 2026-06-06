import { describe, it, expect } from 'vitest';
import { TrustedFolders } from '@/server/src/security/trustedFolders';
import { SecretRedactor } from '@/server/src/security/secretRedactor';
import path from 'path';

describe('Security - TrustedFolders', () => {
  const workspaceRoot = path.resolve('C:\\Users\\Usuario\\Desktop\\workspace');

  it('should allow paths inside the workspace', () => {
    const tf = new TrustedFolders([workspaceRoot]);
    const targetPath = 'src/index.ts';
    expect(() => tf.resolve(targetPath)).not.toThrow();
    expect(tf.resolve(targetPath)).toContain('src');
  });

  it('should deny paths outside the workspace', () => {
    const tf = new TrustedFolders([workspaceRoot]);
    const targetPath = '../../Windows/System32/config';
    expect(() => tf.resolve(targetPath)).toThrow(/SecurityViolation/);
  });
});

describe('Security - SecretRedactor', () => {
  const redactor = new SecretRedactor();

  it('should redact Anthropic API keys', () => {
    const input = 'My key is sk-ant-api03-abcdef123456-78901234567890';
    const output = redactor.redact(input);
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('abcdef123456');
  });

  it('should redact generic tokens', () => {
    const input = 'token: secret-value-123456';
    const output = redactor.redact(input);
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('secret-value');
  });
});
