#!/bin/bash
# GreenForge - PostToolUse Write Logger
# Registra todos os arquivos modificados pelo agent

INPUT=$(cat)

# Extrai o arquivo modificado do contexto (adaptar conforme schema real)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[^,}]*' | head -1 | cut -d'"' -f4 || echo "unknown")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Define caminho do log
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/../greenforge-changes.log"

# Cria diretório se necessário
mkdir -p "$(dirname "$LOG_FILE")"

# Registra no log
echo "[$TIMESTAMP] WRITE: $FILE_PATH" >> "$LOG_FILE"

exit 0
