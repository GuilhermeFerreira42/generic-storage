import { HookSimulator } from './HookSimulator.js';
import { QwenE2EResult, QwenE2EResultSchema } from './types.js';
import { QwenRouter } from '../../infrastructure/llm/QwenRouter.js';
import { PlannerEngine } from '../../core/PlannerEngine.js';
import { SQLiteRepository } from '../../infrastructure/db/SQLiteRepository.js';
import { Orchestrator } from '../../core/Orchestrator.js';
import { MockMcpClient } from '../../infrastructure/mcp/MockMcpClient.js';
import { CoderAgent } from '../../core/agents/CoderAgent.js';
import { TesterAgent } from '../../core/agents/TesterAgent.js';
import { ReviewerAgent } from '../../core/agents/ReviewerAgent.js';
import { JoinGate } from '../../core/JoinGate.js';
import { DiffLens } from '../../core/DiffLens.js';
import { Verifier } from '../../core/Verifier.js';
import { LLMProvider } from '../../core/ports/LLMProvider.js';
import { SubtaskNode } from '../../core/types/Task.js';
import { AgentContext } from '../../core/types/Agent.js';
import { AgentResult } from '../../core/types/Agent.js';
import { JoinInput } from '../../core/types/Join.js';
import { VerificationInput } from '../../core/types/Verifier.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';

/**
 * Options for controlling the E2E scenario deterministically.
 */
export interface E2ERunOptions {
  /** Predefined scenario for deterministic testing */
  scenario?: 'APPROVED' | 'HIGH_RISK' | 'RETRYABLE' | 'NORMAL_CHAT';
  /** Explicit taskId for reproducible tests */
  taskId?: string;
  /** Whether to preserve temp directory on error (default: false) */
  preserveOnError?: boolean;
  /** Explicit temporary directory for testing cleanup (default: auto-generated) */
  tempDir?: string;
}

/**
 * Mock LLM Provider for controlled E2E testing.
 * Returns deterministic responses for classification and planning.
 */
class MockLLMProvider implements LLMProvider {
  async generate(prompt: string): Promise<string> {
    if (prompt.includes('Classifique a intenção') || prompt.includes('classify')) {
      return JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 0.95 });
    }
    // Return a valid plan JSON for PlannerEngine
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

export class QwenIntegrationRunner {
  private simulator: HookSimulator;
  private router: QwenRouter;
  private planner: PlannerEngine;
  private tempDir: string;
  private dbPath: string;
  private repository: SQLiteRepository | null = null;
  private orchestrator: Orchestrator | null = null;
  private mcpClient: MockMcpClient;
  private coderAgent: CoderAgent;
  private testerAgent: TesterAgent;
  private reviewerAgent: ReviewerAgent;
  private joinGate: JoinGate;
  private diffLens: DiffLens;
  private verifier: Verifier;

  constructor() {
    const llm = new MockLLMProvider();
    this.simulator = new HookSimulator();
    this.router = new QwenRouter(llm);
    this.planner = new PlannerEngine(llm);
    
    // These will be initialized in runE2E to allow for tempDir injection
    this.tempDir = '';
    this.dbPath = '';
    
    this.mcpClient = new MockMcpClient();
    this.coderAgent = new CoderAgent(this.mcpClient);
    this.testerAgent = new TesterAgent(this.mcpClient);
    this.reviewerAgent = new ReviewerAgent(this.mcpClient);
    this.joinGate = new JoinGate();
    this.diffLens = new DiffLens();
    this.verifier = new Verifier();
  }

  private getRepository(): SQLiteRepository {
    if (!this.repository) {
      throw new Error('Repository not initialized. Call runE2E first.');
    }
    return this.repository;
  }

  private getOrchestrator(): Orchestrator {
    if (!this.orchestrator) {
      throw new Error('Orchestrator not initialized. Call runE2E first.');
    }
    return this.orchestrator;
  }

  private initializeResources(options?: E2ERunOptions): void {
    this.tempDir = options?.tempDir ?? join(tmpdir(), `greenforge-e2e-${Date.now()}`);
    mkdirSync(this.tempDir, { recursive: true });
    this.dbPath = join(this.tempDir, 'test.db');
    
    this.repository = new SQLiteRepository(this.dbPath);
    this.repository.initialize();
    
    this.orchestrator = new Orchestrator(this.repository);
  }

