/**
 * Interface para provedores de Large Language Models.
 */
export interface LLMProvider {
    /**
     * Gera uma resposta baseada em um prompt.
     * @param prompt O texto a ser enviado ao modelo.
     */
    generate(prompt: string): Promise<string>;
}
