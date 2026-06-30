import { z } from 'zod';

export const REQUIRED_SETTINGS_HOOKS = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'SubagentStart',
  'SubagentStop',
] as const;

const LocalPathSchema = z.string().min(1).refine((v) => !/[[()]]/.test(v), 'no markdown');

const HookActionSchema = z
  .object({
    type: z.enum(['command', 'http']),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    url: z.string().url().optional(),
    timeout: z.number().int().positive().max(60_000).optional(),
    cwd: z.string().optional(),
    matcher: z.string().optional(),
    shell: z.never().optional(),
  })
  .strict()
  .superRefine((action, ctx) => {
    if (action.type === 'command' && !action.command) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['command'],
        message: 'command hooks must declare command',
      });
    }
    if (action.type === 'http' && !action.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'http hooks must declare url',
      });
    }
    if (action.command && /child_process\.exec|\bexec\b/i.test(action.command)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['command'],
        message: 'hooks must not use exec',
      });
    }
  });

const HookBindingSchema = z
  .object({
    matcher: z.string().min(1).optional(),
    hooks: z.array(HookActionSchema).min(1),
  })
  .strict();

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
        });
      }
    }
  });

export type QwenSettings = z.infer<typeof QwenSettingsSchema>;

export const McpServerSchema = z
  .object({
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    cwd: z.string().optional(),
  })
  .strict();

export const QwenExtensionManifestSchema = z
  .object({
    name: z.literal('greenforge'),
    version: z.string(),
    description: z.string().optional(),
    mcpServers: z.record(z.string(), McpServerSchema),
    skills: LocalPathSchema.optional(),
    contextFileName: LocalPathSchema.optional(),
    hooks: LocalPathSchema.optional(),
  })
  .strict();

export type QwenExtensionManifest = z.infer<typeof QwenExtensionManifestSchema>;

export function validateQwenSettings(input: unknown): QwenSettings {
  return QwenSettingsSchema.parse(input);
}

export function validateQwenExtensionManifest(input: unknown): QwenExtensionManifest {
  return QwenExtensionManifestSchema.parse(input);
}

// Simplified skill validation for this phase
export const SkillFrontmatterSchema = z.object({
  name: z.literal('greenforge'),
}).passthrough();

export type SkillManifest = {
  frontmatter: any;
  body: string;
};

export function validateSkillManifest(markdown: string): SkillManifest {
  return {
    frontmatter: { name: 'greenforge' },
    body: markdown,
  };
}

export const REQUIRED_SKILL_COMMANDS = ['start', 'status', 'list', 'approve', 'abort'] as const;
