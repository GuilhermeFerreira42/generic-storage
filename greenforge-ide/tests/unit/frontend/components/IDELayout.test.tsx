/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IDELayout } from '@/components/ide/ide-layout';
import React from 'react';

// Mock components
vi.mock('@/components/ide/panels', () => ({
  ActivityBar: () => <div>ActivityBar</div>,
  BottomPanelTabs: () => <div>BottomPanelTabs</div>,
  StatusBar: () => <div>StatusBar</div>,
  Toolbar: () => <div>Toolbar</div>,
  ResizeHandle: () => <div>ResizeHandle</div>,
  PanelContainer: ({ children }: any) => <div>{children}</div>,
  PanelGroup: ({ children }: any) => <div>{children}</div>,
  Panel: ({ children }: any) => <div>{children}</div>,
  PanelResizeHandle: () => <div></div>,
}));

vi.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children }: any) => <div>{children}</div>,
  Panel: ({ children }: any) => <div>{children}</div>,
  PanelResizeHandle: () => <div></div>,
}));

vi.mock('./resizable-handle', () => ({
  ResizeHandle: () => <div>ResizeHandle</div>
}));

vi.mock('./panel-wrapper', () => ({
  PanelWrapper: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/lib/store', () => ({
  useIDEStore: vi.fn((selector) => {
    const state = {
      openTabs: [],
      activeTabId: null,
      updateTabContent: vi.fn(),
      showSidebar: true,
      showBottomPanel: true,
      showRightPanel: true,
      activeSidebarPanel: 'files',
      activeBottomPanel: 'terminal',
      toggleBottomPanel: vi.fn(),
      setActiveSidebarPanel: vi.fn(),
      setActiveBottomPanel: vi.fn(),
      theme: 'dark'
    };
    return selector ? selector(state) : state;
  })
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
  CodeEditor: () => <div>Code Editor</div>,
  EmptyEditor: () => <div>Empty Editor</div>
}));

vi.mock('@/components/ide/search-panel', () => ({
  SearchPanel: () => <div>Search Panel</div>
}));

vi.mock('@/components/ide/git-panel', () => ({
  GitPanel: () => <div>Git Panel</div>
}));

vi.mock('@/components/ide/agents-panel', () => ({
  AgentsPanel: () => <div>Agents Panel</div>
}));

describe('IDELayout', () => {
  it('renders all main panels', () => {
    render(<IDELayout />);
    expect(screen.getByText('File Explorer')).toBeDefined();
    expect(screen.getByText('Chat Panel')).toBeDefined();
    expect(screen.getByText('Terminal')).toBeDefined();
    expect(screen.getByText('Empty Editor')).toBeDefined();
  });
});

