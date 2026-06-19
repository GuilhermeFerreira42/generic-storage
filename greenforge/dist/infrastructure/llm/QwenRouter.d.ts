import { LLMProvider } from '../../core/ports/LLMProvider.js';
import { Intent } from '../../core/types/Intent.js';
/**
 * Roteador de intenção que utiliza o Qwen para classificar prompts.
 */
export declare class QwenRouter {
    private readonly llm;
    private readonly CONFIDENCE_THRESHOLD;
    constructor(llm: LLMProvider);
    /**
     * Classifica a intenção de um prompt do usuário.
     * @param input O prompt raw do usuário.
     * @returns A intenção classificada ('NORMAL_CHAT' ou 'DEVELOPMENT_TASK').
     */
    classify(input: string): Promise<Intent>;
}
