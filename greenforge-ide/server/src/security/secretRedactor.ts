// server/src/security/secretRedactor.ts

interface RedactionPattern {
  name: string;
  pattern: RegExp;
}

const PATTERNS: RedactionPattern[] = [
  { name: 'Anthropic API Key', pattern: /sk-ant-[a-zA-Z0-9\-_]{20,}/g },
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48}/g },
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g },
  { name: 'AWS Secret', pattern: /(?:AWS_SECRET[_A-Z]*|aws_secret[_a-z]*)\s*[=:]\s*["']?([A-Za-z0-9+/]{40})["']?/g },
  { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey|access[_-]?token)\s*[=:]\s*["']?([a-zA-Z0-9\-_]{20,})["']?/gi },
  { name: 'Private Key Block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Generic Secret', pattern: /(?:password|passwd|secret|token)\s*[=:]\s*["']?([^\s"']{8,})["']?/gi },
];

export class SecretRedactor {
  redact(text: string): string {
    let result = text;

    for (const { pattern } of PATTERNS) {
      result = result.replace(pattern, (match, captured) => {
        if (captured) {
          // Substitui apenas o valor capturado, mantendo a chave
          return match.replace(captured, '[REDACTED]');
        }
        return '[REDACTED]';
      });
    }

    return result;
  }
}
