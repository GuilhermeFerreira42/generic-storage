import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatPanel } from '@/components/ide/chat-panel'
import { useIDEStore } from '@/lib/store'

describe('ChatPanel Component', () => {
  beforeEach(() => {
    useIDEStore.setState({
      messages: [],
      debateSession: null,
      approvalCard: null,
      isDebating: false,
    })
  })

  it('renders default empty state when there are no messages', () => {
    render(<ChatPanel />)
    expect(screen.getByText('Núcleo Adversarial GreenForge')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Descreva seu escopo de implantação/)).toBeInTheDocument()
  })

  it('renders system and user messages', () => {
    useIDEStore.setState({
      messages: [
        { id: '1', role: 'user', content: 'Crie um arquivo index.js', timestamp: Date.now() },
        { id: '2', role: 'system', content: 'Processando solicitação...', agentName: 'Sistema', timestamp: Date.now() },
      ]
    })

    render(<ChatPanel />)

    expect(screen.getByText('Crie um arquivo index.js')).toBeInTheDocument()
    expect(screen.getByText('Processando solicitação...')).toBeInTheDocument()
    expect(screen.getByText('Sistema')).toBeInTheDocument()
  })

  it('allows user to type and send messages', async () => {
    // We mock the sendUserMessage hook method in setup.ts, but let's test input behavior
    render(<ChatPanel />)

    const textarea = screen.getByPlaceholderText(/Descreva seu escopo de implantação/)
    await userEvent.type(textarea, 'Teste de envio')
    expect(textarea).toHaveValue('Teste de envio')

    // Submit button should be enabled
    const submitBtn = screen.getByRole('button', { name: '' }) // Send icon button has no text
    expect(submitBtn).toBeEnabled()
  })

  it('renders debate status if session is active', () => {
    useIDEStore.setState({
      debateSession: {
        id: 'session-1',
        status: 'IN_PROGRESS',
        objective: 'Criar roteador REST',
        rounds: [],
        currentRound: 2,
        managerConfidence: 90,
      }
    })

    render(<ChatPanel />)

    expect(screen.getByText('Em Debate Dialético')).toBeInTheDocument()
    expect(screen.getByText('Foco: Criar roteador REST')).toBeInTheDocument()
    expect(screen.getByText('Fase 2 / 4 do debate estruturado')).toBeInTheDocument()
  })

  it('renders approval card (Gate Card) and interacts with buttons', async () => {
    const resolveGateSpy = vi.fn()
    useIDEStore.setState({
      approvalCard: {
        id: 'card-1',
        sessionId: 'session-1',
        type: 'GATE_1',
        title: 'Proposta de Modificação de Arquivos',
        summary: 'Resumo das alterações planejadas',
        underlyingQuestion: 'Pergunta implícita',
        synthesis: 'Síntese dialética',
        redFlags: ['Path traversal mitigado'],
        estimatedTokens: 1024,
        risk: 'LOW',
        chunks: [
          { id: 'chunk-1', filePath: 'index.js', oldContent: '', newContent: 'console.log("hello")', approved: false }
        ]
      },
      resolveGate: resolveGateSpy
    })

    render(<ChatPanel />)

    expect(screen.getByText('GATE ADVERSARIAL — Resiliência Aprovada')).toBeInTheDocument()
    expect(screen.getByText('Proposta de Modificação de Arquivos')).toBeInTheDocument()
    expect(screen.getByText('Resumo das alterações planejadas')).toBeInTheDocument()
    expect(screen.getByText('- Path traversal mitigado')).toBeInTheDocument()

    // Test expandable solution code
    const expandBtn = screen.getByRole('button', { name: 'Visualizar Código de Solução' })
    await userEvent.click(expandBtn)
    expect(screen.getByText('console.log("hello")')).toBeInTheDocument()

    // Test Merge button click
    const mergeBtn = screen.getByText('Mesclar e Gravar Workspace')
    await userEvent.click(mergeBtn)
    expect(resolveGateSpy).toHaveBeenCalledWith('APPROVE')

    // Test Discard button click
    const discardBtn = screen.getByText('Descartar')
    await userEvent.click(discardBtn)
    expect(resolveGateSpy).toHaveBeenCalledWith('REJECT')
  })
})
