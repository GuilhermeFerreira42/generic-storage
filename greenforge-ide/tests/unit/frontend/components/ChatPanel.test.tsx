/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from '@/components/ide/chat-panel';
import { useIDEStore } from '@/lib/store';
import { useAgentStore } from '@/store/agentStore';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { useDebateStore } from '@/store/debateStore';
import React from 'react';

// Polyfill para scrollIntoView no JSDOM
if (typeof window !== 'undefined' && window.HTMLElement) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

// Mock dependencies
vi.mock('@/lib/store');
vi.mock('@/store/agentStore');
vi.mock('@/hooks/useAgentSocket');
vi.mock('@/store/debateStore');
vi.mock('lucide-react', () => ({
  Send: () => <span>Send</span>,
  Loader2: () => <span>Loader2</span>,
  Bot: () => <span>Bot</span>,
  User: () => <span>User</span>,
  Sparkles: () => <span>Sparkles</span>,
  AlertTriangle: () => <span>AlertTriangle</span>,
  CheckCircle2: () => <span>CheckCircle2</span>,
  XCircle: () => <span>XCircle</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  Edit3: () => <span>Edit3</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  Shield: () => <span>Shield</span>,
  Zap: () => <span>Zap</span>,
  Code2: () => <span>Code2</span>,
  GitBranch: () => <span>GitBranch</span>,
  Paperclip: () => <span>Paperclip</span>,
  RotateCcw: () => <span>RotateCcw</span>,
  Square: () => <span>Square</span>,
  Check: () => <span>Check</span>,
  X: () => <span>X</span>,
}));

// Mock child components
vi.mock('@/components/chat/StatusBadge', () => ({
  StatusBadge: () => <div>StatusBadge</div>
}));
vi.mock('@/components/chat/AgentDebateMessage', () => ({
  AgentDebateMessage: () => <div>AgentDebateMessage</div>
}));

describe('ChatPanel', () => {
  const mockSendUserMessage = vi.fn();
  const mockStopDebate = vi.fn();
  const mockResetDebateSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [],
      addMessage: vi.fn(),
      approvalCard: null,
      resetDebateSession: mockResetDebateSession,
      debateSession: null,
      resolveGate: vi.fn(),
    }));

    (useAgentStore as any).mockImplementation((selector: any) => selector({
      isConnected: true,
      isThinking: false,
    }));

    (useDebateStore as any).mockImplementation((selector: any) => selector({
      messages: [],
      status: 'IDLE',
      resetDebate: vi.fn(),
    }));

    (useAgentSocket as any).mockReturnValue({
      isConnected: true,
      sendUserMessage: mockSendUserMessage,
      stopDebate: mockStopDebate,
    });
  });

  it('renders correctly', () => {
    render(<ChatPanel />);
    expect(screen.getByText(/GreenForge Nexus Agents/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Descreva seu escopo de implantação/i)).toBeDefined();
  });

  it('sends a message when the send button is clicked', () => {
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText(/Descreva seu escopo de implantação/i);
    const sendButton = screen.getByRole('button', { name: /Send/i });

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    expect(mockSendUserMessage).toHaveBeenCalledWith('Hello');
  });

  it('displays streaming tokens when they arrive', () => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [
        { id: '1', role: 'assistant', content: 'Thinking...', isStreaming: true, timestamp: Date.now() }
      ],
      addMessage: vi.fn(),
      approvalCard: null,
      resetDebateSession: mockResetDebateSession,
      debateSession: null,
    }));

    render(<ChatPanel />);
    expect(screen.getByText('Thinking...')).toBeDefined();
  });

  it('renders approval card when required', () => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [{ id: '0', role: 'assistant', content: '...', timestamp: Date.now() }],
      approvalCard: {
        id: 'action-1',
        title: 'Criar Arquivo',
        summary: 'Deseja criar o arquivo index.ts?',
        risk: 'LOW',
        synthesis: 'Consenso alcançado',
        redFlags: [],
        estimatedTokens: 100,
        chunks: []
      },
      resetDebateSession: mockResetDebateSession,
      debateSession: null,
    }));

    render(<ChatPanel />);
    expect(screen.getByText('Criar Arquivo')).toBeDefined();
    expect(screen.getByText('Deseja criar o arquivo index.ts?')).toBeDefined();
  });

  it('calls resolveGate(APPROVE) when Approve is clicked', () => {
    const mockResolveGate = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [{ id: '0', role: 'assistant', content: '...', timestamp: Date.now() }],
      approvalCard: { id: 'action-1', title: 'Test', summary: 'Test', risk: 'LOW', synthesis: 'S', redFlags: [], estimatedTokens: 0, chunks: [] },
      resolveGate: mockResolveGate,
      resetDebateSession: mockResetDebateSession,
      debateSession: null,
    }));

    render(<ChatPanel />);
    const approveBtn = screen.getByText(/Mesclar e Gravar Workspace/i);
    fireEvent.click(approveBtn);
    
    expect(mockResolveGate).toHaveBeenCalledWith('APPROVE');
  });

  it('calls resolveGate(REJECT) when Reject is clicked', () => {
    const mockResolveGate = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [{ id: '0', role: 'assistant', content: '...', timestamp: Date.now() }],
      approvalCard: { id: 'action-1', title: 'Test', summary: 'Test', risk: 'LOW', synthesis: 'S', redFlags: [], estimatedTokens: 0, chunks: [] },
      resolveGate: mockResolveGate,
      resetDebateSession: mockResetDebateSession,
      debateSession: null,
    }));

    render(<ChatPanel />);
    const rejectBtn = screen.getByText('Descartar');
    fireEvent.click(rejectBtn);
    
    expect(mockResolveGate).toHaveBeenCalledWith('REJECT');
  });

  it('calls stopDebate when stop button is clicked', () => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [],
      debateSession: { status: 'IN_PROGRESS', objective: 'Test' },
      resetDebateSession: mockResetDebateSession,
    }));
    
    (useDebateStore as any).mockImplementation((selector: any) => selector({
      messages: [],
      status: 'IN_PROGRESS',
      resetDebate: vi.fn(),
    }));

    render(<ChatPanel />);
    const stopBtn = screen.getByTitle(/Parar Processamento/i);
    fireEvent.click(stopBtn);
    
    expect(mockStopDebate).toHaveBeenCalled();
  });
});
