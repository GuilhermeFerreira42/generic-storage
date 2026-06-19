/**
 * Schemas de validação para integração com Qwen CLI
 * Fase 12 — Qwen Integration Base
 */
import { z } from 'zod';
export declare const QwenExtensionManifestSchema: z.ZodObject<{
    name: z.ZodLiteral<"greenforge">;
    version: z.ZodString;
    description: z.ZodString;
    mcpServers: z.ZodRecord<z.ZodString, z.ZodObject<{
        command: z.ZodString;
        args: z.ZodArray<z.ZodString, "many">;
        cwd: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        command: string;
        args: string[];
        cwd?: string | undefined;
    }, {
        command: string;
        args: string[];
        cwd?: string | undefined;
    }>>;
    skills: z.ZodString;
    contextFileName: z.ZodOptional<z.ZodString>;
    hooks: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: "greenforge";
    description: string;
    version: string;
    mcpServers: Record<string, {
        command: string;
        args: string[];
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
        args: string[];
        cwd?: string | undefined;
    }>;
    skills: string;
    contextFileName?: string | undefined;
    hooks?: string | undefined;
}>;
export type QwenExtensionManifest = z.infer<typeof QwenExtensionManifestSchema>;
export declare const SkillManifestFrontmatterSchema: z.ZodObject<{
    name: z.ZodLiteral<"greenforge">;
    description: z.ZodString;
    'argument-hint': z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: "greenforge";
    description: string;
    'argument-hint': string;
}, {
    name: "greenforge";
    description: string;
    'argument-hint': string;
}>;
export type SkillManifestFrontmatter = z.infer<typeof SkillManifestFrontmatterSchema>;
export declare const SkillManifestSchema: z.ZodObject<{
    frontmatter: z.ZodObject<{
        name: z.ZodLiteral<"greenforge">;
        description: z.ZodString;
        'argument-hint': z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: "greenforge";
        description: string;
        'argument-hint': string;
    }, {
        name: "greenforge";
        description: string;
        'argument-hint': string;
    }>;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
    frontmatter: {
        name: "greenforge";
        description: string;
        'argument-hint': string;
    };
}, {
    content: string;
    frontmatter: {
        name: "greenforge";
        description: string;
        'argument-hint': string;
    };
}>;
export type SkillManifest = z.infer<typeof SkillManifestSchema>;
export declare const HookConfigSchema: z.ZodObject<{
    type: z.ZodEnum<["command", "http"]>;
    command: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    timeout: z.ZodNumber;
    matcher: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "command" | "http";
    timeout: number;
    command?: string | undefined;
    url?: string | undefined;
    matcher?: string | undefined;
}, {
    type: "command" | "http";
    timeout: number;
    command?: string | undefined;
    url?: string | undefined;
    matcher?: string | undefined;
}>;
export type HookConfig = z.infer<typeof HookConfigSchema>;
export declare const QwenSettingsSchema: z.ZodObject<{
    hooks: z.ZodObject<{
        SessionStart: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["command", "http"]>;
            command: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            timeout: z.ZodNumber;
            matcher: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }>, "many">>;
        SessionEnd: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["command", "http"]>;
            command: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            timeout: z.ZodNumber;
            matcher: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }>, "many">>;
        UserPromptSubmit: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["command", "http"]>;
            command: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            timeout: z.ZodNumber;
            matcher: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }>, "many">>;
        PreToolUse: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["command", "http"]>;
            command: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            timeout: z.ZodNumber;
        } & {
            matcher: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "command" | "http";
            timeout: number;
            matcher: string;
            command?: string | undefined;
            url?: string | undefined;
        }, {
            type: "command" | "http";
            timeout: number;
            matcher: string;
            command?: string | undefined;
            url?: string | undefined;
        }>, "many">>;
        PostToolUse: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["command", "http"]>;
            command: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            timeout: z.ZodNumber;
            matcher: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }>, "many">>;
        SubagentStart: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["command", "http"]>;
            command: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            timeout: z.ZodNumber;
            matcher: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }>, "many">>;
        SubagentStop: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["command", "http"]>;
            command: z.ZodOptional<z.ZodString>;
            url: z.ZodOptional<z.ZodString>;
            timeout: z.ZodNumber;
            matcher: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }, {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        SessionStart?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SessionEnd?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        UserPromptSubmit?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        PreToolUse?: {
            type: "command" | "http";
            timeout: number;
            matcher: string;
            command?: string | undefined;
            url?: string | undefined;
        }[] | undefined;
        PostToolUse?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SubagentStart?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SubagentStop?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
    }, {
        SessionStart?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SessionEnd?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        UserPromptSubmit?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        PreToolUse?: {
            type: "command" | "http";
            timeout: number;
            matcher: string;
            command?: string | undefined;
            url?: string | undefined;
        }[] | undefined;
        PostToolUse?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SubagentStart?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SubagentStop?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    hooks: {
        SessionStart?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SessionEnd?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        UserPromptSubmit?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        PreToolUse?: {
            type: "command" | "http";
            timeout: number;
            matcher: string;
            command?: string | undefined;
            url?: string | undefined;
        }[] | undefined;
        PostToolUse?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SubagentStart?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SubagentStop?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
    };
}, {
    hooks: {
        SessionStart?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SessionEnd?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        UserPromptSubmit?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        PreToolUse?: {
            type: "command" | "http";
            timeout: number;
            matcher: string;
            command?: string | undefined;
            url?: string | undefined;
        }[] | undefined;
        PostToolUse?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SubagentStart?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
        SubagentStop?: {
            type: "command" | "http";
            timeout: number;
            command?: string | undefined;
            url?: string | undefined;
            matcher?: string | undefined;
        }[] | undefined;
    };
}>;
export type QwenSettings = z.infer<typeof QwenSettingsSchema>;
export declare function validateManifest(json: unknown): {
    valid: boolean;
    error?: string;
    data?: QwenExtensionManifest;
};
export declare function validateSkillManifest(frontmatter: unknown, content: string): {
    valid: boolean;
    error?: string;
};
export declare function validateSettings(json: unknown): {
    valid: boolean;
    error?: string;
    data?: QwenSettings;
};
