/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GitPanel } from '@/components/ide/git-panel';
import { useIDEStore } from '@/lib/store';
import React from 'react';

vi.mock('@/lib/store');
vi.mock('lucide-react', () => ({
  GitBranch: () => <span>GitBranch</span>,
  GitCommit: () => <span>GitCommit</span>,
  GitPullRequest: () => <span>GitPullRequest</span>,
  Plus: () => <span>Plus</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  Check: () => <span>Check</span>,
  X: () => <span>X</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  FileText: () => <span>FileText</span>,
  FilePlus: () => <span>FilePlus</span>,
  FileMinus: () => <span>FileMinus</span>,
  FileEdit: () => <span>FileEdit</span>,
}));

describe('GitPanel', () => {
  const mockGitFiles = [
    { path: 'src/index.ts', status: 'modified' as const, staged: false },
    { path: 'src/utils.ts', status: 'added' as const, staged: true },
    { path: 'README.md', status: 'untracked' as const, staged: false },
  ];

  const mockCommits = [
    { hash: 'abc123', message: 'Initial commit', author: 'Dev', date: '2024-01-01' },
    { hash: 'def456', message: 'Add feature', author: 'Dev', date: '2024-01-02' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      gitFiles: mockGitFiles,
      currentBranch: 'main',
      gitCommits: mockCommits,
      setBranch: vi.fn(),
      stageFile: vi.fn(),
      unstageFile: vi.fn(),
      stageAll: vi.fn(),
      unstageAll: vi.fn(),
      commit: vi.fn(),
    }));
  });

  it('renders the Git panel with current branch', () => {
    render(<GitPanel />);
    expect(screen.getByText('Controle de Versão')).toBeDefined();
    expect(screen.getByText('main')).toBeDefined();
  });

  it('displays staged and unstaged files correctly', () => {
    render(<GitPanel />);
    expect(screen.getByText('Arquivos em Stage')).toBeDefined();
    expect(screen.getByText('src/utils.ts')).toBeDefined();
    expect(screen.getByText('Arquivos Modificados')).toBeDefined();
    expect(screen.getByText('src/index.ts')).toBeDefined();
    expect(screen.getByText('README.md')).toBeDefined();
  });

  it('calls stageFile when clicking the stage button on an unstaged file', () => {
    const stageFile = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      gitFiles: [{ path: 'src/index.ts', status: 'modified' as const, staged: false }],
      currentBranch: 'main',
      gitCommits: [],
      stageFile,
      unstageFile: vi.fn(),
      stageAll: vi.fn(),
      unstageAll: vi.fn(),
      commit: vi.fn(),
      setBranch: vi.fn(),
    }));

    render(<GitPanel />);
    // Expandir a seção de arquivos modificados se necessário
    const stageButton = screen.getByTitle('Adicionar ao Stage');
    fireEvent.click(stageButton);
    expect(stageFile).toHaveBeenCalledWith('src/index.ts');
  });

  it('calls unstageFile when clicking the unstage button on a staged file', () => {
    const unstageFile = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      gitFiles: [{ path: 'src/utils.ts', status: 'added' as const, staged: true }],
      currentBranch: 'main',
      gitCommits: [],
      stageFile: vi.fn(),
      unstageFile,
      stageAll: vi.fn(),
      unstageAll: vi.fn(),
      commit: vi.fn(),
      setBranch: vi.fn(),
    }));

    render(<GitPanel />);
    const unstageButton = screen.getByTitle('Remover do Stage');
    fireEvent.click(unstageButton);
    expect(unstageFile).toHaveBeenCalledWith('src/utils.ts');
  });

  it('calls commit when clicking the commit button with a message', () => {
    const commit = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      gitFiles: [{ path: 'src/utils.ts', status: 'added' as const, staged: true }],
      currentBranch: 'main',
      gitCommits: [],
      stageFile: vi.fn(),
      unstageFile: vi.fn(),
      stageAll: vi.fn(),
      unstageAll: vi.fn(),
      commit,
      setBranch: vi.fn(),
    }));

    render(<GitPanel />);
    const textarea = screen.getByPlaceholderText(/Mensagem do commit/i);
    fireEvent.change(textarea, { target: { value: 'feat: add new feature' } });
    
    const commitButton = screen.getByText(/Comitar/i);
    fireEvent.click(commitButton);
    expect(commit).toHaveBeenCalledWith('feat: add new feature');
  });

  it('disables commit button when there is no message or no staged files', () => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      gitFiles: [],
      currentBranch: 'main',
      gitCommits: [],
      stageFile: vi.fn(),
      unstageFile: vi.fn(),
      stageAll: vi.fn(),
      unstageAll: vi.fn(),
      commit: vi.fn(),
      setBranch: vi.fn(),
    }));

    render(<GitPanel />);
    const commitButton = screen.getByText(/Comitar/i);
    expect(commitButton).toHaveClass('cursor-not-allowed');
  });

  it('calls stageAll when clicking "Colocar todos"', () => {
    const stageAll = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      gitFiles: [{ path: 'src/index.ts', status: 'modified' as const, staged: false }],
      currentBranch: 'main',
      gitCommits: [],
      stageFile: vi.fn(),
      unstageFile: vi.fn(),
      stageAll,
      unstageAll: vi.fn(),
      commit: vi.fn(),
      setBranch: vi.fn(),
    }));

    render(<GitPanel />);
    const stageAllButton = screen.getByText('Colocar todos');
    fireEvent.click(stageAllButton);
    expect(stageAll).toHaveBeenCalled();
  });

  it('calls unstageAll when clicking "Remover todos"', () => {
    const unstageAll = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      gitFiles: [{ path: 'src/utils.ts', status: 'added' as const, staged: true }],
      currentBranch: 'main',
      gitCommits: [],
      stageFile: vi.fn(),
      unstageFile: vi.fn(),
      stageAll: vi.fn(),
      unstageAll,
      commit: vi.fn(),
      setBranch: vi.fn(),
    }));

    render(<GitPanel />);
    const unstageAllButton = screen.getByText('Remover todos');
    fireEvent.click(unstageAllButton);
    expect(unstageAll).toHaveBeenCalled();
  });

  it('displays commit history when expanded', () => {
    render(<GitPanel />);
    expect(screen.getByText('Initial commit')).toBeDefined();
    expect(screen.getByText('Add feature')).toBeDefined();
    expect(screen.getByText('abc123')).toBeDefined();
  });

  it('toggles branch dropdown when clicking branch button', () => {
    render(<GitPanel />);
    
    // Initially branches should not be visible
    expect(screen.queryByText('develop')).toBeNull();
    
    // Click to open branch dropdown
    const branchButton = screen.getByText('main').closest('button');
    if (branchButton) {
      fireEvent.click(branchButton);
    }
    
    // Now branches should be visible
    expect(screen.getByText('develop')).toBeDefined();
    expect(screen.getByText('feature/debate-protocol')).toBeDefined();
  });

  it('calls setBranch when selecting a different branch', () => {
    const setBranch = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      gitFiles: [],
      currentBranch: 'main',
      gitCommits: [],
      stageFile: vi.fn(),
      unstageFile: vi.fn(),
      stageAll: vi.fn(),
      unstageAll: vi.fn(),
      commit: vi.fn(),
      setBranch,
    }));

    render(<GitPanel />);
    
    // Open branch dropdown
    const branchButton = screen.getByText('main').closest('button');
    if (branchButton) {
      fireEvent.click(branchButton);
    }
    
    // Select develop branch
    const developButton = screen.getByText('develop');
    fireEvent.click(developButton);
    
    expect(setBranch).toHaveBeenCalledWith('develop');
  });

  it('shows empty state when no files are modified or staged', () => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      gitFiles: [],
      currentBranch: 'main',
      gitCommits: [],
      stageFile: vi.fn(),
      unstageFile: vi.fn(),
      stageAll: vi.fn(),
      unstageAll: vi.fn(),
      commit: vi.fn(),
      setBranch: vi.fn(),
    }));

    render(<GitPanel />);
    expect(screen.getByText('Diretório de trabalho limpo. Nada para comitar.')).toBeDefined();
  });
});
