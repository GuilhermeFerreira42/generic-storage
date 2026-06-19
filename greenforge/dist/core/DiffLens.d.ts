import { DiffReport } from './types/DiffLens.js';
import { AgentArtifact } from './types/Agent.js';
/**
 * Motor de visualização e auditoria de mudanças.
 */
export declare class DiffLens {
    private readonly CRITICAL_FILES;
    /**
     * Gera um relatório estruturado a partir dos artefatos consolidados.
     */
    generateReport(taskId: string, artifacts: AgentArtifact[]): Promise<DiffReport>;
    /**
     * Renderiza o relatório em formato Markdown.
     */
    renderMarkdown(report: DiffReport): string;
    /**
     * Salva o relatório no filesystem de forma segura.
     */
    saveAuditReport(report: DiffReport, worktreeRoot: string): Promise<string>;
}
