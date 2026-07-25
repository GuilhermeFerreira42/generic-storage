import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validateQwenExtensionManifest,
  validateQwenSettings,
  validateSkillManifest,
  type QwenExtensionManifest,
  type QwenSettings,
  type SkillManifest,
} from './manifestSchemas.js';
import { RuntimeOptions, RuntimeOptionsSchema } from './runtimeTypes.js';
import { LLMProvider } from '../../core/ports/LLMProvider.js';
import { QwenRouter } from '../../infrastructure/llm/QwenRouter.js';
import { PlannerEngine } from '../../core/PlannerEngine.js';
import { SQLiteRepository } from '../../infrastructure/db/SQLiteRepository.js';
import { Orchestrator } from '../../core/Orchestrator.js';
import { LLMProviderFactory } from '../../infrastructure/llm/LLMProviderFactory.js';
import { FetchLLMTransport } from '../../infrastructure/llm/FetchLLMTransport.js';

/**
 * Mock LLM Provider used internally by the runtime so that
 * tests never call real Qwen / network / LLM.
 */
class InternalMockLLMProvider implements LLMProvider {
  async generate(prompt: string): Promise<string> {
    if (prompt.includes('Classifique a intenção') || prompt.includes('classify')) {
      // Extract user input from classification prompt if formatted like Input: "..."
      const matchInput = prompt.match(/Input:\s*"([^"]+)"/i);
      const userPrompt = matchInput ? matchInput[1].toLowerCase() : prompt.toLowerCase();

      const chatPatterns = [
        /\bhow are you\b/i, /\bcomo vai\b/i, /\bcomo estás\b/i, /\btudo bem\b/i, /\btudo bom\b/i,
        /\bhello\b/i, /\bhi\b/i, /\bhey\b/i, /\bolá\b/i, /\boi\b/i, /\be aí\b/i, /\be ai\b/i, /\bbom dia\b/i,
        /\bboa tarde\b/i, /\bboa noite\b/i, /\bobrigado\b/i, /\bobrigada\b/i, /\bvaleu\b/i, /\bthanks\b/i,
        /\bthank you\b/i, /\bqual é o seu nome\b/i, /\bwhat's your name\b/i, /\bquem é você\b/i,
        /\bwho are you\b/i, /\bo que você faz\b/i, /\bwhat do you do\b/i, /\bcomo funciona\b/i,
        /\bme fale sobre\b/i, /\btell me about\b/i,
      ];
      if (chatPatterns.some(pattern => pattern.test(userPrompt))) {
        return JSON.stringify({ intention: 'NORMAL_CHAT', confidence: 0.95 });
      }

      if (/\b(escreva|escrever|redija|redigir|texto|artigo|livro|cap[ií]tulo|roteiro|copy|writing)\b/i.test(userPrompt)) {
        return JSON.stringify({ intention: 'WRITING_TASK', confidence: 0.95 });
      }
      if (/\b(planeje|planejar|plano|roadmap|estrat[eé]gia|neg[oó]cio|arquitetura conceitual)\b/i.test(userPrompt)) {
        return JSON.stringify({ intention: 'PLANNING_TASK', confidence: 0.95 });
      }
      if (/\b(pesquise|pesquisar|pesquisa|compare|comparar|levante|levantamento|refer[eê]ncias)\b/i.test(userPrompt)) {
        return JSON.stringify({ intention: 'RESEARCH_TASK', confidence: 0.95 });
      }
      return JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 0.95 });
    }
    // Return a valid plan JSON
    return JSON.stringify({
      id: 'task-mock',
      title: 'Mock Plan',
      originalPrompt: 'Mock prompt',
      questions: [
        { id: 'q1', question: 'What framework?', required: true },
        { id: 'q2', question: 'What database?', required: true },
        { id: 'q3', question: 'Authentication method?', required: true },
        { id: 'q4', question: 'API design?', required: true },
        { id: 'q5', question: 'Testing strategy?', required: true }
      ],
      subtasksGraph: [
        { id: 'ST-01', title: 'Setup project', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-02', title: 'Write tests', assignedAgent: 'TESTER', dependsOn: ['ST-01'], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-03', title: 'Review code', assignedAgent: 'REVIEWER', dependsOn: ['ST-02'], status: 'PENDING', worktreePath: null, artifactOutput: null }
      ],
      acceptanceCriteria: ['Tests pass', 'Code reviewed'],
      risks: ['Complexity'],
      createdAt: new Date().toISOString()
    });
  }
}

/**
 * QwenExtensionRuntime is the real runtime layer for the Qwen CLI extension.
 *
 * It loads and validates all extension artifacts (manifest, settings, SKILL.md),
 * and provides access to real GreenForge components (Router, Planner, Repository, Orchestrator).
 *
 * Isolation guarantees:
 * - Uses InternalMockLLMProvider: no real Qwen / network / LLM calls in tests.
 * - Uses MockMcpClient-compatible approach: no real MCP calls in tests.
 * - sem operações destrutivas de Git.
 * - SQLiteRepository uses a tempDir-based database.
 */
export class QwenExtensionRuntime {
  private manifest: QwenExtensionManifest | null = null;
  private settings: QwenSettings | null = null;
  private skill: SkillManifest | null = null;
  private options: RuntimeOptions;

  private llm: LLMProvider;
  private router: QwenRouter;
  private planner: PlannerEngine;
  private realLLMEnabled = false;
  private repository: SQLiteRepository | null = null;
  private orchestrator: Orchestrator | null = null;

