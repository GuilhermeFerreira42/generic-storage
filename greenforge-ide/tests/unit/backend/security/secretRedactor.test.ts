import { describe, it, expect } from 'vitest';
import { SecretRedactor } from '@/server/src/security/secretRedactor';

describe('SecretRedactor', () => {
  const redactor = new SecretRedactor();

  it('should redact Anthropic API keys', () => {
    const text = 'My key is sk-ant-abc12345678901234567890';
    expect(redactor.redact(text)).toBe('My key is [REDACTED]');
  });

  it('should redact OpenAI API keys', () => {
    const text = 'My key is sk-0123456789abcdef0123456789abcdef0123456789abcdef';
    expect(redactor.redact(text)).toBe('My key is [REDACTED]');
  });

  it('should redact JWT tokens', () => {
    const text = 'token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(redactor.redact(text)).toBe('token: [REDACTED]');
  });

  it('should redact AWS secrets', () => {
    const text = 'AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"';
    expect(redactor.redact(text)).toContain('[REDACTED]');
  });

  it('should redact private keys', () => {
    const text = `
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA75p+...
-----END RSA PRIVATE KEY-----
    `;
    expect(redactor.redact(text)).toContain('[REDACTED]');
  });

  it('should redact generic secrets', () => {
    const text = 'password: mysecretpassword';
    expect(redactor.redact(text)).toContain('[REDACTED]');
  });

  it('should handle text without secrets', () => {
    const text = 'Hello world, no secrets here!';
    expect(redactor.redact(text)).toBe(text);
  });
});
