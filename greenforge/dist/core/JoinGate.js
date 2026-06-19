import { JoinInputSchema, JoinResultSchema } from './types/Join.js';
/**
 * Join Gate: Responsável por validar e consolidar resultados de múltiplos agentes.
 */
export class JoinGate {
    /**
     * Consolida os resultados dos agentes e valida a integridade da tarefa.
     */
    async join(input) {
        // 1. Validar entrada com Zod
        JoinInputSchema.parse(input);
        const { taskId, subtasksGraph, agentResults } = input;
        const artifacts = [];
        const missingArtifacts = [];
        const failedSubtasks = [];
        const errors = [];
        // 2. Detectar resultados duplicados
        const seenSubtaskIds = new Set();
        for (const result of agentResults) {
            if (seenSubtaskIds.has(result.subtaskId)) {
                const errorResult = {
                    ok: false,
                    taskId,
                    artifacts: [],
                    missingArtifacts: [],
                    failedSubtasks: [],
                    errors: [{
                            code: 'DUPLICATE_AGENT_RESULT',
                            message: `Duplicate AgentResult found for subtask ${result.subtaskId}`,
                            retryable: false
                        }]
                };
                return JoinResultSchema.parse(errorResult);
            }
            seenSubtaskIds.add(result.subtaskId);
        }
        // 3. Mapear resultados por subtask ID para busca rápida
        const resultsMap = new Map(agentResults.map(r => [r.subtaskId, r]));
        // 4. Detectar resultados órfãos (que não existem no grafo)
        const graphIds = new Set(subtasksGraph.map(n => n.id));
        for (const subtaskId of seenSubtaskIds) {
            if (!graphIds.has(subtaskId)) {
                const errorResult = {
                    ok: false,
                    taskId,
                    artifacts: [],
                    missingArtifacts: [],
                    failedSubtasks: [],
                    errors: [{
                            code: 'ORPHAN_AGENT_RESULT',
                            message: `AgentResult found for non-existent subtask ${subtaskId}`,
                            retryable: false
                        }]
                };
                return JoinResultSchema.parse(errorResult);
            }
        }
        // 5. Validar cada subtarefa no grafo
        for (const node of subtasksGraph) {
            const result = resultsMap.get(node.id);
            // A. Validar status no grafo
            if (node.status !== 'DONE') {
                if (!failedSubtasks.includes(node.id)) {
                    failedSubtasks.push(node.id);
                }
                errors.push({
                    code: 'SUBTASK_NOT_DONE',
                    message: `Subtask ${node.id} has status ${node.status}`,
                    retryable: node.status !== 'FAILED'
                });
            }
            // B. Validar existência de artifactOutput no grafo
            if (!node.artifactOutput) {
                if (!missingArtifacts.includes(node.id)) {
                    missingArtifacts.push(node.id);
                }
            }
            // C. Validar AgentResult correspondente
            if (!result) {
                errors.push({
                    code: 'MISSING_AGENT_RESULT',
                    message: `No AgentResult found for subtask ${node.id}`,
                    retryable: true
                });
                continue;
            }
            if (result.status === 'FAILED') {
                if (!failedSubtasks.includes(node.id)) {
                    failedSubtasks.push(node.id);
                }
                errors.push(...result.errors);
            }
            // D. Consolidar artefatos (Apenas de resultados DONE)
            if (result.status === 'DONE') {
                artifacts.push(...result.artifacts);
            }
        }
        const ok = errors.length === 0 && missingArtifacts.length === 0 && failedSubtasks.length === 0;
        const finalResult = {
            ok,
            taskId,
            artifacts,
            missingArtifacts,
            failedSubtasks,
            errors
        };
        // 6. Validar saída com Zod
        return JoinResultSchema.parse(finalResult);
    }
}
//# sourceMappingURL=JoinGate.js.map