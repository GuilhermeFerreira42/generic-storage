import { z } from 'zod';
/**
 * Static schemas for validating qwen-extension.json and related skill/settings contracts.
 * Fase 12 keeps this layer deterministic: no Qwen CLI process, no MCP server,
 * no network calls and no shell execution are required to validate these files.
 */
export declare const REQUIRED_SETTINGS_HOOKS: readonly ["SessionStart", "SessionEnd", "UserPromptSubmit", "PreToolUse", "PostToolUse"];
export declare const REQUIRED_SKILL_COMMANDS: readonly ["start", "status", "list", "approve", "abort"];
export declare const McpServerSchema: z.ZodEffects<z.ZodObject<{
    command: z.ZodString;
    args: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    cwd: z.ZodOptional<z.ZodString>;
    shell: z.ZodOptional<z.ZodNever>;
}, "strict", z.ZodTypeAny, {
    command: string;
    args: string[];
    shell?: undefined;
    cwd?: string | undefined;
}, {
    command: string;
    shell?: undefined;
    cwd?: string | undefined;
    args?: string[] | undefined;
}>, {
    command: string;
    args: string[];
    shell?: undefined;
    cwd?: string | undefined;
}, {
    command: string;
    shell?: undefined;
    cwd?: string | undefined;
    args?: string[] | undefined;
}>;
export declare const QwenExtensionManifestSchema: z.ZodObject<{
    name: z.ZodLiteral<"greenforge">;
    version: z.ZodString;
    description: z.ZodString;
    mcpServers: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        command: z.ZodString;
        args: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        cwd: z.ZodOptional<z.ZodString>;
        shell: z.ZodOptional<z.ZodNever>;
    }, "strict", z.ZodTypeAny, {
        command: string;
        args: string[];
        shell?: undefined;
        cwd?: string | undefined;
    }, {
        command: string;
        shell?: undefined;
        cwd?: string | undefined;
        args?: string[] | undefined;
    }>, {
        command: string;
        args: string[];
        shell?: undefined;
        cwd?: string | undefined;
    }, {
        command: string;
        shell?: undefined;
        cwd?: string | undefined;
        args?: string[] | undefined;
    }>>, Record<string, {
        command: string;
        args: string[];
        shell?: undefined;
        cwd?: string | undefined;
    }>, Record<string, {
        command: string;
        shell?: undefined;
        cwd?: string | undefined;
        args?: string[] | undefined;
    }>>;
    skills: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>;
    contextFileName: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>>;
    hooks: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>>;
}, "strict", z.ZodTypeAny, {
    name: "greenforge";
    description: string;
    version: string;
    mcpServers: Record<string, {
        command: string;
        args: string[];
        shell?: undefined;
        cwd?: string | undefined;
    }>;
    skills: string;
    contextFileName?: string | undefined;
    hooks?: string | undefined;
}, {
    name: "greenforge";
    description: string;
    version: string;
    mcpServers: Record<string, {
        command: string;
        shell?: undefined;
        cwd?: string | undefined;
        args?: string[] | undefined;
    }>;
    skills: string;
    contextFileName?: string | undefined;
    hooks?: string | undefined;
}>;
export type McpServer = z.infer<typeof McpServerSchema>;
export type QwenExtensionManifest = z.infer<typeof QwenExtensionManifestSchema>;
export declare function validateQwenExtensionManifest(input: unknown): QwenExtensionManifest;
export declare const SkillFrontmatterSchema: z.ZodObject<{
    name: z.ZodLiteral<"greenforge">;
    description: z.ZodString;
    'argument-hint': z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    name: z.ZodLiteral<"greenforge">;
    description: z.ZodString;
    'argument-hint': z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    name: z.ZodLiteral<"greenforge">;
    description: z.ZodString;
    'argument-hint': z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;
export interface SkillManifest {
    frontmatter: SkillFrontmatter;
    body: string;
}
export declare function parseSkillFrontmatter(markdown: string): SkillManifest;
export declare function validateSkillManifest(markdown: string): SkillManifest;
export declare function skillListsRequiredCommands(markdownBody: string): boolean;
export declare const QwenSettingsSchema: z.ZodEffects<z.ZodObject<{
    hooks: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
        matcher: z.ZodOptional<z.ZodString>;
        hooks: z.ZodArray<z.ZodEffects<z.ZodObject<{
            type: z.ZodEnum<["command", "http"]>;
            command: z.ZodOptional<z.ZodString>;
            args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            url: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
            timeout: z.ZodOptional<z.ZodNumber>;
            shell: z.ZodOptional<z.ZodNever>;
        }, "strict", z.ZodTypeAny, {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }, {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }>, {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }, {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        hooks: {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }[];
        matcher?: string | undefined;
    }, {
        hooks: {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }[];
        matcher?: string | undefined;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    hooks: Record<string, {
        hooks: {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }[];
        matcher?: string | undefined;
    }[]>;
}, {
    hooks: Record<string, {
        hooks: {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }[];
        matcher?: string | undefined;
    }[]>;
}>, {
    hooks: Record<string, {
        hooks: {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }[];
        matcher?: string | undefined;
    }[]>;
}, {
    hooks: Record<string, {
        hooks: {
            type: "command" | "http";
            command?: string | undefined;
            shell?: undefined;
            args?: string[] | undefined;
            url?: string | undefined;
            timeout?: number | undefined;
        }[];
        matcher?: string | undefined;
    }[]>;
}>;
export type QwenSettings = z.infer<typeof QwenSettingsSchema>;
export type QwenHookBinding = QwenSettings['hooks'][string][number];
export type QwenHookAction = QwenHookBinding['hooks'][number];
export declare function validateQwenSettings(input: unknown): QwenSettings;
export declare function settingsProtectsSensitiveTools(settings: {
    hooks: Record<string, QwenHookBinding[]>;
}, tools: string[]): boolean;
export declare function collectManifestLocalPaths(manifest: QwenExtensionManifest): string[];
