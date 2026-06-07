import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useIDEStore, buildTree } from '@/lib/store'

describe('useIDEStore', () => {
  beforeEach(() => {
    // Reset state before each test
    const store = useIDEStore.getState()
    store.clearMessages()
    store.clearTerminal()
    store.resetDebateSession()
    useIDEStore.setState({
      files: [],
      openTabs: [],
      activeTabId: null,
      sidebarWidth: 260,
      bottomPanelHeight: 250,
      rightPanelWidth: 380,
      showSidebar: true,
      showBottomPanel: true,
      showRightPanel: true,
      activeSidebarPanel: 'files',
      activeBottomPanel: 'terminal',
      gitFiles: [],
      gitCommits: [],
      currentBranch: 'main',
      theme: 'dark',
    })
  })

  describe('Tabs Management', () => {
    it('should add a tab and set it active', () => {
      const { addTab } = useIDEStore.getState()
      addTab({
        id: 'file1.ts',
        name: 'file1.ts',
        content: 'const a = 1;',
        language: 'typescript',
        isDirty: false,
      })

      const state = useIDEStore.getState()
      expect(state.openTabs).toHaveLength(1)
      expect(state.openTabs[0].id).toBe('file1.ts')
      expect(state.activeTabId).toBe('file1.ts')
    })

    it('should close a tab and set another tab active if closed tab was active', () => {
      const { addTab, closeTab } = useIDEStore.getState()
      addTab({ id: 'file1.ts', name: 'file1.ts', content: '', language: 'ts', isDirty: false })
      addTab({ id: 'file2.ts', name: 'file2.ts', content: '', language: 'ts', isDirty: false })

      closeTab('file2.ts')

      const state = useIDEStore.getState()
      expect(state.openTabs).toHaveLength(1)
      expect(state.activeTabId).toBe('file1.ts')
    })
  })

  describe('Files & Folder Tree Management', () => {
    it('should add a file and updates the git files as added', () => {
      const { addFile } = useIDEStore.getState()
      addFile(null, 'index.ts', 'file')

      const state = useIDEStore.getState()
      expect(state.files).toHaveLength(1)
      expect(state.files[0].id).toBe('index.ts')
      expect(state.gitFiles.find(gf => gf.path === 'index.ts')?.status).toBe('added')
    })

    it('should delete a file and recursively delete nested items', () => {
      const { setFiles, deleteFile } = useIDEStore.getState()
      setFiles([
        { id: 'src', name: 'src', type: 'folder', parentId: null, content: '', createdAt: 0 },
        { id: 'src/index.ts', name: 'index.ts', type: 'file', parentId: 'src', content: '', createdAt: 0 }
      ])

      deleteFile('src')

      const state = useIDEStore.getState()
      expect(state.files).toHaveLength(0)
    })

    it('should rename a folder and updates all sub-paths', () => {
      const { setFiles, renameFile } = useIDEStore.getState()
      setFiles([
        { id: 'old-name', name: 'old-name', type: 'folder', parentId: null, content: '', createdAt: 0 },
        { id: 'old-name/index.ts', name: 'index.ts', type: 'file', parentId: 'old-name', content: '', createdAt: 0 }
      ])

      renameFile('old-name', 'new-name')

      const state = useIDEStore.getState()
      const folder = state.files.find(f => f.name === 'new-name')
      const file = state.files.find(f => f.name === 'index.ts')

      expect(folder?.id).toBe('new-name')
      expect(file?.id).toBe('new-name/index.ts')
      expect(file?.parentId).toBe('new-name')
    })

    it('should build tree hierarchy correctly using buildTree helper', () => {
      const flat = [
        { id: 'folder', name: 'folder', type: 'folder' as const, parentId: null, content: '', createdAt: 0 },
        { id: 'folder/file.ts', name: 'file.ts', type: 'file' as const, parentId: 'folder', content: '', createdAt: 0 }
      ]
      const tree = buildTree(flat)
      expect(tree).toHaveLength(1)
      expect(tree[0].children).toHaveLength(1)
      expect(tree[0].children?.[0].id).toBe('folder/file.ts')
    })
  })

  describe('Git Panel', () => {
    it('should allow staging and unstaging files', () => {
      useIDEStore.setState({
        gitFiles: [
          { path: 'a.ts', status: 'modified', staged: false },
          { path: 'b.ts', status: 'added', staged: false },
        ]
      })

      const { stageFile, unstageFile, stageAll, unstageAll } = useIDEStore.getState()
      
      stageFile('a.ts')
      expect(useIDEStore.getState().gitFiles[0].staged).toBe(true)

      unstageFile('a.ts')
      expect(useIDEStore.getState().gitFiles[0].staged).toBe(false)

      stageAll()
      expect(useIDEStore.getState().gitFiles.every(f => f.staged)).toBe(true)

      unstageAll()
      expect(useIDEStore.getState().gitFiles.every(f => !f.staged)).toBe(true)
    })

    it('should perform a commit when files are staged', () => {
      useIDEStore.setState({
        gitFiles: [
          { path: 'a.ts', status: 'modified', staged: true },
          { path: 'b.ts', status: 'added', staged: false },
        ]
      })

      const { commit } = useIDEStore.getState()
      commit('feat: commit test')

      const state = useIDEStore.getState()
      expect(state.gitCommits).toHaveLength(1)
      expect(state.gitCommits[0].message).toBe('feat: commit test')
      expect(state.gitFiles).toHaveLength(1) // only unstaged file b.ts remains
      expect(state.gitFiles[0].path).toBe('b.ts')
    })
  })

  describe('UI Layout Panels', () => {
    it('should allow toggling panels', () => {
      const { toggleSidebar, toggleBottomPanel, toggleRightPanel } = useIDEStore.getState()

      toggleSidebar()
      expect(useIDEStore.getState().showSidebar).toBe(false)

      toggleBottomPanel()
      expect(useIDEStore.getState().showBottomPanel).toBe(false)

      toggleRightPanel()
      expect(useIDEStore.getState().showRightPanel).toBe(false)
    })

    it('should allow setting panel sizes', () => {
      const { setSidebarWidth, setBottomPanelHeight, setRightPanelWidth } = useIDEStore.getState()

      setSidebarWidth(300)
      expect(useIDEStore.getState().sidebarWidth).toBe(300)

      setBottomPanelHeight(200)
      expect(useIDEStore.getState().bottomPanelHeight).toBe(200)

      setRightPanelWidth(450)
      expect(useIDEStore.getState().rightPanelWidth).toBe(450)
    })
  })

  describe('Terminal Actions', () => {
    it('should append terminal lines and clears the terminal', () => {
      const { addTerminalLine, clearTerminal } = useIDEStore.getState()

      addTerminalLine('hello')
      addTerminalLine('world')

      expect(useIDEStore.getState().terminalHistory).toEqual(['hello', 'world'])

      clearTerminal()
      expect(useIDEStore.getState().terminalHistory).toEqual([])
    })
  })
})
