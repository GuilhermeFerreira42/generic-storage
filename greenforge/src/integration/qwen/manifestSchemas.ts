/**
 * Schemas de validação para integração com Qwen CLI
 * Fase 12 — Qwen Integration Base
 */

import { z } from 'zod';

// Schema para qwen-extension.json
export const QwenExtensionManifestSchema = z.object({
  name: z.literal('greenforge'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(10),
  mcpServers: z.record(z.string(), z.object({
    command: z.string(),
    args: z.array(z.string()),
    cwd: z.string().optional()
  })),
  skills: z.string(),
  contextFileName: z.string().optional(),
  hooks: z.string().optional()
});

export type QwenExtensionManifest = z.infer<typeof QwenExtensionManifestSchema>;

// Schema para frontmatter do SKILL.md
export const SkillManifestFrontmatterSchema = z.object({
  name: z.literal('greenforge'),
  description: z.string().min(10),
  'argument-hint': z.string()
});

export type SkillManifestFrontmatter = z.infer<typeof SkillManifestFrontmatterSchema>;

// Schema para SKILL.md completo
export const SkillManifestSchema = z.object({
  frontmatter: SkillManifestFrontmatterSchema,
  content: z.string().min(50)
});

export type SkillManifest = z.infer<typeof SkillManifestSchema>;

// Schema para hooks do settings.json
export const HookConfigSchema = z.object({
  type: z.enum(['command', 'http']),
  command: z.string().optional(),
  url: z.string().url().optional(),
  timeout: z.number().positive(),
  matcher: z.string().optional()
});

export type HookConfig = z.infer<typeof HookConfigSchema>;

// Schema para .qwen/settings.json completo
export const QwenSettingsSchema = z.object({
  hooks: z.object({
    SessionStart: z.array(HookConfigSchema).optional(),
    SessionEnd: z.array(HookConfigSchema).optional(),
    UserPromptSubmit: z.array(HookConfigSchema).optional(),
    PreToolUse: z.array(HookConfigSchema.extend({
      matcher: z.string()
    })).optional(),
    PostToolUse: z.array(HookConfigSchema).optional(),
    SubagentStart: z.array(HookConfigSchema).optional(),
    SubagentStop: z.array(HookConfigSchema).optional()
  })
});

export type QwenSettings = z.infer<typeof QwenSettingsSchema>;

// Funções utilitárias de validação
export function validateManifest(json: unknown): { valid: boolean; error?: string; data?: QwenExtensionManifest } {
  const result = QwenExtensionManifestSchema.safeParse(json);
  if (!result.success) {
    return { valid: false, error: result.error.message };
  }
  return { valid: true, data: result.data };
}

export function validateSkillManifest(frontmatter: unknown, content: string): { valid: boolean; error?: string } {
  const result = SkillManifestSchema.safeParse({ frontmatter, content });
  if (!result.success) {
    return { valid: false, error: result.error.message };
  }
  return { valid: true };
}

export function validateSettings(json: unknown): { valid: boolean; error?: string; data?: QwenSettings } {
  const result = QwenSettingsSchema.safeParse(json);
  if (!result.success) {
    return { valid: false, error: result.error.message };
  }
  return { valid: true, data: result.data };
}
