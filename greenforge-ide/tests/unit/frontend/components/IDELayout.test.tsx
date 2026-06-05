/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IDELayout } from '@/components/ide/ide-layout';
import React from 'react';

// Mock components
vi.mock('@/components/ide/panels', () => ({
  PanelContainer: ({ children }: any) => <div>{children}</div>,
  PanelGroup: ({ children }: any) => <div>{children}</div>,
  Panel: ({ children }: any) => <div>{children}</div>,
  Toolbar: () => <div>Toolbar</div>,
  PanelResizeHandle: () => <div></div>,
}));

vi.mock('@/components/ide/file-explorer', () => ({
  FileExplorer: () => <div>File Explorer</div>
}));

vi.mock('@/components/ide/chat-panel', () => ({
  ChatPanel: () => <div>Chat Panel</div>
}));

vi.mock('@/components/ide/terminal', () => ({
  Terminal: () => <div>Terminal</div>
}));

vi.mock('@/components/ide/code-editor', () => ({
  CodeEditor: () => <div>Code Editor</div>
}));

describe('IDELayout', () => {
  it('renders all main panels', () => {
    render(<IDELayout />);
    expect(screen.getByText('File Explorer')).toBeDefined();
    expect(screen.getByText('Chat Panel')).toBeDefined();
    expect(screen.getByText('Terminal')).toBeDefined();
    expect(screen.getByText('Code Editor')).toBeDefined();
  });
});

