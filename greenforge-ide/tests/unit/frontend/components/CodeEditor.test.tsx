/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeEditor } from '@/components/ide/code-editor';
import { useIDEStore } from '@/lib/store';
import React from 'react';

vi.mock('@/lib/store');
vi.mock('@codemirror/view', () => ({
  EditorView: class {
    constructor(config: any) {
      if (config && config.parent) {
        const textarea = document.createElement('textarea');
        textarea.setAttribute('role', 'textbox');
        config.parent.appendChild(textarea);
      }
    }
    state = {
      doc: {
        toString: () => ''
      }
    };
    destroy = vi.fn();
    dispatch = vi.fn();
    static updateListener = {
      of: vi.fn(() => [])
    };
    static theme = vi.fn(() => [])
  },
  lineNumbers: vi.fn(() => []),
  highlightActiveLineGutter: vi.fn(() => []),
  highlightSpecialChars: vi.fn(() => []),
  drawSelection: vi.fn(() => []),
  dropCursor: vi.fn(() => []),
  rectangularSelection: vi.fn(() => []),
  crosshairCursor: vi.fn(() => []),
  highlightActiveLine: vi.fn(() => []),
  keymap: { of: vi.fn(() => []) }
}));

describe('CodeEditor', () => {
  beforeEach(() => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      activeTabId: 'file1.ts',
      openTabs: [{ id: 'file1.ts', name: 'file1.ts', content: 'const x = 1;', language: 'typescript' }],
      updateTabContent: vi.fn()
    }));
  });

  it('renders correctly when a tab is active', () => {
    render(<CodeEditor />);
    // Since CodeMirror is mocked, we just check if the container renders
    const container = screen.getByRole('textbox', { hidden: true }).parentElement;
    expect(container).toBeDefined();
  });

  it('shows empty state when no tab is active', () => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      activeTabId: null,
      openTabs: []
    }));
    render(<CodeEditor />);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
