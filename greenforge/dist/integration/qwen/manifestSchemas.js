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
// Schema para frontmatter do SKILL.md
export const SkillManifestFrontmatterSchema = z.object({
    name: z.literal('greenforge'),
    description: z.string().min(10),
    'argument-hint': z.string()
});
// Schema para SKILL.md completo
export const SkillManifestSchema = z.object({
    frontmatter: SkillManifestFrontmatterSchema,
    content: z.string().min(50)
});
// Schema para hooks do settings.json
export const HookConfigSchema = z.object({
    type: z.enum(['command', 'http']),
    command: z.string().optional(),
    url: z.string().url().optional(),
    timeout: z.number().positive(),
    matcher: z.string().optional()
});
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
// Funções utilitárias de validação
export function validateManifest(json) {
    const result = QwenExtensionManifestSchema.safeParse(json);
    if (!result.success) {
        return { valid: false, error: result.error.message };
    }
    return { valid: true, data: result.data };
}
export function validateSkillManifest(frontmatter, content) {
    const result = SkillManifestSchema.safeParse({ frontmatter, content });
    if (!result.success) {
        return { valid: false, error: result.error.message };
    }
    return { valid: true };
}
export function validateSettings(json) {
    const result = QwenSettingsSchema.safeParse(json);
    if (!result.success) {
        return { valid: false, error: result.error.message };
    }
    return { valid: true, data: result.data };
}
//# sourceMappingURL=manifestSchemas.js.map