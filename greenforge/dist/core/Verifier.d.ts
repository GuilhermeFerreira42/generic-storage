import { VerificationInput, VerificationResult } from './types/Verifier.js';
export declare class Verifier {
    /**
     * Consolidates technical signals and produces a structured final verification result.
     */
    verify(input: VerificationInput): Promise<VerificationResult>;
}
