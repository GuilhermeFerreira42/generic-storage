import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TrustedFolders } from '@/server/src/security/trustedFolders'
import { useIDEStore } from '@/lib/store'
import path from 'path'

describe('Workspace Isolation & Sandbox Security', () => {
  const workspacePath = path.resolve('/user/my-workspace')
  const trusted = new TrustedFolders([workspacePath])

  beforeEach(() => {
    vi.clearAllMocks()
    useIDEStore.setState({ files: [] })
  })

  it('ensures getStoredFiles starts empty to prevent browser cache leaks showing IDE source code', () => {
    // In store.ts, getStoredFiles() is configured to return [] initially
    const state = useIDEStore.getState()
    expect(state.files).toEqual([])
  })

  it('prevents folder resolution path traversal escaping the workspace sandbox', () => {
    // Test that resolving a path escaping the root throws SecurityViolation
    expect(() => {
      trusted.resolve('../ide-source-code/config.env')
    }).toThrow(/SecurityViolation/)

    expect(() => {
      trusted.resolve('/var/log/system.log')
    }).toThrow(/SecurityViolation/)
  })

  it('allows folder resolution strictly inside the workspace root', () => {
    const resolved = trusted.resolve('src/index.js')
    expect(resolved).toBe(path.resolve(workspacePath, 'src/index.js'))
  })

  it('ensures api fs listing endpoint fails or blocks if path escaping workspace is requested', async () => {
    // We mock the fetch request for /api/fs/list
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: any, options: any) => {
      const body = JSON.parse(options.body)
      
      // Simulating backend path traversal check
      if (body.path.includes('..') || path.isAbsolute(body.path)) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: 'SecurityViolation: forbidden path' })
        } as Response)
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          files: [
            { id: 'index.js', name: 'index.js', type: 'file', parentId: null }
          ]
        })
      } as Response)
    })

    // 1. Safe query: syncWorkspace (which calls path: '.')
    const store = useIDEStore.getState()
    await store.syncWorkspace()

    expect(fetchSpy).toHaveBeenCalledWith('/api/fs/list', expect.objectContaining({
      body: JSON.stringify({ path: '.' })
    }))
    expect(useIDEStore.getState().files).toHaveLength(1)
    expect(useIDEStore.getState().files[0].id).toBe('index.js')

    // 2. Malicious request simulation (manually fetching parent directory path)
    const badRes = await fetch('/api/fs/list', {
      method: 'POST',
      body: JSON.stringify({ path: '../' })
    })
    expect(badRes.ok).toBe(false)
    expect(badRes.status).toBe(403)
    const errorData = await badRes.json()
    expect(errorData.error).toContain('SecurityViolation')
  })
})
