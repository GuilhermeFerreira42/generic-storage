/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Terminal } from '@/components/ide/terminal';
import { useIDEStore } from '@/lib/store';
import React from 'react';

vi.mock('@/lib/store');
vi.mock('lucide-react', () => ({
  Terminal: () => <span>TerminalIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
  XCircle: () => <span>XIcon</span>,
  CheckCircle2: () => <span>CheckIcon</span>,
  Copy: () => <span>Copy</span>,
  Check: () => <span>Check</span>,
}));

// Mock XTerm.js since it's hard to test in JSDOM
vi.mock('xterm', () => ({
  Terminal: class {
    open = vi.fn();
    write = vi.fn();
    onData = vi.fn();
    onKey = vi.fn();
    loadAddon = vi.fn();
    dispose = vi.fn();
  }
}));

describe('Terminal', () => {
  beforeEach(() => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      terminalHistory: [],
      addTerminalLine: vi.fn(),
      clearTerminal: vi.fn(),
      executeTerminalCommand: vi.fn()
    }));
  });

  it('renders the terminal container', () => {
    render(<Terminal />);
    expect(screen.getByText('Terminal')).toBeDefined();
  });

  it('calls clearTerminal when clear button is clicked', () => {
    const clearTerminal = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      terminalHistory: ['some command'],
      clearTerminal
    }));

    render(<Terminal />);
    const clearButton = screen.getByTitle('Limpar terminal (Ctrl+L)');
    fireEvent.click(clearButton);
    expect(clearTerminal).toHaveBeenCalled();
  });
});

