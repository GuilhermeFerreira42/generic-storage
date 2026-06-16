import { z } from 'zod';
import { LLMProvider } from './ports/LLMProvider.js';
import { Plan } from './types/Plan.js';
import { SubtaskNode } from './types/Task.js';
import { safeResolveForWrite } from '../shared/SafeResolve.js';
import { atomicWrite } from '../shared/AtomicWrite.js';

/**
 * Schemas de validação Zod para o Plano.
 */
const ClarificationQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  required: z.boolean(),
});

const SubtaskNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  assignedAgent: z.enum(['CODER', 'TESTER', 'DOCS']).nullable(),
  dependsOn: z.array(z.string()),
  status: z.literal('PENDING'),
  worktreePath: z.null(),
  artifactOutput: z.null(),
});

const PlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  originalPrompt: z.string(),
  questions: z.array(ClarificationQuestionSchema).min(5).max(7),
  subtasksGraph: z.array(SubtaskNodeSchema).min(1),
  acceptanceCriteria: z.array(z.string()).min(1),
  risks: z.array(z.string()),
  createdAt: z.string(),
});

/**
 * Motor de geração e validação de planos de engenharia.
 */
export class PlannerEngine {
  constructor(private readonly llm: LLMProvider) {}

  /**
   * Gera um plano estruturado a partir de um prompt do usuário.
   */
  async generatePlan(taskId: string, prompt: string): Promise<Plan> {
    const systemPrompt = `
      Você é um engenheiro de software sênior. Decomponha a tarefa abaixo em um plano de execução.
      
      REGRAS:
      1. Gere exatamente entre 5 e 7 perguntas de clarificação essenciais.
      2. Crie um grafo de subtarefas acíclico.
      3. Cada subtarefa deve ter um ID único (ex: ST-01).
      
      Tabelas de Agentes:
      - CODER: Escrita de código e lógica.
      - TESTER: Escrita de testes e verificação.
      - DOCS: Documentação.

      Responda APENAS em JSON seguindo este schema:
      {
        "id": "${taskId}",
        "title": "Resumo curto",
        "originalPrompt": "${prompt}",
        "questions": [{ "id": "string", "question": "string", "required": boolean }],
        "subtasksGraph": [{ "id": "string", "title": "string", "assignedAgent": "CODER"|"TESTER"|"DOCS", "dependsOn": ["ID"], "status": "PENDING", "worktreePath": null, "artifactOutput": null }],
        "acceptanceCriteria": ["string"],
        "risks": ["string"],
        "createdAt": "ISOString"
      }
    `;

    const response = await this.llm.generate(systemPrompt);
    const rawPlan = JSON.parse(response);
    
    // 1. Validação de Schema (Zod)
    const plan = PlanSchema.parse(rawPlan);

    // 2. Segurança: Sobrescrever ID e Prompt original para não confiar no LLM
    plan.id = taskId;
    plan.originalPrompt = prompt;

    // 3. Validação de Integridade do Grafo
    this.validateGraphIntegrity(plan.subtasksGraph);

    return plan;
  }

  /**
   * Valida se todas as dependências existem, se não há IDs duplicados e se não há ciclos no grafo.
   */
  private validateGraphIntegrity(nodes: SubtaskNode[]): void {
    const ids = new Set(nodes.map(n => n.id));
    
    // Verificação de IDs duplicados
    if (ids.size !== nodes.length) {
        throw new Error('Duplicate subtask IDs detected in graph');
    }

    // Check missing dependencies
    for (const node of nodes) {
      for (const depId of node.dependsOn) {
        if (!ids.has(depId)) {
          throw new Error(`Subtask "${node.id}" depends on non-existent subtask "${depId}"`);
        }
      }
    }

    // Cycle detection (DFS)
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (id: string): boolean => {
      if (recStack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      recStack.add(id);

      const node = nodes.find(n => n.id === id)!;
      for (const depId of node.dependsOn) {
        if (hasCycle(depId)) return true;
      }

      recStack.delete(id);
      return false;
    };

    for (const node of nodes) {
      if (hasCycle(node.id)) {
        throw new Error('Cyclic dependency detected in subtasks graph');
      }
    }
  }

  /**
   * Renderiza o plano em formato Markdown (GREENFORGE_PLAN.md).
   */
  renderToMarkdown(plan: Plan): string {
    let md = `# GREENFORGE_PLAN — ${plan.title}\n\n`;
    md += `**Original Prompt:** ${plan.originalPrompt}\n`;
    md += `**Created At:** ${plan.createdAt}\n\n`;

    md += `## Questions\n`;
    plan.questions.forEach(q => {
      md += `- [${q.required ? 'REQUIRED' : 'OPTIONAL'}] ${q.question}\n`;
    });
    md += `\n`;

    md += `## Subtasks\n`;
    plan.subtasksGraph.forEach(st => {
      md += `### ${st.id}: ${st.title}\n`;
      md += `- **Agent:** ${st.assignedAgent}\n`;
      md += `- **Depends On:** ${st.dependsOn.join(', ') || 'None'}\n\n`;
    });

    md += `## Acceptance Criteria\n`;
    plan.acceptanceCriteria.forEach(ac => md += `- ${ac}\n`);
    md += `\n`;

    md += `## Risks\n`;
    plan.risks.forEach(r => md += `- ${r}\n`);

    return md;
  }

  /**
   * Salva o plano no filesystem de forma segura.
   */
  async savePlan(plan: Plan, worktreeRoot: string): Promise<string> {
    const targetFileName = 'GREENFORGE_PLAN.md';
    const safePath = await safeResolveForWrite(targetFileName, worktreeRoot);
    
    const content = this.renderToMarkdown(plan);
    await atomicWrite(safePath, content);
    
    return safePath;
  }
}
