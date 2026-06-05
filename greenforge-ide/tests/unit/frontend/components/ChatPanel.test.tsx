import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from '@/components/ide/chat-panel';
import { useIDEStore } from '@/lib/store';
import { useAgentStore } from '@/store/agentStore';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import React from 'react';

// Mock dependencies
vi.mock('@/lib/store');
vi.mock('@/store/agentStore');
vi.mock('@/hooks/useAgentSocket');
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
  Paperclip: () => <span>Paperclip</span>
}));

// Mock child components that might be complex
vi.mock('@/components/chat/StatusBadge', () => ({
  StatusBadge: () => <div>StatusBadge</div>
}));
vi.mock('@/components/chat/AgentDebateMessage', () => ({
  AgentDebateMessage: () => <div>AgentDebateMessage</div>
}));

describe('ChatPanel', () => {
  const mockSendUserMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [],
      addMessage: vi.fn(),
      approvalCard: null,
      resetDebateSession: vi.fn(),
      debateSession: null,
    }));

    (useAgentStore as any).mockImplementation((selector: any) => selector({
      isConnected: true,
      isThinking: false,
    }));

    (useAgentSocket as any).mockReturnValue({
      isConnected: true,
      sendUserMessage: mockSendUserMessage,
      stopDebate: vi.fn(),
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

  it('shows empty state when there are no messages', () => {
    render(<ChatPanel />);
    expect(screen.getByText(/Núcleo Adversarial GreenForge/i)).toBeDefined();
  });

  it('renders messages when they exist', () => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      messages: [
        { id: '1', role: 'user', content: 'User message', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Agent response', timestamp: Date.now() },
      ],
      addMessage: vi.fn(),
      approvalCard: null,
      resetDebateSession: vi.fn(),
      debateSession: null,
    }));

    render(<ChatPanel />);
    expect(screen.getByText('User message')).toBeDefined();
    expect(screen.getByText('Agent response')).toBeDefined();
  });
});
