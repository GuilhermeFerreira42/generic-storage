#!/bin/bash
# GreenForge - PreToolUse Safety Hook
# Lê o contexto da ferramenta via stdin e bloqueia comandos perigosos

# Lê o input JSON do stdin (formato do OpenClaude)
INPUT=$(cat)

# Extrai o comando a ser executado (adaptar conforme schema real)
# O input contém tool_name e tool_input no formato JSON
TOOL_INPUT=$(echo "$INPUT" | grep -o '"tool_input"[^}]*' | head -1 || echo "")

# Lista de padrões bloqueados
BLOCKED_PATTERNS=(
  "rm -rf"
  "sudo rm"
  "dd if="
  "> /dev/sd"
  "mkfs"
  ":(){ :|:& };:"
  "chmod -R 777"
  "curl.*\\|.*bash"
  "wget.*\\|.*sh"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$TOOL_INPUT" | grep -qi "$pattern"; then
    echo "GREENFORGE SAFETY: Comando bloqueado - padrão perigoso detectado: $pattern" >&2
    exit 2  # Exit 2 bloqueia a execução da ferramenta
  fi
done

# Permite a execução
exit 0