  async runE2E(prompt: string, options?: E2ERunOptions): Promise<QwenE2EResult> {
    const taskId = options?.taskId ?? `task-${Date.now()}`;
    let errorOccurred = false;

    try {
      this.initializeResources(options);
      const worktreePath = join(this.tempDir, taskId);
      mkdirSync(worktreePath, { recursive: true });

      // 1. SessionStart
      await this.simulator.simulate({ event: 'SessionStart', payload: {} });

      // 2. UserPromptSubmit - classify intent
      const submitResult = await this.simulator.simulate({
        event: 'UserPromptSubmit',
        payload: { prompt }
      });

      if (submitResult.action === 'NOOP' || options?.scenario === 'NORMAL_CHAT') {
        return this.createResult(taskId, 'BLOCKED', 0, false, 'NORMAL_CHAT');
      }

      // 3. Create task in repository
      const repo = this.getRepository();
      const orch = this.getOrchestrator();
      const branchName = `feature/${taskId}`;
      repo.createTask({
        id: taskId,
        title: 'E2E Test Task',
        originalPrompt: prompt,
        branchName,
        worktreePath,
        status: 'PENDING',
        planMarkdown: null,
        subtasksGraph: null
      });

      // 4. Route task
      await orch.trigger(taskId, 'ROUTE_TASK');

      // 5. Clarification done (simulated)
      await orch.trigger(taskId, 'CLARIFICATION_DONE');

      // 6. Generate plan using real PlannerEngine
      const plan = await this.planner.generatePlan(taskId, prompt);
      const planMarkdown = this.planner.renderToMarkdown(plan);
      await this.planner.savePlan(plan, worktreePath);
      
      // Save plan markdown and subtasks graph via public API only
      repo.runInTransaction(() => {
        repo.saveSubtasksGraph(taskId, plan.subtasksGraph);
      });

      await orch.trigger(taskId, 'PLAN_GENERATED');
      await orch.trigger(taskId, 'APPROVE_PLAN');
      await orch.trigger(taskId, 'START_BUILD');

      // 7. Execute subtasks with real agents
      let graph = repo.getSubtasksGraph(taskId) || [];
      const agentResults: AgentResult[] = [];

      for (const node of graph) {
        // Re-fetch graph to get latest state (including updates from previous iterations)
        graph = repo.getSubtasksGraph(taskId) || [];
        const currentNode = graph.find(n => n.id === node.id);
        if (!currentNode) continue;

        // Update subtask status to RUNNING
        repo.runInTransaction(() => {
          const updatedGraph = graph.map(n => n.id === currentNode.id ? { ...n, status: 'RUNNING' as const } : n);
          repo.saveSubtasksGraph(taskId, updatedGraph);
        });

        const context: AgentContext = {
          taskId,
          subtaskId: currentNode.id,
          worktreePath,
          planMarkdown,
          instructions: currentNode.title,
          allowedTools: this.getAllowedTools(currentNode.assignedAgent ?? 'CODER')
        };

        let result: AgentResult;
        switch (currentNode.assignedAgent) {
          case 'CODER':
            this.setupMcpForCoder();
            result = await this.coderAgent.execute(context);
            break;
          case 'TESTER':
            this.setupMcpForTester();
            result = await this.testerAgent.execute(context);
            break;
          case 'REVIEWER':
            this.setupMcpForReviewer();
            result = await this.reviewerAgent.execute(context);
            break;
          default:
            result = this.createFailedResult(currentNode, 'Unknown agent');
        }

        agentResults.push(result);

        // Update subtask status and artifactOutput
        repo.runInTransaction(() => {
          const latestGraph = repo.getSubtasksGraph(taskId) || [];
          const updatedGraph = latestGraph.map(n => {
            if (n.id === currentNode.id) {
              return { 
                ...n, 
                status: result.status === 'DONE' ? 'DONE' as const : 'FAILED' as const,
                artifactOutput: result.status === 'DONE' ? result.artifacts[0]?.path || 'output' : null
              };
            }
            return n;
          });
          repo.saveSubtasksGraph(taskId, updatedGraph);
        });
      }

      // Re-fetch the final updated graph from repository
      graph = repo.getSubtasksGraph(taskId) || [];

      // 8. JoinGate - consolidate results
      const joinInput: JoinInput = {
        taskId,
        subtasksGraph: graph.map(n => ({
          ...n,
          status: n.status as 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED',
          worktreePath: n.worktreePath,
          artifactOutput: n.artifactOutput
        })),
        agentResults
      };
      
      const joinResult = await this.joinGate.join(joinInput);

      // 9. DiffLens - generate audit report
      // For HIGH_RISK scenario, inject a critical file artifact to trigger BLOCKED
      let artifactsForDiff = joinResult.artifacts;
      if (options?.scenario === 'HIGH_RISK') {
        artifactsForDiff = [
          ...artifactsForDiff,
          {
            type: 'DIFF' as const,
            path: 'package.json',
            content: 'modified package.json content'
          }
        ];
      }
      const diffReport = await this.diffLens.generateReport(taskId, artifactsForDiff);
      await this.diffLens.saveAuditReport(diffReport, worktreePath);

      // 10. Verifier - final verification
      // For HIGH_RISK scenario, inject a high-risk artifact to trigger BLOCKED
      // For RETRYABLE scenario, inject test/lint failure to trigger RETRYABLE
      const testResult = options?.scenario === 'RETRYABLE'
        ? { command: 'npm test', exitCode: 1 }
        : { command: 'npm test', exitCode: 0 };
      const lintResult = options?.scenario === 'RETRYABLE'
        ? { command: 'npm run lint', exitCode: 1 }
        : { command: 'npm run lint', exitCode: 0 };

      const verificationInput: VerificationInput = {
        taskId,
        diffReport,
        joinResult,
        testResult,
        lintResult
      };
      const verificationResult = await this.verifier.verify(verificationInput);

      // 11. Get checkpoints count
      const checkpoints = repo.getCheckpoints(taskId).length;

      // 12. SessionEnd
      await this.simulator.simulate({ event: 'SessionEnd', payload: {} });

      // Determine auditReportGenerated from actual DiffLens report
      const auditReportGenerated = diffReport.riskLevel !== undefined;

      const result = QwenE2EResultSchema.parse({
        taskId,
        finalStatus: verificationResult.status,
        checkpoints,
        auditReportGenerated,
        verificationStatus: verificationResult.status,
        diffReport,
        joinResult,
        verificationResult
      });
      return result;

    } catch (error) {
      errorOccurred = true;
      const message = error instanceof Error ? error.message : String(error);
      return this.createResult(taskId, 'BLOCKED', 0, false, `ERROR: ${message}`);
    } finally {
      // Always cleanup tempDir on success or controlled results.
      // Only preserve tempDir if a real exception occurred AND preserveOnError is true.
      const preserve = errorOccurred && (options?.preserveOnError ?? false);
      this.cleanup(preserve);
    }
  }

