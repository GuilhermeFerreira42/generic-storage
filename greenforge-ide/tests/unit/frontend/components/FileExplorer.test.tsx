/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileExplorer } from '@/components/ide/file-explorer';
import { useIDEStore } from '@/lib/store';
import React from 'react';

vi.mock('@/lib/store');
vi.mock('lucide-react', () => ({
  File: () => <span>File</span>,
  Folder: () => <span>Folder</span>,
  FolderOpen: () => <span>FolderOpen</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  Plus: () => <span>Plus</span>,
  FolderPlus: () => <span>FolderPlus</span>,
  MoreVertical: () => <span>MoreVertical</span>,
  Search: () => <span>Search</span>,
  FileCode: () => <span>FileCode</span>,
  FileJson: () => <span>FileJson</span>,
  FileText: () => <span>FileText</span>,
  Braces: () => <span>Braces</span>,
  Trash2: () => <span>Trash2</span>,
  Edit3: () => <span>Edit3</span>,
  Download: () => <span>Download</span>,
  Upload: () => <span>Upload</span>,
  RefreshCw: () => <span>RefreshCw</span>,
}));

describe('FileExplorer', () => {
  const mockFiles = [
    { id: '1', name: 'src', type: 'folder', parentId: null, isOpen: true },
    { id: '2', name: 'index.ts', type: 'file', parentId: '1' }
  ];

  const mockAddFile = vi.fn();
  const mockDeleteFile = vi.fn();
  const mockRenameFile = vi.fn();
  const mockToggleFolder = vi.fn();
  const mockAddTab = vi.fn();
  const mockExportWorkspace = vi.fn();
  const mockSyncWorkspace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      files: mockFiles,
      getFilesTree: () => [
        { ...mockFiles[0], children: [mockFiles[1]] }
      ],
      toggleFolder: mockToggleFolder,
      addFile: mockAddFile,
      deleteFile: mockDeleteFile,
      renameFile: mockRenameFile,
      setActiveTab: vi.fn(),
      addTab: mockAddTab,
      exportWorkspace: mockExportWorkspace,
      syncWorkspace: mockSyncWorkspace,
      activeTabId: null,
    }));
  });

  it('renders the file tree', () => {
    render(<FileExplorer />);
    expect(screen.getByText('src')).toBeDefined();
    expect(screen.getByText('index.ts')).toBeDefined();
  });

  it('calls addTab when a file is clicked', () => {
    render(<FileExplorer />);
    fireEvent.click(screen.getByText('index.ts'));
    expect(mockAddTab).toHaveBeenCalled();
  });

  it('calls toggleFolder when a folder is clicked', () => {
    render(<FileExplorer />);
    fireEvent.click(screen.getByText('src'));
    expect(mockToggleFolder).toHaveBeenCalledWith('1');
  });

  it('shows creation input when "Novo arquivo raiz" is clicked', () => {
    render(<FileExplorer />);
    const addBtn = screen.getByTitle('Novo arquivo raiz');
    fireEvent.click(addBtn);
    
    expect(screen.getByPlaceholderText('nome-do-arquivo.ts')).toBeDefined();
  });

  it('calls addFile when creating a new file', () => {
    render(<FileExplorer />);
    fireEvent.click(screen.getByTitle('Novo arquivo raiz'));
    
    const input = screen.getByPlaceholderText('nome-do-arquivo.ts');
    fireEvent.change(input, { target: { value: 'new-file.ts' } });
    fireEvent.click(screen.getByText('Criar'));
    
    expect(mockAddFile).toHaveBeenCalledWith(null, 'new-file.ts', 'file');
  });

  it('calls deleteFile when delete button is clicked', () => {
    render(<FileExplorer />);
    
    // Simular hover para mostrar botões (ou apenas encontrar pelo id se estiver no DOM)
    // No componente real, os botões aparecem no onMouseEnter do FileTreeItem
    const item = screen.getByText('src').closest('.group');
    if (item) fireEvent.mouseEnter(item);

    const deleteBtn = screen.getByTitle('Excluir');
    fireEvent.click(deleteBtn);
    
    expect(mockDeleteFile).toHaveBeenCalledWith('1');
  });

  it('enters editing mode when rename button is clicked', () => {
    render(<FileExplorer />);
    
    const item = screen.getByText('src').closest('.group');
    if (item) fireEvent.mouseEnter(item);

    const renameBtn = screen.getByTitle('Renomear');
    fireEvent.click(renameBtn);
    
    expect(screen.getByDisplayValue('src')).toBeDefined();
  });

  it('calls renameFile when finishing editing', () => {
    render(<FileExplorer />);
    
    const item = screen.getByText('index.ts').closest('.group');
    if (item) fireEvent.mouseEnter(item);

    fireEvent.click(screen.getByTitle('Renomear'));
    
    const input = screen.getByDisplayValue('index.ts');
    fireEvent.change(input, { target: { value: 'renamed.ts' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockRenameFile).toHaveBeenCalledWith('2', 'renamed.ts');
  });

  it('calls exportWorkspace when export button is clicked', () => {
    render(<FileExplorer />);
    const exportBtn = screen.getByTitle('Exportar Workspace (.zip)');
    fireEvent.click(exportBtn);
    expect(mockExportWorkspace).toHaveBeenCalled();
  });
});

