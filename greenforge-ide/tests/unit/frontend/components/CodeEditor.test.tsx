import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeEditor } from '@/components/ide/code-editor';
import { useIDEStore } from '@/lib/store';
import React from 'react';

vi.mock('@/lib/store');
// Mock CodeMirror since it's hard to test in JSDOM
vi.mock('@codemirror/view', () => ({
  EditorView: class {
    destroy = vi.fn();
  }
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