  private getAllowedTools(agent: string): string[] {
    switch (agent) {
      case 'CODER': return ['edit_file', 'read_file'];
      case 'TESTER': return ['run_test', 'read_file'];
      case 'REVIEWER': return ['review_code', 'read_file'];
      default: return [];
    }
  }

  private setupMcpForCoder(): void {
    this.mcpClient.setTools([
      { name: 'edit_file', description: 'Edits a file' },
      { name: 'read_file', description: 'Reads a file' }
    ]);
    this.mcpClient.setResponse('edit_file', { ok: true, content: 'diff content' });
  }

  private setupMcpForTester(): void {
    this.mcpClient.setTools([
      { name: 'run_test', description: 'Runs tests' },
      { name: 'read_file', description: 'Reads a file' }
    ]);
    this.mcpClient.setResponse('run_test', { ok: true, content: 'All tests passed' });
  }

  private setupMcpForReviewer(): void {
    this.mcpClient.setTools([
      { name: 'review_code', description: 'Reviews code' },
      { name: 'read_file', description: 'Reads a file' }
    ]);
    this.mcpClient.setResponse('review_code', { ok: true, content: { status: 'APPROVED', comments: [] } });
  }

  private createFailedResult(node: SubtaskNode, message: string): AgentResult {
    return {
      agent: node.assignedAgent as 'CODER' | 'TESTER' | 'REVIEWER',
      taskId: '',
      subtaskId: node.id,
      status: 'FAILED',
      summary: message,
      artifacts: [],
      errors: [{ code: 'EXECUTION_ERROR', message, retryable: false }]
    };
  }

  private createResult(
    taskId: string,
    finalStatus: 'APPROVED' | 'BLOCKED' | 'RETRYABLE',
    checkpoints: number,
    auditReportGenerated: boolean,
    verificationStatus: string
  ): QwenE2EResult {
    return QwenE2EResultSchema.parse({
      taskId,
      finalStatus,
      checkpoints,
      auditReportGenerated,
      verificationStatus
    });
  }

  private cleanup(preserve: boolean): void {
    try {
      if (this.repository) {
        this.repository.close();
      }
      if (existsSync(this.tempDir)) {
        if (!preserve) {
          rmSync(this.tempDir, { recursive: true, force: true });
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}