// server/src/security/secretRedactor.ts

/**
 * Redator de segredos - detecta e mascara informações sensíveis
 * antes de enviar ao LLM, frontend ou persistir no banco
 */

export class SecretRedactor {
  private patterns: Array<{ regex: RegExp; replacement: string }> = [
    // Chaves Anthropic
    {
      regex: /sk-ant-[a-zA-Z0-9_-]{20,}/g,
      replacement: '[ANTHROPIC_KEY_REDACTED]',
    },
    // Chaves OpenAI
    {
      regex: /sk-[a-zA-Z0-9]{20,}/g,
      replacement: '[OPENAI_KEY_REDACTED]',
    },
    // Chaves Gemini
    {
      regex: /[A-Za-z0-9_-]{39}/g,
      replacement: '[GEMINI_KEY_REDACTED]',
    },
    // JWT tokens
    {
      regex: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
      replacement: '[JWT_REDACTED]',
    },
    // AWS Access Key ID
    {
      regex: /AKIA[0-9A-Z]{16}/g,
      replacement: '[AWS_KEY_REDACTED]',
    },
    // AWS Secret Access Key (padrão base64)
    {
      regex: /[A-Za-z0-9/+=]{40}/g,
      replacement: '[AWS_SECRET_REDACTED]',
    },
    // Generic API keys (padrão comum)
    {
      regex: /api[_-]?key["']?\s*[:=]\s*["'][a-zA-Z0-9_-]{16,}["']/gi,
      replacement: '[API_KEY_REDACTED]',
    },
    // Private key blocks
    {
      regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g,
      replacement: '[PRIVATE_KEY_REDACTED]',
    },
    // Passwords em variáveis de ambiente
    {
      regex: /(password|passwd|pwd)["']?\s*[:=]\s*["'][^"']{4,}["']/gi,
      replacement: '[PASSWORD_REDACTED]',
    },
    // Database URLs com credenciais
    {
      regex: /(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@/gi,
      replacement: '$1://[CREDENTIALS_REDACTED]@',
    },
  ];

  /**
   * Redacta todos os segredos encontrados em um texto
   */
  redact(text: string): string {
    let result = text;
    for (const { regex, replacement } of this.patterns) {
      result = result.replace(regex, replacement);
    }
    return result;
  }

  /**
   * Redacta valores em um objeto (para tool results)
   */
  redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const cloned = JSON.parse(JSON.stringify(obj));
    
    for (const key of Object.keys(cloned)) {
      const value = cloned[key];
      if (typeof value === 'string') {
        cloned[key] = this.redact(value);
      } else if (typeof value === 'object' && value !== null) {
        cloned[key] = this.redactObject(value as Record<string, unknown>);
      }
    }
    
    return cloned;
  }
}
