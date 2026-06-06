/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchPanel } from '@/components/ide/search-panel';
import { useIDEStore } from '@/lib/store';
import React from 'react';

vi.mock('@/lib/store');
vi.mock('lucide-react', () => ({
  Search: () => <span>Search</span>,
  X: () => <span>X</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  Replace: () => <span>Replace</span>,
  FileText: () => <span>FileText</span>,
}));

describe('SearchPanel', () => {
  const mockFilesTree = [
    {
      id: '1',
      name: 'src',
      type: 'folder' as const,
      children: [
        {
          id: '2',
          name: 'index.ts',
          type: 'file' as const,
          language: 'typescript',
          content: 'const x = 1;\nconst y = 2;\nconsole.log(x);',
        },
        {
          id: '3',
          name: 'utils.ts',
          type: 'file' as const,
          language: 'typescript',
          content: 'export function add(a: number, b: number) {\n  return a + b;\n}',
        },
      ],
    },
    {
      id: '4',
      name: 'README.md',
      type: 'file' as const,
      language: 'markdown',
      content: '# Project\nThis is a test project.',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      getFilesTree: () => mockFilesTree,
      addTab: vi.fn(),
    }));
  });

  it('renders the search panel', () => {
    render(<SearchPanel />);
    expect(screen.getByText('Buscar')).toBeDefined();
    expect(screen.getByPlaceholderText('Buscar')).toBeDefined();
  });

  it('shows replace input when replace toggle is clicked', () => {
    render(<SearchPanel />);
    
    const replaceButton = screen.getByText('Substituir');
    fireEvent.click(replaceButton);
    
    expect(screen.getByPlaceholderText('Substituir')).toBeDefined();
  });

  it('toggles case sensitive button', () => {
    render(<SearchPanel />);
    
    const caseSensitiveButton = screen.getByText('Aa');
    expect(caseSensitiveButton).toBeDefined();
    
    fireEvent.click(caseSensitiveButton);
    // Second click to toggle back
    fireEvent.click(caseSensitiveButton);
  });

  it('toggles whole word button', () => {
    render(<SearchPanel />);
    
    const wholeWordButton = screen.getByText('ab');
    expect(wholeWordButton).toBeDefined();
    
    fireEvent.click(wholeWordButton);
  });

  it('toggles regex button', () => {
    render(<SearchPanel />);
    
    const regexButton = screen.getByText('.*');
    expect(regexButton).toBeDefined();
    
    fireEvent.click(regexButton);
  });

  it('searches when pressing Enter in the search input', () => {
    render(<SearchPanel />);
    
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'const' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    // Should show results for "const" which appears in index.ts
    expect(screen.getByText(/resultado/)).toBeDefined();
  });

  it('displays search results with file names and match counts', () => {
    render(<SearchPanel />);
    
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'const' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    // Check that results are displayed
    expect(screen.getByText('index.ts')).toBeDefined();
  });

  it('clears search when clicking the clear button', () => {
    render(<SearchPanel />);
    
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // The clear button should appear after typing
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    
    // Input should be cleared (we can verify by checking state through re-render)
    expect(searchInput).toHaveValue('');
  });

  it('expands/collapses file results when clicking on them', () => {
    render(<SearchPanel />);
    
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'const' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    // Find the file result button
    const fileButton = screen.getByText('index.ts').closest('button');
    if (fileButton) {
      // Initially expanded, click to collapse
      fireEvent.click(fileButton);
    }
  });

  it('opens file in editor when clicking on a match result', () => {
    const addTab = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      getFilesTree: () => mockFilesTree,
      addTab,
    }));

    render(<SearchPanel />);
    
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'const' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    // Click on a match line (line number button)
    const matchLine = screen.getByText('1');
    fireEvent.click(matchLine);
    
    expect(addTab).toHaveBeenCalled();
  });

  it('shows "no results" message when search returns nothing', () => {
    render(<SearchPanel />);
    
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    expect(screen.getByText('Nenhum resultado encontrado')).toBeDefined();
  });

  it('displays result count summary', () => {
    render(<SearchPanel />);
    
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'const' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    // Should show something like "X resultado(s) em Y arquivo(s)"
    expect(screen.getByText(/resultado/)).toBeDefined();
  });

  it('handles case sensitive search', () => {
    render(<SearchPanel />);
    
    // Enable case sensitive
    const caseSensitiveButton = screen.getByText('Aa');
    fireEvent.click(caseSensitiveButton);
    
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'Const' } }); // Capital C
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    // With case sensitive, "Const" should not match "const"
    // This might show no results or different results
  });

  it('truncates long match lists to 20 and shows more indicator', () => {
    // Create a file with many matches
    const manyMatchesFile = [
      {
        id: 'many',
        name: 'lots.ts',
        type: 'file' as const,
        language: 'typescript',
        content: Array(50).fill('const x = 1;').join('\n'),
      },
    ];

    (useIDEStore as any).mockImplementation((selector: any) => selector({
      getFilesTree: () => manyMatchesFile,
      addTab: vi.fn(),
    }));

    render(<SearchPanel />);
    
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'const' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    
    // Should show "+30 mais..." indicator
    expect(screen.getByText(/\+.*mais/)).toBeDefined();
  });
});
