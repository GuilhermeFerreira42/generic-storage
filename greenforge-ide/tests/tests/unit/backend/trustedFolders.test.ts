import { describe, it, expect } from 'vitest'
import path from 'path'
import { TrustedFolders } from '@/server/src/security/trustedFolders'

describe('TrustedFolders', () => {
  const workspaceRoot = path.resolve('/workspace/project')
  const trusted = new TrustedFolders([workspaceRoot])

  it('allows files directly inside the workspace root', () => {
    const resolved = trusted.resolve('src/index.ts')
    expect(resolved).toBe(path.resolve(workspaceRoot, 'src/index.ts'))
  })

  it('allows the workspace root directory itself', () => {
    const resolved = trusted.resolve('.')
    expect(resolved).toBe(workspaceRoot)
  })

  it('blocks path traversal attempts trying to escape the workspace root using relative parent directory paths', () => {
    expect(() => {
      trusted.resolve('../outside.txt')
    }).toThrow(/SecurityViolation/)

    expect(() => {
      trusted.resolve('../../etc/passwd')
    }).toThrow(/SecurityViolation/)

    expect(() => {
      trusted.resolve('src/../../etc/passwd')
    }).toThrow(/SecurityViolation/)
  })

  it('blocks absolute paths outside the workspace', () => {
    expect(() => {
      // Trying to query root/system paths
      const target = process.platform === 'win32' ? 'C:\\Windows\\System32\\cmd.exe' : '/etc/passwd'
      trusted.resolve(target)
    }).toThrow(/SecurityViolation/)
  })

  it('allows dynamic addition of new trusted directories', () => {
    const secondaryPath = path.resolve('/workspace/shared-library')
    
    // Resolving inside secondary path should fail initially
    expect(() => {
      trusted.resolve('../shared-library/utils.ts')
    }).toThrow(/SecurityViolation/)

    // Add path to allowed list
    trusted.addPath(secondaryPath)

    // Now resolve using standard normalized path resolver (note: trustedFolders resolves relative to allowedPaths[0])
    // But let's check path inclusion:
    // trustedFolders.resolve calculates path relative to the first allowedPath, which is '/workspace/project'
    // const normalized = path.resolve('/workspace/project', '../shared-library/utils.ts') -> '/workspace/shared-library/utils.ts'
    // Since '/workspace/shared-library' is now allowed, it should succeed!
    const resolved = trusted.resolve('../shared-library/utils.ts')
    expect(resolved).toBe(path.resolve(secondaryPath, 'utils.ts'))
  })
})
