import { LLMProvider } from './ports/LLMProvider.js';
import { Plan } from './types/Plan.js';
/**
 * Motor de geração e validação de planos de engenharia.
 */
export declare class PlannerEngine {
    private readonly llm;
    constructor(llm: LLMProvider);
    /**
     * Gera um plano estruturado a partir de um prompt do usuário.
     */
    generatePlan(taskId: string, prompt: string): Promise<Plan>;
    /**
     * Valida se todas as dependências existem, se não há IDs duplicados e se não há ciclos no grafo.
     */
    private validateGraphIntegrity;
    /**
     * Renderiza o plano em formato Markdown (GREENFORGE_PLAN.md).
     */
    renderToMarkdown(plan: Plan): string;
    /**
     * Salva o plano no filesystem de forma segura.
     */
    savePlan(plan: Plan, worktreeRoot: string): Promise<string>;
}
