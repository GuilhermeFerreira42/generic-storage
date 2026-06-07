import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileExplorer } from '@/components/ide/file-explorer'
import { useIDEStore } from '@/lib/store'

describe('FileExplorer Component', () => {
  beforeEach(() => {
    useIDEStore.setState({
      files: [],
      openTabs: [],
      activeTabId: null,
    })
  })

  it('renders VFS empty state when no files exist', () => {
    render(<FileExplorer />)
    expect(screen.getByText('VFS Vazio')).toBeInTheDocument()
    expect(screen.getByText(/Use os botões no topo/)).toBeInTheDocument()
  })

  it('renders tree node structure', () => {
    useIDEStore.setState({
      files: [
        { id: 'src', name: 'src', type: 'folder', parentId: null, createdAt: 0, isOpen: true },
        { id: 'src/App.tsx', name: 'App.tsx', type: 'file', parentId: 'src', createdAt: 0 },
      ]
    })

    render(<FileExplorer />)

    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('App.tsx')).toBeInTheDocument()
  })

  it('should toggle folder expand/collapse when clicked', async () => {
    useIDEStore.setState({
      files: [
        { id: 'src', name: 'src', type: 'folder', parentId: null, createdAt: 0, isOpen: false },
        { id: 'src/App.tsx', name: 'App.tsx', type: 'file', parentId: 'src', createdAt: 0 },
      ]
    })

    render(<FileExplorer />)

    // folder is closed, so children are not rendered
    expect(screen.queryByText('App.tsx')).not.toBeInTheDocument()

    // Click on folder to open it
    const folderElement = screen.getByText('src')
    await userEvent.click(folderElement)

    // Store state changes, re-rendering with new files open state
    const files = useIDEStore.getState().files
    expect(files[0].isOpen).toBe(true)
  })

  it('opens node as tab when clicking on a file', async () => {
    const addTabSpy = vi.fn()
    useIDEStore.setState({
      files: [
        { id: 'App.tsx', name: 'App.tsx', type: 'file', parentId: null, content: 'export {}', createdAt: 0 }
      ],
      addTab: addTabSpy
    })

    render(<FileExplorer />)

    const fileElement = screen.getByText('App.tsx')
    await userEvent.click(fileElement)

    expect(addTabSpy).toHaveBeenCalledWith({
      id: 'App.tsx',
      name: 'App.tsx',
      content: 'export {}',
      language: 'typescript',
      isDirty: false
    })
  })

  it('shows action buttons on hover and handles deletion', async () => {
    const deleteSpy = vi.fn()
    useIDEStore.setState({
      files: [
        { id: 'App.tsx', name: 'App.tsx', type: 'file', parentId: null, createdAt: 0 }
      ],
      deleteFile: deleteSpy
    })

    render(<FileExplorer />)

    const itemRow = screen.getByText('App.tsx').closest('.group')
    expect(itemRow).toBeInTheDocument()

    // Hover to reveal action buttons
    fireEvent.mouseEnter(itemRow!)

    const deleteBtn = itemRow!.querySelector('[title="Excluir"]')
    expect(deleteBtn).toBeInTheDocument()

    await userEvent.click(deleteBtn!)
    expect(deleteSpy).toHaveBeenCalledWith('App.tsx')
  })

  it('shows rename dialog on double click', async () => {
    const renameSpy = vi.fn()
    useIDEStore.setState({
      files: [
        { id: 'App.tsx', name: 'App.tsx', type: 'file', parentId: null, createdAt: 0 }
      ],
      renameFile: renameSpy
    })

    render(<FileExplorer />)

    const itemRow = screen.getByText('App.tsx').closest('.group')
    
    // Double click to start editing
    fireEvent.doubleClick(itemRow!)

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('App.tsx')

    // Change value and blur to confirm rename
    await userEvent.clear(input)
    await userEvent.type(input, 'Index.tsx')
    fireEvent.blur(input)

    expect(renameSpy).toHaveBeenCalledWith('App.tsx', 'Index.tsx')
  })

  it('triggers folder creation workflow using top toolbar buttons', async () => {
    const addFileSpy = vi.fn()
    useIDEStore.setState({
      addFile: addFileSpy
    })

    render(<FileExplorer />)

    const createFolderBtn = screen.getByTitle('Nova pasta raiz')
    await userEvent.click(createFolderBtn)

    const input = screen.getByPlaceholderText('nome-da-pasta')
    expect(input).toBeInTheDocument()

    await userEvent.type(input, 'assets{enter}')
    expect(addFileSpy).toHaveBeenCalledWith(null, 'assets', 'folder')
  })
})
