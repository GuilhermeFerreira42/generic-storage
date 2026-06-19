export type Intent = 'NORMAL_CHAT' | 'DEVELOPMENT_TASK';
export interface IntentResult {
    intention: Intent;
    confidence: number;
}
