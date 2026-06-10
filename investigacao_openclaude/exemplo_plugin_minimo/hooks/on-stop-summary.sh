#!/bin/bash
# GreenForge - Stop Hook Summary Generator
# Gera resumo da sessão ao finalizar

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUMMARY_FILE="$SCRIPT_DIR/../greenforge-session-summary.md"

cat >> "$SUMMARY_FILE" << SUMMARY
## Sessão Finalizada em $TIMESTAMP

### Resumo
- Data: $TIMESTAMP
- Diretório de trabalho: $(pwd)

### Próximos passos recomendados
1. Revise as mudanças geradas
2. Execute testes para validar as alterações
3. Faça commit das mudanças aprovadas

---

SUMMARY

exit 0
