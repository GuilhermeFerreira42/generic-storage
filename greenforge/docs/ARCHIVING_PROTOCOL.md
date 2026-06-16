# PROTOCOLO DE ARQUIVAMENTO PÓS-FASE v2.0 — GreenForge

## Quando Executar
Após a conclusão e validação de cada nova fase do projeto, mediante instrução explícita do usuário.

## Pré-condição Obrigatória
Antes de iniciar, CONFIRMAR que:
- [ ] A suíte de testes em `greenforge/tests/` passa integralmente.
- [ ] Nenhum arquivo de código-fonte está em estado inconsistente.
- [ ] O blueprint da fase foi fornecido pelo usuário ou existe em `greenforge/docs/archive/`.

## Passos Obrigatórios

### Passo 1 — Verificar Testes
Confirmar que a suíte de testes passa. Reportar total encontrado e passando.

### Passo 2 — Arquivar Blueprint
Salvar o blueprint em `greenforge/docs/archive/phase_XX_nome.resolved`.

### Passo 3 — Reescrever CURRENT_STATE.md
Atualizar arquitetura, tabela de módulos (com assinaturas), fluxo e invariantes. Target: ≤ 1800 tokens.

### Passo 4 — Append ao DECISION_LOG.md
Adicionar seção da fase: `FN | TIPO | DECISÃO | MOTIVO | ARQUIVOS`.

### Passo 5 — Compressão Progressiva
Consolidar se > 3000 tokens.

### Passo 6 — Atualizar BACKLOG_FUTURO.md
Marcar item como `CONCLUÍDO` e atualizar descrição para refletir o que foi **realmente entregue**.

### Passo 7 — Criar/Atualizar PHASE_SUMMARY.md
Gerar arquivo `greenforge/docs/phase_N_resumo.md`.

### Passo 8 — Atualizar .ai-context
Atualizar resumo do estado e próximas etapas.

### Passo 9 — Atualizar .humano
Registrar marco de conclusão.

### Passo 10 — Limpeza do Projeto
Remover arquivos temporários e organizar diretórios.

### Passo 11 — Sugerir Mensagem de Commit
Formato: `[FASE N] DESCRIÇÃO — RESUMO`.
