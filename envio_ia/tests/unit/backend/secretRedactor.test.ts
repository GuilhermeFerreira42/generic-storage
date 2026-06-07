import { describe, it, expect } from 'vitest'
import { SecretRedactor } from '@/server/src/security/secretRedactor'

describe('SecretRedactor', () => {
  const redactor = new SecretRedactor()

  it('redacts Anthropic API Keys', () => {
    const text = 'my key is sk-ant-sid8172has8912hjashajs8912h and it is private'
    const redacted = redactor.redact(text)
    expect(redacted).toBe('my key is [REDACTED] and it is private')
  })

  it('redacts OpenAI API Keys', () => {
    // OpenAI keys pattern: sk-[a-zA-Z0-9]{48} (sk- followed by 48 chars)
    const key = 'sk-' + 'a'.repeat(48)
    const text = `my key is ${key} here`
    const redacted = redactor.redact(text)
    expect(redacted).toBe('my key is [REDACTED] here')
  })

  it('redacts JWT Tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const text = `token = ${jwt}`
    const redacted = redactor.redact(text)
    expect(redacted).toBe('token = [REDACTED]')
  })

  it('redacts AWS Secrets', () => {
    const text1 = 'AWS_SECRET_KEY = "1234567890123456789012345678901234567890"'
    const text2 = 'aws_secret: \'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn\''
    
    expect(redactor.redact(text1)).toBe('AWS_SECRET_KEY = "[REDACTED]"')
    expect(redactor.redact(text2)).toBe('aws_secret: \'[REDACTED]\'')
  })

  it('redacts Generic API Keys', () => {
    const text1 = 'api-key = "my-secret-access-token-1234"'
    const text2 = 'access_token: 12345678901234567890abc'

    expect(redactor.redact(text1)).toBe('api-key = "[REDACTED]"')
    expect(redactor.redact(text2)).toBe('access_token: [REDACTED]')
  })

  it('redacts Private Key Blocks', () => {
    const rsaKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y2X5tB5z...
-----END RSA PRIVATE KEY-----`
    const text = `Here is key:\n${rsaKey}`
    const redacted = redactor.redact(text)
    expect(redacted).toBe('Here is key:\n[REDACTED]')
  })

  it('redacts generic password and secrets', () => {
    const text = 'my_password="supersecretpassword123"'
    expect(redactor.redact(text)).toBe('my_password="[REDACTED]"')
  })

  it('does not redact harmless normal text', () => {
    const text = 'This is a normal message with no API keys or secrets in it.'
    expect(redactor.redact(text)).toBe(text)
  })
})
