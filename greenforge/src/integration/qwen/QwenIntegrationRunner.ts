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
// import { DiffReport } from '../../core/types/DiffLens.js'; // unused
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';

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
  private repository: SQLiteRepository;
  private orchestrator: Orchestrator;
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
    
    // Create temporary directory for database
    this.tempDir = join(tmpdir(), `greenforge-e2e-${Date.now()}`);
    mkdirSync(this.tempDir, { recursive: true });
    this.dbPath = join(this.tempDir, 'test.db');
    
    this.repository = new SQLiteRepository(this.dbPath);
    this.repository.initialize();
    
    this.orchestrator = new Orchestrator(this.repository);
    this.mcpClient = new MockMcpClient();
    this.coderAgent = new CoderAgent(this.mcpClient);
    this.testerAgent = new TesterAgent(this.mcpClient);
    this.reviewerAgent = new ReviewerAgent(this.mcpClient);
    this.joinGate = new JoinGate();
    this.diffLens = new DiffLens();
    this.verifier = new Verifier();
  }

  async runE2E(prompt: string): Promise<QwenE2EResult> {
    const taskId = `task-${Date.now()}`;
    const worktreePath = join(this.tempDir, taskId);
    mkdirSync(worktreePath, { recursive: true });

    try {
      // 1. SessionStart
      await this.simulator.simulate({ event: 'SessionStart', payload: {} });

      // 2. UserPromptSubmit - classify intent
      const submitResult = await this.simulator.simulate({
        event: 'UserPromptSubmit',
        payload: { prompt }
      });

      if (submitResult.action === 'NOOP') {
        return this.createResult(taskId, 'BLOCKED', 0, false, 'NORMAL_CHAT');
      }

      // 3. Create task in repository
      const branchName = `feature/${taskId}`;
      this.repository.createTask({
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
      await this.orchestrator.trigger(taskId, 'ROUTE_TASK');

      // 5. Clarification done (simulated)
      await this.orchestrator.trigger(taskId, 'CLARIFICATION_DONE');

      // 6. Generate plan using real PlannerEngine
      console.log(`[DEBUG] Generating plan...`);
      const plan = await this.planner.generatePlan(taskId, prompt);
      console.log(`[DEBUG] Plan generated: ${JSON.stringify(plan)}`);
      const planMarkdown = this.planner.renderToMarkdown(plan);
      await this.planner.savePlan(plan, worktreePath);
      
      this.repository.runInTransaction(() => {
        const stmt = this.repository['db'].prepare('UPDATE tasks SET plan_markdown = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(planMarkdown, taskId);
        this.repository.saveSubtasksGraph(taskId, plan.subtasksGraph);
      });

      await this.orchestrator.trigger(taskId, 'PLAN_GENERATED');
      await this.orchestrator.trigger(taskId, 'APPROVE_PLAN');
      await this.orchestrator.trigger(taskId, 'START_BUILD');

      // 7. Execute subtasks with real agents
      console.log(`[DEBUG] Getting subtasks graph...`);
      let graph = this.repository.getSubtasksGraph(taskId) || [];
      console.log(`[DEBUG] Graph retrieved: ${JSON.stringify(graph)}`);
      const agentResults: AgentResult[] = [];

      // DEBUG: Log initial graph
      console.log(`[DEBUG] Initial graph: ${JSON.stringify(graph)}`);
      const fs = await import('fs');
      const debugPath = join(this.tempDir, 'debug-join.json');
      fs.writeFileSync(debugPath, JSON.stringify({
        initialGraph: graph,
        step: 'before_loop'
      }, null, 2));
      console.log(`[DEBUG] Wrote initial debug file to: ${debugPath}`);

      for (const node of graph) {
        // Re-fetch graph to get latest state (including updates from previous iterations)
        graph = this.repository.getSubtasksGraph(taskId) || [];
        const currentNode = graph.find(n => n.id === node.id);
        if (!currentNode) continue;

        // Update subtask status to RUNNING
        this.repository.runInTransaction(() => {
          const updatedGraph = graph.map(n => n.id === currentNode.id ? { ...n, status: 'RUNNING' as const } : n);
          this.repository.saveSubtasksGraph(taskId, updatedGraph);
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
        this.repository.runInTransaction(() => {
          // Re-fetch again to ensure we have latest
          const latestGraph = this.repository.getSubtasksGraph(taskId) || [];
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
          this.repository.saveSubtasksGraph(taskId, updatedGraph);
        });
      }

      // Re-fetch the final updated graph from repository
      graph = this.repository.getSubtasksGraph(taskId) || [];

      // DEBUG: Log final graph before JoinGate
      fs.writeFileSync(debugPath + '.graph', JSON.stringify({
        finalGraph: graph,
        agentResults: agentResults.map(r => ({ subtaskId: r.subtaskId, status: r.status, artifacts: r.artifacts.length, errors: r.errors }))
      }, null, 2));

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
      
      // DEBUG: Log the join input to file
      fs.writeFileSync(debugPath + '.input', JSON.stringify({
        subtasksGraph: joinInput.subtasksGraph,
        agentResults: agentResults.map(r => ({ subtaskId: r.subtaskId, status: r.status, artifacts: r.artifacts.length, errors: r.errors }))
      }, null, 2));
      
      const joinResult = await this.joinGate.join(joinInput);
      
      // DEBUG: Log the join result to file
      fs.writeFileSync(debugPath + '.result', JSON.stringify({
        ok: joinResult.ok,
        missingArtifacts: joinResult.missingArtifacts,
        failedSubtasks: joinResult.failedSubtasks,
        errors: joinResult.errors,
        artifactsCount: joinResult.artifacts.length
      }, null, 2));

      // 9. DiffLens - generate audit report
      const diffReport = await this.diffLens.generateReport(taskId, joinResult.artifacts);
      await this.diffLens.saveAuditReport(diffReport, worktreePath);

      // 10. Verifier - final verification
      const verificationInput: VerificationInput = {
        taskId,
        diffReport,
        joinResult,
        testResult: { command: 'npm test', exitCode: 0 },
        lintResult: { command: 'npm run lint', exitCode: 0 }
      };
      const verificationResult = await this.verifier.verify(verificationInput);

      // 11. Get checkpoints count
      const checkpoints = this.repository.getCheckpoints(taskId).length;

      // 12. SessionEnd
      await this.simulator.simulate({ event: 'SessionEnd', payload: {} });

      return QwenE2EResultSchema.parse({
        taskId,
        finalStatus: verificationResult.status,
        checkpoints,
        auditReportGenerated: true,
        verificationStatus: verificationResult.status,
        diffReport,
        joinResult,
        verificationResult
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Preserve temp dir on error for debugging
      this.cleanup(true);
      return this.createResult(taskId, 'BLOCKED', 0, false, `ERROR: ${message}`);
    }
    // No finally block - cleanup is handled in catch for errors, or we let it persist for debugging
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

  private cleanup(preserveOnError: boolean = false): void {
    try {
      this.repository.close();
      if (existsSync(this.tempDir)) {
        if (preserveOnError) {
          console.log(`[DEBUG] Preserving temp dir for inspection: ${this.tempDir}`);
        } else {
          rmSync(this.tempDir, { recursive: true, force: true });
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
