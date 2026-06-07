import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useIDEStore } from '@/lib/store'

// Local component representation of GitPanel for testing store integration in UI
function GitPanel() {
  const currentBranch = useIDEStore(s => s.currentBranch)
  const setBranch = useIDEStore(s => s.setBranch)
  const gitFiles = useIDEStore(s => s.gitFiles)
  const stageFile = useIDEStore(s => s.stageFile)
  const unstageFile = useIDEStore(s => s.unstageFile)
  const stageAll = useIDEStore(s => s.stageAll)
  const unstageAll = useIDEStore(s => s.unstageAll)
  const commit = useIDEStore(s => s.commit)
  const gitCommits = useIDEStore(s => s.gitCommits)

  const [commitMsg, setCommitMsg] = React.useState('')

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commitMsg.trim()) return
    commit(commitMsg)
    setCommitMsg('')
  }

  return (
    <div id="git-panel">
      <div id="git-branch-info">Branch: {currentBranch}</div>
      <select id="branch-select" value={currentBranch} onChange={(e) => setBranch(e.target.value)}>
        <option value="main">main</option>
        <option value="dev">dev</option>
      </select>

      <button id="btn-stage-all" onClick={stageAll}>Stage All</button>
      <button id="btn-unstage-all" onClick={unstageAll}>Unstage All</button>

      <div id="git-files-list">
        {gitFiles.map(file => (
          <div key={file.path} className="git-file-item">
            <span>{file.path} ({file.status})</span>
            <button
              className="btn-toggle-stage"
              onClick={() => file.staged ? unstageFile(file.path) : stageFile(file.path)}
            >
              {file.staged ? 'Unstage' : 'Stage'}
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleCommit}>
        <input
          id="commit-msg-input"
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          placeholder="Mensagem de commit"
        />
        <button id="btn-commit" type="submit">Commit</button>
      </form>

      <div id="git-commits-list">
        {gitCommits.map(c => (
          <div key={c.hash} className="commit-item">
            <span>{c.hash} - {c.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

describe('GitPanel UI & Store Integration', () => {
  beforeEach(() => {
    useIDEStore.setState({
      gitFiles: [
        { path: 'src/main.ts', status: 'modified', staged: false },
        { path: 'src/app.css', status: 'added', staged: false }
      ],
      gitCommits: [],
      currentBranch: 'main'
    })
  })

  it('renders current branch and handles branch switching', async () => {
    render(<GitPanel />)
    expect(screen.getByText('Branch: main')).toBeInTheDocument()

    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, 'dev')
    
    expect(useIDEStore.getState().currentBranch).toBe('dev')
    expect(screen.getByText('Branch: dev')).toBeInTheDocument()
  })

  it('renders modified and added files list', () => {
    render(<GitPanel />)
    expect(screen.getByText('src/main.ts (modified)')).toBeInTheDocument()
    expect(screen.getByText('src/app.css (added)')).toBeInTheDocument()
  })

  it('toggles file stage status when clicking Stage/Unstage button', async () => {
    render(<GitPanel />)
    const toggleButtons = screen.getAllByRole('button', { name: 'Stage' })
    
    // Stage the first file
    await userEvent.click(toggleButtons[0])
    expect(useIDEStore.getState().gitFiles[0].staged).toBe(true)

    // Verify button text changes to Unstage
    expect(screen.getByRole('button', { name: 'Unstage' })).toBeInTheDocument()
  })

  it('stages all and unstages all files when buttons are clicked', async () => {
    render(<GitPanel />)
    
    await userEvent.click(screen.getByRole('button', { name: 'Stage All' }))
    expect(useIDEStore.getState().gitFiles.every(f => f.staged)).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Unstage All' }))
    expect(useIDEStore.getState().gitFiles.every(f => !f.staged)).toBe(true)
  })

  it('triggers commit workflow on form submit', async () => {
    render(<GitPanel />)
    
    // Stage at least one file for commit to work
    useIDEStore.setState({
      gitFiles: [{ path: 'src/main.ts', status: 'modified', staged: true }]
    })

    const input = screen.getByPlaceholderText('Mensagem de commit')
    await userEvent.type(input, 'feat: add git integration')

    const commitBtn = screen.getByRole('button', { name: 'Commit' })
    await userEvent.click(commitBtn)

    const state = useIDEStore.getState()
    expect(state.gitCommits).toHaveLength(1)
    expect(state.gitCommits[0].message).toBe('feat: add git integration')
    expect(state.gitFiles).toHaveLength(0) // staged file is committed
  })
})
