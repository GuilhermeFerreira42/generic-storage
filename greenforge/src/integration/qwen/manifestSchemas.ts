import { z } from 'zod'

/**
 * Static schemas for validating qwen-extension.json and related skill/settings contracts.
 * Fase 12 keeps this layer deterministic: no Qwen CLI process, no MCP server,
 * no network calls and no shell execution are required to validate these files.
 */

export const REQUIRED_SETTINGS_HOOKS = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
] as const

export const REQUIRED_SKILL_COMMANDS = ['start', 'status', 'list', 'approve', 'abort'] as const

const MarkdownArtifactPattern = /[[\]()]|https?:\/\//i

const LocalPathSchema = z
  .string()
  .min(1)
  .refine((value) => !value.includes('..'), 'relative paths must not traverse outside the extension')
  .refine((value) => !value.startsWith('/'), 'relative paths must not be absolute')
  .refine((value) => !MarkdownArtifactPattern.test(value), 'relative paths must be plain paths, not markdown links or URLs')

const LocalhostHookUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('http://localhost:7777/'), 'hook URLs must target http://localhost:7777/')
  .refine((value) => !/[[\]()]/.test(value), 'hook URLs must be plain URLs, not markdown links')

export const McpServerSchema = z
  .object({
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    cwd: z.string().min(1).optional(),
    shell: z.never().optional(),
  })
  .strict()
  .superRefine((server, ctx) => {
    if (/exec/i.test(server.command)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['command'],
        message: 'MCP server command must not use exec',
      })
    }
  })

export const QwenExtensionManifestSchema = z
  .object({
    name: z.literal('greenforge'),
    version: z.string().min(1),
    description: z.string().min(1),
    mcpServers: z.record(z.string().min(1), McpServerSchema).refine(
      (servers) => Object.keys(servers).length > 0,
      'at least one mcpServer must be declared'
    ),
    skills: LocalPathSchema,
    contextFileName: LocalPathSchema.optional(),
    hooks: LocalPathSchema.optional(),
  })
  .strict()

export type McpServer = z.infer<typeof McpServerSchema>
export type QwenExtensionManifest = z.infer<typeof QwenExtensionManifestSchema>

export function validateQwenExtensionManifest(input: unknown): QwenExtensionManifest {
  return QwenExtensionManifestSchema.parse(input)
}

export const SkillFrontmatterSchema = z
  .object({
    name: z.literal('greenforge'),
    description: z.string().min(1),
    'argument-hint': z.string().min(1),
  })
  .passthrough()

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>

export interface SkillManifest {
  frontmatter: SkillFrontmatter
  body: string
}

function stripYamlQuotes(value: string): string {
  const trimmed = value.trim()
  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

export function parseSkillFrontmatter(markdown: string): SkillManifest {
  const normalized = markdown.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')

  if (lines[0]?.trim() !== '---') {
    throw new Error('SKILL.md must start with YAML frontmatter delimiter')
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (endIndex <= 0) {
    throw new Error('SKILL.md must close YAML frontmatter delimiter')
  }

  const frontmatterEntries: Record<string, string> = {}
  for (const line of lines.slice(1, endIndex)) {
    if (line.trim().length === 0) {
      continue
    }

    const match = /^(?<key>[A-Za-z0-9_-]+):\s*(?<value>.*)$/.exec(line)
    if (!match?.groups) {
      throw new Error(`Invalid SKILL.md frontmatter line: ${line}`)
    }

    frontmatterEntries[match.groups.key] = stripYamlQuotes(match.groups.value)
  }

  return {
    frontmatter: SkillFrontmatterSchema.parse(frontmatterEntries),
    body: lines.slice(endIndex + 1).join('\n').trim(),
  }
}

export function validateSkillManifest(markdown: string): SkillManifest {
  const skill = parseSkillFrontmatter(markdown)
  if (!skillListsRequiredCommands(skill.body)) {
    throw new Error(`SKILL.md must list commands: ${REQUIRED_SKILL_COMMANDS.join(', ')}`)
  }

  return skill
}

export function skillListsRequiredCommands(markdownBody: string): boolean {
  return REQUIRED_SKILL_COMMANDS.every((command) => new RegExp(`\\b${command}\\b`).test(markdownBody))
}

const HookActionSchema = z
  .object({
    type: z.enum(['command', 'http']),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    url: LocalhostHookUrlSchema.optional(),
    timeout: z.number().int().positive().max(60_000).optional(),
    shell: z.never().optional(),
  })
  .strict()
  .superRefine((action, ctx) => {
    if (action.type === 'command' && !action.command) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['command'],
        message: 'command hooks must declare command',
      })
    }

    if (action.type === 'http' && !action.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'http hooks must declare url',
      })
    }

    if (action.command && /child_process\.exec|\bexec\b/i.test(action.command)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['command'],
        message: 'hooks must not use exec',
      })
    }
  })

const HookBindingSchema = z
  .object({
    matcher: z.string().min(1).optional(),
    hooks: z.array(HookActionSchema).min(1),
  })
  .strict()

export const QwenSettingsSchema = z
  .object({
    hooks: z.record(z.string().min(1), z.array(HookBindingSchema).min(1)),
  })
  .strict()
  .superRefine((settings, ctx) => {
    for (const hookName of REQUIRED_SETTINGS_HOOKS) {
      if (!settings.hooks[hookName]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['hooks', hookName],
          message: `${hookName} hook is required`,
        })
      }
    }

    if (!settingsProtectsSensitiveTools(settings, ['Write', 'Edit', 'Bash'])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hooks', 'PreToolUse'],
        message: 'PreToolUse must protect Write, Edit and Bash operations',
      })
    }
  })

export type QwenSettings = z.infer<typeof QwenSettingsSchema>
export type QwenHookBinding = QwenSettings['hooks'][string][number]
export type QwenHookAction = QwenHookBinding['hooks'][number]

export function validateQwenSettings(input: unknown): QwenSettings {
  return QwenSettingsSchema.parse(input)
}

export function settingsProtectsSensitiveTools(settings: { hooks: Record<string, QwenHookBinding[]> }, tools: string[]): boolean {
  const matchers = settings.hooks.PreToolUse?.flatMap((binding) => binding.matcher ?? []) ?? []
  const matcherText = matchers.join('|')

  return tools.every((tool) => new RegExp(`(^|\\W)${tool}(\\W|$)`, 'i').test(matcherText))
}

export function collectManifestLocalPaths(manifest: QwenExtensionManifest): string[] {
  return [manifest.skills, manifest.hooks, manifest.contextFileName].filter((value): value is string => Boolean(value))
}
