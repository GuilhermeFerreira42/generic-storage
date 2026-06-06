/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Terminal } from '@/components/ide/terminal';
import { useIDEStore } from '@/lib/store';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import React from 'react';

vi.mock('@/lib/store');
vi.mock('@/hooks/useAgentSocket');
vi.mock('lucide-react', () => ({
  Terminal: () => <span>TerminalIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
  XCircle: () => <span>XIcon</span>,
  CheckCircle2: () => <span>CheckIcon</span>,
  Copy: () => <span>Copy</span>,
  Check: () => <span>Check</span>,
  Loader2: () => <span>Loader2</span>,
}));

describe('Terminal', () => {
  const mockExecuteTerminalCommand = vi.fn();
  const mockClearTerminal = vi.fn();
  const mockSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      terminalHistory: [],
      addTerminalLine: vi.fn(),
      clearTerminal: mockClearTerminal,
      executeTerminalCommand: mockExecuteTerminalCommand,
      currentDir: '/workspace'
    }));

    (useAgentSocket as any).mockReturnValue({
      isConnected: false,
      sendMessage: mockSendMessage,
      sessionId: 'test-session'
    });
  });

  it('renders the terminal container', () => {
    render(<Terminal />);
    expect(screen.getByText(/GreenForge OS Terminal/i)).toBeDefined();
  });

  it('calls clearTerminal when clear button is clicked', () => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      terminalHistory: ['some command'],
      clearTerminal: mockClearTerminal,
    }));

    render(<Terminal />);
    const clearButton = screen.getByTitle(/Limpar terminal/i);
    fireEvent.click(clearButton);
    expect(mockClearTerminal).toHaveBeenCalled();
  });

  it('handles user input and executes command on Enter', async () => {
    render(<Terminal />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ls' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockExecuteTerminalCommand).toHaveBeenCalledWith('ls');
  });

  it('navigates history with Up arrow', async () => {
    render(<Terminal />);
    
    const input = screen.getByRole('textbox');
    
    // First execute a command to have history
    fireEvent.change(input, { target: { value: 'pwd' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    // Press Up - wait for state to settle
    await vi.waitFor(() => {
      fireEvent.keyDown(input, { key: 'ArrowUp', code: 'ArrowUp' });
      expect(input).toHaveValue('pwd');
    });
  });

  it('sends message via socket when connected', () => {
    (useAgentSocket as any).mockReturnValue({
      isConnected: true,
      sendMessage: mockSendMessage,
      sessionId: 'test-session'
    });

    render(<Terminal />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'whoami' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'terminal_command',
      command: 'whoami'
    }));
  });
});

