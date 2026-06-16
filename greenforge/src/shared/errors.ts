/**
 * Erro lançado quando uma violação de segurança de filesystem é detectada.
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}
