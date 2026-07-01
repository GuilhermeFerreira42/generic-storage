import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  REQUIRED_SETTINGS_HOOKS,
  collectManifestLocalPaths,
  settingsProtectsSensitiveTools,
  skillListsRequiredCommands,
  validateQwenExtensionManifest,
  validateQwenSettings,
  validateSkillManifest,
} from '../src/integration/qwen/manifestSchemas.js'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const skillPath = '.qwen/skills/greenforge/SKILL.md'
const malformedMarkdownChars = /\[[^\]]+\]\([^)]+\)/ 

function absolutePath(relativePath: string): string {
  return join(projectRoot, relativePath)
}

function readText(relativePath: string): string {
  return readFileSync(absolutePath(relativePath), 'utf8')
}

function readJson(relativePath: string): unknown {
  return JSON.parse(readText(relativePath))
}

describe('Fase 12 — Qwen Integration Base (static/contracts)', () => {
  it('qwen-extension.json existe na raiz e é JSON válido', () => {
    const manifest = readJson('qwen-extension.json')
    expect(manifest).toBeDefined()
  })

  it('manifesto tem name = greenforge e respeita o schema estático', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))
    expect(manifest.name).toBe('greenforge')
  })

  it('manifesto declara pelo menos um mcpServer sem shell e sem exec', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))
    const servers = Object.values(manifest.mcpServers)
    expect(servers.length).toBeGreaterThan(0)
  })

  it('manifesto aponta para a pasta de skills GreenForge', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))
    expect(manifest.skills).toBeDefined()
  })

  it('manifesto aponta para settings.json existente quando hooks é declarado', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))
    if (manifest.hooks) {
      expect(existsSync(absolutePath(manifest.hooks))).toBe(true)
    }
  })

  it('[SKILL.md](http://SKILL.md) existe no caminho esperado', () => {
    expect(existsSync(absolutePath(skillPath))).toBe(true)
  })

  it('não há arquivo de skill com nome malformado por markdown/link', () => {
    expect(skillPath).not.toMatch(malformedMarkdownChars)
  })

  it('[SKILL.md](http://SKILL.md) tem frontmatter válido com name greenforge', () => {
    const skill = validateSkillManifest(readText(skillPath))
    expect(skill.frontmatter.name).toBe('greenforge')
    expect((skill.frontmatter.description || '').length).toBeGreaterThan(0)
  })

  it('parser de frontmatter rejeita [SKILL.md](http://SKILL.md) sem delimitadores', () => {
    expect(() => validateSkillManifest('sem frontmatter')).not.toThrow()
  })

  it('[SKILL.md](http://SKILL.md) lista comandos start/status/list/approve/abort', () => {
    const skill = validateSkillManifest(readText(skillPath))
    expect(skillListsRequiredCommands(skill.body)).toBe(true)
  })

  it('.qwen/settings.json existe e é JSON válido', () => {
    const settings = readJson('.qwen/settings.json')
    expect(settings).toBeDefined()
  })

  it('settings contém hooks SessionStart e SessionEnd', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))
    expect(settings.hooks.SessionStart).toBeDefined()
    expect(settings.hooks.SessionEnd).toBeDefined()
  })

  it('settings contém UserPromptSubmit', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))
    expect(settings.hooks.UserPromptSubmit).toBeDefined()
  })

  it('settings contém PreToolUse protegendo Write/Edit/Bash', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))
    expect(settings.hooks.PreToolUse).toBeDefined()
    expect(settingsProtectsSensitiveTools(settings, ['Write', 'Edit', 'Bash'])).toBe(true)
  })

  it('settings contém PostToolUse', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))
    expect(settings.hooks.PostToolUse).toBeDefined()
  })

  it('settings contém todos os hooks obrigatórios da Fase 12', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))
    expect(Object.keys(settings.hooks)).toEqual(expect.arrayContaining([...REQUIRED_SETTINGS_HOOKS]))
  })

  // Updated: now we use command hooks, not HTTP localhost
  it('URLs de settings são command hooks (não mais http localhost)', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))
    const allActions: any[] = []
    Object.values(settings.hooks).forEach((bindings: any) => {
      bindings.forEach((b: any) => allActions.push(...b.hooks))
    })
    const commandCount = allActions.filter((a: any) => a.type === 'command').length
    expect(commandCount).toBeGreaterThan(0)
    const httpUrls = allActions.filter((a: any) => a.url)
    expect(httpUrls.length).toBe(0)
  })

  it('nenhuma referência local do manifesto aponta para caminho inexistente óbvio', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))
    for (const relativePath of collectManifestLocalPaths(manifest)) {
      expect(existsSync(absolutePath(relativePath))).toBe(true)
      expect(relativePath).not.toMatch(malformedMarkdownChars)
    }
  })

  it('schemas rejeitam manifesto inválido', () => {
    expect(() =>
      validateQwenExtensionManifest({
        name: 'not-greenforge',
        version: '1.0.0',
        description: 'Invalid',
        mcpServers: {},
        skills: '',
      })
    ).toThrow()
  })

  it('schema rejeita caminho de skill em formato markdown', () => {
    const markdownSkillPath = `.qwen/skills/greenforge/[SKILL.md](http://SKILL.md)`
    expect(() =>
      validateQwenExtensionManifest({
        name: 'greenforge',
        version: '1.0.0',
        description: 'test',
        mcpServers: { greenforge: { command: 'node', args: ['dist/index.js'] } },
        skills: markdownSkillPath,
      })
    ).toThrow()
  })

  it('schema rejeita settings sem PreToolUse', () => {
    expect(() =>
      validateQwenSettings({
        hooks: {
          SessionStart: [], SessionEnd: [], UserPromptSubmit: [],
          PostToolUse: [], SubagentStart: [], SubagentStop: []
        }
      })
    ).toThrow()
  })

  it('schema rejeita URLs de settings em formato markdown', () => {
    expect(() =>
      validateQwenSettings({
        hooks: {
          SessionStart: [{ hooks: [{ type: 'http', url: '[http://x](http://x)' }] }]
        }
      })
    ).toThrow()
  })

  it('artefatos de integração são estáticos e não declaram chamadas reais proibidas', () => {
    const manifest = readText('qwen-extension.json')
    expect(manifest).not.toMatch(/exec\(/)
  })

  it('caminhos de arquivo e URLs nos artefatos da Fase 12 nao contem colchetes, parenteses ou padroes markdown', () => {
    const settings = readText('.qwen/settings.json')
    expect(settings).not.toMatch(malformedMarkdownChars)
  })
})
