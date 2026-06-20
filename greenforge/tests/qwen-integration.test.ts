import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  REQUIRED_SETTINGS_HOOKS,
  REQUIRED_SKILL_COMMANDS,
  collectManifestLocalPaths,
  parseSkillFrontmatter,
  settingsProtectsSensitiveTools,
  skillListsRequiredCommands,
  validateQwenExtensionManifest,
  validateQwenSettings,
  validateSkillManifest,
} from '../src/integration/qwen/manifestSchemas.js'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const skillPath = '.qwen/skills/greenforge/SKILL.md'
const skillsRoot = '.qwen/skills'
const malformedMarkdownChars = /[\[\]()]/

function absolutePath(relativePath: string): string {
  return join(projectRoot, relativePath)
}

function readText(relativePath: string): string {
  return readFileSync(absolutePath(relativePath), 'utf8')
}

function readJson(relativePath: string): unknown {
  return JSON.parse(readText(relativePath))
}

function collectHookUrls(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) => collectHookUrls(item))
  }

  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>
    const ownUrl = typeof record.url === 'string' ? [record.url] : []
    return ownUrl.concat(Object.values(record).flatMap((value) => collectHookUrls(value)))
  }

  return []
}

describe('Fase 12 — Qwen Integration Base (static/contracts)', () => {
  it('qwen-extension.json existe na raiz e é JSON válido', () => {
    expect(existsSync(absolutePath('qwen-extension.json'))).toBe(true)
    expect(() => readJson('qwen-extension.json')).not.toThrow()
  })

  it('manifesto tem name = greenforge e respeita o schema estático', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))

    expect(manifest.name).toBe('greenforge')
    expect(manifest.version).toBeTypeOf('string')
    expect(manifest.description).toContain('GreenForge')
  })

  it('manifesto declara pelo menos um mcpServer sem shell e sem exec', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))

    expect(Object.keys(manifest.mcpServers)).toContain('greenforge')
    expect(manifest.mcpServers.greenforge.command).toBe('node')
    expect(manifest.mcpServers.greenforge.args.length).toBeGreaterThan(0)
    expect(manifest.mcpServers.greenforge.shell).toBeUndefined()
    expect(manifest.mcpServers.greenforge.command).not.toMatch(/exec/i)
  })

  it('manifesto aponta para a pasta de skills GreenForge', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))

    expect(manifest.skills).toBe(skillsRoot)
    expect(existsSync(absolutePath(manifest.skills))).toBe(true)
    expect(existsSync(absolutePath(skillPath))).toBe(true)
  })

  it('manifesto aponta para settings.json existente quando hooks é declarado', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))

    expect(manifest.hooks).toBe('.qwen/settings.json')
    expect(existsSync(absolutePath(manifest.hooks!))).toBe(true)
  })

  it('SKILL.md existe no caminho esperado', () => {
    expect(existsSync(absolutePath(skillPath))).toBe(true)
  })

  it('não há arquivo de skill com nome malformado por markdown/link', () => {
    const fileNames = readdirSync(absolutePath('.qwen/skills/greenforge'))

    expect(fileNames).toContain('SKILL.md')
    for (const fileName of fileNames) {
      expect(fileName).not.toMatch(malformedMarkdownChars)
      expect(fileName).not.toMatch(/http/i)
    }
  })

  it('SKILL.md tem frontmatter válido com name greenforge', () => {
    const skill = validateSkillManifest(readText(skillPath))

    expect(skill.frontmatter.name).toBe('greenforge')
    expect(skill.frontmatter.description.length).toBeGreaterThan(0)
    expect(skill.frontmatter['argument-hint']).toBe('<command> [args]')
  })

  it('parser de frontmatter rejeita SKILL.md sem delimitadores', () => {
    expect(() => parseSkillFrontmatter('# greenforge')).toThrow()
  })

  it('SKILL.md lista comandos start/status/list/approve/abort', () => {
    const skill = validateSkillManifest(readText(skillPath))

    expect(skillListsRequiredCommands(skill.body)).toBe(true)
    for (const command of REQUIRED_SKILL_COMMANDS) {
      expect(skill.body).toMatch(new RegExp(`\\b${command}\\b`))
    }
  })

  it('.qwen/settings.json existe e é JSON válido', () => {
    expect(existsSync(absolutePath('.qwen/settings.json'))).toBe(true)
    expect(() => readJson('.qwen/settings.json')).not.toThrow()
  })

  it('settings contém hooks SessionStart e SessionEnd', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))

    expect(Object.keys(settings.hooks)).toEqual(expect.arrayContaining(['SessionStart', 'SessionEnd']))
  })

  it('settings contém UserPromptSubmit', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))

    expect(settings.hooks.UserPromptSubmit.length).toBeGreaterThan(0)
  })

  it('settings contém PreToolUse protegendo Write/Edit/Bash', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))

    expect(settings.hooks.PreToolUse.length).toBeGreaterThan(0)
    expect(settingsProtectsSensitiveTools(settings, ['Write', 'Edit', 'Bash'])).toBe(true)
  })

  it('settings contém PostToolUse', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))

    expect(settings.hooks.PostToolUse.length).toBeGreaterThan(0)
  })

  it('settings contém todos os hooks obrigatórios da Fase 12', () => {
    const settings = validateQwenSettings(readJson('.qwen/settings.json'))

    expect(Object.keys(settings.hooks)).toEqual(expect.arrayContaining([...REQUIRED_SETTINGS_HOOKS]))
  })

  it('URLs de settings são URLs reais de localhost, não markdown links', () => {
    const settingsJson = readJson('.qwen/settings.json')
    const urls = collectHookUrls(settingsJson)

    expect(urls).toEqual(
      expect.arrayContaining([
        'http://localhost:7777/prompt-submit',
        'http://localhost:7777/pre-tool',
        'http://localhost:7777/post-tool',
        'http://localhost:7777/subagent-start',
        'http://localhost:7777/subagent-stop',
      ])
    )

    for (const url of urls) {
      expect(url).toMatch(/^http:\/\/localhost:7777\//)
      expect(url).not.toMatch(malformedMarkdownChars)
    }
  })

  it('nenhuma referência local do manifesto aponta para caminho inexistente óbvio', () => {
    const manifest = validateQwenExtensionManifest(readJson('qwen-extension.json'))

    for (const relativePath of collectManifestLocalPaths(manifest)) {
      expect(existsSync(absolutePath(relativePath))).toBe(true)
      expect(relativePath).not.toMatch(malformedMarkdownChars)
      expect(relativePath).not.toMatch(/https?:\/\//i)
    }
  })

  it('schemas rejeitam manifesto inválido', () => {
    expect(() =>
      validateQwenExtensionManifest({
        name: 'not-greenforge',
        version: '1.0.0',
        description: 'Invalid manifest',
        mcpServers: {},
        skills: '',
      })
    ).toThrow()
  })

  it('schema rejeita caminho de skill em formato markdown', () => {
    const openBracket = String.fromCharCode(91)
    const closeBracket = String.fromCharCode(93)
    const openParen = String.fromCharCode(40)
    const closeParen = String.fromCharCode(41)
    const markdownSkillPath = `.qwen/skills/greenforge/${openBracket}SKILL.md${closeBracket}${openParen}${'http'}://${'SKILL.md'}${closeParen}`

    expect(() =>
      validateQwenExtensionManifest({
        name: 'greenforge',
        version: '1.0.0',
        description: 'Invalid markdown path',
        mcpServers: { greenforge: { command: 'node', args: ['dist/index.js'] } },
        skills: markdownSkillPath,
      })
    ).toThrow()
  })

  it('schema rejeita settings sem PreToolUse', () => {
    expect(() =>
      validateQwenSettings({
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'greenforge-init' }] }],
          SessionEnd: [{ hooks: [{ type: 'command', command: 'greenforge-cleanup' }] }],
          UserPromptSubmit: [{ hooks: [{ type: 'http', url: 'http://localhost:7777/prompt-submit' }] }],
          PostToolUse: [{ hooks: [{ type: 'http', url: 'http://localhost:7777/post-tool' }] }],
        },
      })
    ).toThrow()
  })

  it('schema rejeita URLs de settings em formato markdown', () => {
    const openBracket = String.fromCharCode(91)
    const closeBracket = String.fromCharCode(93)
    const openParen = String.fromCharCode(40)
    const closeParen = String.fromCharCode(41)
    const hookUrl = 'http://localhost:7777/prompt-submit'
    const markdownHookUrl = `${openBracket}${hookUrl}${closeBracket}${openParen}${hookUrl}${closeParen}`

    expect(() =>
      validateQwenSettings({
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'greenforge-init' }] }],
          SessionEnd: [{ hooks: [{ type: 'command', command: 'greenforge-cleanup' }] }],
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'http',
                  url: markdownHookUrl,
                },
              ],
            },
          ],
          PreToolUse: [
            {
              matcher: 'Write|Edit|Bash',
              hooks: [{ type: 'http', url: 'http://localhost:7777/pre-tool' }],
            },
          ],
          PostToolUse: [{ hooks: [{ type: 'http', url: 'http://localhost:7777/post-tool' }] }],
        },
      })
    ).toThrow()
  })

  it('artefatos de integração são estáticos e não declaram chamadas reais proibidas', () => {
    const testedFiles = ['src/integration/qwen/manifestSchemas.ts', 'qwen-extension.json', '.qwen/settings.json']
    const forbiddenRuntimeCalls = [/child_process\.exec/, /shell\s*:\s*true/, /qwen\s+/, /fetch\(/, /axios\./]

    for (const file of testedFiles) {
      const content = readText(file)
      for (const forbidden of forbiddenRuntimeCalls) {
        expect(content).not.toMatch(forbidden)
      }
    }
  })

  it('caminhos de arquivo e URLs nos artefatos da Fase 12 nao contem colchetes, parenteses ou padroes markdown', () => {
    const manifest = readJson('qwen-extension.json') as any
    const settings = readJson('.qwen/settings.json') as any

    const forbiddenPatterns = [
      '[' + 'SKILL.md' + ']',
      '[' + 'http://',
      ']' + '(http',
      '(' + 'http://',
      '[',
      ']',
      '(',
      ')',
    ]

    // Validando caminhos do manifesto
    const paths = [manifest.skills, manifest.contextFileName, manifest.hooks].filter(
      (p): p is string => typeof p === 'string'
    )
    for (const p of paths) {
      for (const pattern of forbiddenPatterns) {
        expect(p).not.toContain(pattern)
      }
    }

    // Validando URLs em settings.json
    const urls = collectHookUrls(settings)
    for (const url of urls) {
      for (const pattern of forbiddenPatterns) {
        expect(url).not.toContain(pattern)
      }
    }
  })
})

