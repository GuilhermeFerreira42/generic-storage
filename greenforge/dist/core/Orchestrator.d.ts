import { SQLiteRepository } from '../infrastructure/db/SQLiteRepository.js';
import { OrchestratorEvent } from './types/Orchestrator.js';
export declare class Orchestrator {
    private readonly repository;
    constructor(repository: SQLiteRepository);
    trigger(taskId: string, event: OrchestratorEvent): Promise<void>;
}
