import { JoinInput, JoinResult } from './types/Join.js';
/**
 * Join Gate: Responsável por validar e consolidar resultados de múltiplos agentes.
 */
export declare class JoinGate {
    /**
     * Consolida os resultados dos agentes e valida a integridade da tarefa.
     */
    join(input: JoinInput): Promise<JoinResult>;
}
