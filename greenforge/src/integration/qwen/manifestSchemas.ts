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

// Extremely strict protection against markdown links and raw brackets/parentheses
const LocalPathSchema = z.string().min(1)
  .refine((v) => !/\[[^\]]*\]\([^)]*\)/.test(v), 'no markdown links [text](url)')
  .refine((v) => !/[[()]]/.test(v), 'no raw brackets or parentheses');

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
  .passthrough();

const HookBindingSchema = z
  .object({
    matcher: z.string().min(1).optional(),
    hooks: z.array(HookActionSchema).min(1),
  })
  .passthrough();

export const QwenSettingsSchema = z
  .object({
    hooks: z.record(z.string().min(1), z.array(HookBindingSchema).min(1)),
  })
  .passthrough()
  .superRefine((settings, ctx) => {
    for (const hookName of REQUIRED_SETTINGS_HOOKS) {
      if (!settings.hooks[hookName]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hooks', hookName], message: `${hookName} hook is required` });
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
  .passthrough();

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
  .passthrough();

export type QwenExtensionManifest = z.infer<typeof QwenExtensionManifestSchema>;

// === Fully typed legacy compatibility helpers ===

export function validateQwenSettings(input: unknown): QwenSettings {
  return QwenSettingsSchema.parse(input);
}

export function validateQwenExtensionManifest(input: unknown): QwenExtensionManifest {
  return QwenExtensionManifestSchema.parse(input);
}

interface HookBinding { matcher?: string; }

export function settingsProtectsSensitiveTools(
  settings: { hooks: Record<string, HookBinding[]> },
  tools: string[]
): boolean {
  const preTool = settings?.hooks?.PreToolUse;
  if (!preTool || !Array.isArray(preTool)) return false;
  const matcherText = preTool.map((b: HookBinding) => b?.matcher || '').join('|').toLowerCase();
  return tools.every((tool) => matcherText.includes(tool.toLowerCase()));
}

export function skillListsRequiredCommands(body: string): boolean {
  const required = ['start', 'status', 'list', 'approve', 'abort'];
  return required.every((cmd) => new RegExp(`\\b${cmd}\\b`, 'i').test(body || ''));
}

export function collectManifestLocalPaths(manifest: Record<string, unknown>): string[] {
  const result: string[] = [];
  if (typeof manifest.skills === 'string') result.push(manifest.skills);
  if (typeof manifest.contextFileName === 'string') result.push(manifest.contextFileName);
  if (typeof manifest.hooks === 'string') result.push(manifest.hooks);
  return result;
}

export interface SkillManifest {
  frontmatter: { name: string; description?: string; 'argument-hint'?: string };
  body: string;
}

export function validateSkillManifest(markdown: string): SkillManifest {
  const frontmatter: SkillManifest['frontmatter'] = {
    name: 'greenforge',
    description: 'GreenForge: The Orchestrator\'s Anvil - Advanced orchestration extension for Qwen CLI',
    'argument-hint': '<command> [args]',
  };
  const match = markdown.match(/^---\s*([\s\S]*?)\s*---/);
  if (match) {
    const yaml = match[1];
    const n = yaml.match(/name:\s*['"]?([^'"\n]+)['"]?/)?.[1]?.trim();
    const d = yaml.match(/description:\s*['"]?([^'"\n]+)['"]?/)?.[1]?.trim();
    const h = yaml.match(/argument-hint:\s*['"]?([^'"\n]+)['"]?/)?.[1]?.trim();
    if (n) frontmatter.name = n;
    if (d) frontmatter.description = d;
    if (h) frontmatter['argument-hint'] = h;
  }
  return { frontmatter, body: markdown };
}

export const REQUIRED_SKILL_COMMANDS = ['start', 'status', 'list', 'approve', 'abort'] as const;
