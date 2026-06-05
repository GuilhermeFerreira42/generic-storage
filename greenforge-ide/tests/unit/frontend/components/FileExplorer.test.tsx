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
  Trash2: () => <span>Trash2</span>,
  Edit2: () => <span>Edit2</span>
}));

describe('FileExplorer', () => {
  const mockFiles = [
    { id: '1', name: 'src', type: 'folder', parentId: null, isOpen: true },
    { id: '2', name: 'index.ts', type: 'file', parentId: '1' }
  ];

  beforeEach(() => {
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      files: mockFiles,
      getFilesTree: () => [
        { ...mockFiles[0], children: [mockFiles[1]] }
      ],
      toggleFolder: vi.fn(),
      addFile: vi.fn(),
      deleteFile: vi.fn(),
      renameFile: vi.fn(),
      setActiveTab: vi.fn(),
      addTab: vi.fn()
    }));
  });

  it('renders the file tree', () => {
    render(<FileExplorer />);
    expect(screen.getByText('src')).toBeDefined();
    expect(screen.getByText('index.ts')).toBeDefined();
  });

  it('calls addTab when a file is clicked', () => {
    const addTab = vi.fn();
    (useIDEStore as any).mockImplementation((selector: any) => selector({
      files: mockFiles,
      getFilesTree: () => [{ ...mockFiles[0], children: [mockFiles[1]] }],
      addTab
    }));

    render(<FileExplorer />);
    fireEvent.click(screen.getByText('index.ts'));
    expect(addTab).toHaveBeenCalled();
  });
});
