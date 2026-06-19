import { z } from 'zod';
/**
 * Schema de validação para a resposta do LLM.
 */
const IntentResponseSchema = z.object({
    intention: z.enum(['NORMAL_CHAT', 'DEVELOPMENT_TASK']),
    confidence: z.number().min(0).max(1),
});
/**
 * Roteador de intenção que utiliza o Qwen para classificar prompts.
 */
export class QwenRouter {
    llm;
    CONFIDENCE_THRESHOLD = 0.7;
    constructor(llm) {
        this.llm = llm;
    }
    /**
     * Classifica a intenção de um prompt do usuário.
     * @param input O prompt raw do usuário.
     * @returns A intenção classificada ('NORMAL_CHAT' ou 'DEVELOPMENT_TASK').
     */
    async classify(input) {
        const prompt = `
      Classifique a intenção do usuário no contexto de engenharia de software:
      Input: "${input}"
      
      Responda apenas em JSON: 
      { "intention": "NORMAL_CHAT" | "DEVELOPMENT_TASK", "confidence": 0.0-1.0 }
    `;
        try {
            const response = await this.llm.generate(prompt);
            if (!response) {
                return 'NORMAL_CHAT';
            }
            const rawResult = JSON.parse(response);
            const result = IntentResponseSchema.parse(rawResult);
            if (result.confidence < this.CONFIDENCE_THRESHOLD) {
                return 'NORMAL_CHAT';
            }
            return result.intention;
        }
        catch {
            // Fallback seguro em caso de erro na API, JSON inválido ou falha na validação do schema
            return 'NORMAL_CHAT';
        }
    }
}
//# sourceMappingURL=QwenRouter.js.map