  private tempDir: string;
  private dbPath: string;
  private initialized = false;
  private closed = false;
  private autoTempDir = false;

  constructor(options: RuntimeOptions) {
    this.options = RuntimeOptionsSchema.parse(options);

    if (this.options.tempDir) {
      this.tempDir = this.options.tempDir;
      this.autoTempDir = false;
    } else {
      this.tempDir = join(tmpdir(), `greenforge-runtime-${Date.now()}`);
      this.autoTempDir = true;
    }

    // Ensure tempDir exists before any SQLite operations
    mkdirSync(this.tempDir, { recursive: true });
    this.dbPath = join(this.tempDir, 'runtime.db');

    const providers = this.createRuntimeProviders();
    this.llm = providers.planner;
    this.router = new QwenRouter(providers.router);
    this.planner = new PlannerEngine(providers.planner);
  }

  private createRuntimeProviders(): { router: LLMProvider; planner: LLMProvider } {
    const useRealLiteLLM = process.env.GREENFORGE_USE_REAL_LITELLM === 'true' && process.env.NODE_ENV !== 'test';
    if (!useRealLiteLLM) {
      const mock = new InternalMockLLMProvider();
      return { router: mock, planner: mock };
    }

    const timeoutMs = Number(process.env.GREENFORGE_LITELLM_TIMEOUT_MS ?? '30000');
    const factory = new LLMProviderFactory();
    const transport = new FetchLLMTransport({ timeoutMs });
    const apiKeyEnv = process.env.GREENFORGE_LITELLM_API_KEY_ENV || undefined;

    const router = factory.createFromConfig(
      {
        provider: 'litellm',
        baseUrl: process.env.GREENFORGE_LITELLM_SMALL_URL ?? 'http://localhost:4001',
        model: process.env.GREENFORGE_LITELLM_SMALL_MODEL ?? 'greenforge-small-fast',
        greenforgeProfile: 'small',
        apiKeyEnv,
        timeout: timeoutMs,
      },
      transport,
    );

    const planner = factory.createFromConfig(
      {
        provider: 'litellm',
        baseUrl: process.env.GREENFORGE_LITELLM_LARGE_URL ?? 'http://localhost:4000',
        model: process.env.GREENFORGE_LITELLM_LARGE_MODEL ?? 'greenforge-large',
        greenforgeProfile: 'large',
        apiKeyEnv,
        timeout: timeoutMs,
      },
      transport,
    );

    this.realLLMEnabled = true;
    return { router, planner };
  }

  // ─── Initialization ───

  initialize(): void {
    if (this.initialized) return;

    // Load and validate manifest
    const manifestPath = join(this.options.projectRoot, 'qwen-extension.json');
    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest not found: ${manifestPath}`);
    }
    const manifestRaw = JSON.parse(readFileSync(manifestPath, 'utf8'));
    this.manifest = validateQwenExtensionManifest(manifestRaw);

    // Load and validate settings
    const settingsPath = join(this.options.projectRoot, '.qwen', 'settings.json');
    if (!existsSync(settingsPath)) {
      throw new Error(`Settings not found: ${settingsPath}`);
    }
    const settingsRaw = JSON.parse(readFileSync(settingsPath, 'utf8'));
    this.settings = validateQwenSettings(settingsRaw);

    // Load and validate SKILL.md
    const skillPath = join(this.options.projectRoot, '.qwen', 'skills', 'greenforge', 'SKILL.md');
    if (!existsSync(skillPath)) {
      throw new Error(`SKILL.md not found: ${skillPath}`);
    }
    const skillRaw = readFileSync(skillPath, 'utf8');
    this.skill = validateSkillManifest(skillRaw);

    this.initialized = true;
  }

  ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  // ─── Accessors ───

  getManifest(): QwenExtensionManifest {
    this.ensureInitialized();
    return this.manifest!;
  }

  getSettings(): QwenSettings {
    this.ensureInitialized();
    return this.settings!;
  }

  getSkillManifest(): SkillManifest {
    this.ensureInitialized();
    return this.skill!;
  }

  getTempDir(): string {
    return this.tempDir;
  }

  getRouter(): QwenRouter {
    return this.router;
  }

  getPlanner(): PlannerEngine {
    return this.planner;
  }

  getRepository(): SQLiteRepository {
    if (!this.repository) {
      this.repository = new SQLiteRepository(this.dbPath);
      this.repository.initialize();
    }
    return this.repository;
  }

  getOrchestrator(): Orchestrator {
    if (!this.orchestrator) {
      this.orchestrator = new Orchestrator(this.getRepository());
    }
    return this.orchestrator;
  }

  // ─── Isolation introspection (for test assertions) ───

  usesRealQwen(): boolean {
    // InternalMockLLMProvider is never real Qwen
    return false;
  }

  usesRealMCP(): boolean {
    // No MCP client in this runtime
    return false;
  }

  usesRealLLM(): boolean {
    return this.realLLMEnabled;
  }

  makesNetworkCalls(): boolean {
    return this.realLLMEnabled;
  }

  canDoDestructiveGitOps(): boolean {
    return false;
  }

  isClosed(): boolean {
    return this.closed;
  }

  // ─── Cleanup ───

  wasTempDirAuto(): boolean {
    return this.autoTempDir;
  }

  cleanup(): void {
    try {
      if (this.repository) {
        this.repository.close();
        this.repository = null;
      }
    } catch {
      // Ignore cleanup errors
    }

    // Remove auto-created tempDir (injected tempDir is preserved)
    if (this.autoTempDir) {
      try {
        rmSync(this.tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }

    this.closed = true;
  }
}