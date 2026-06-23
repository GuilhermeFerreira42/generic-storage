export type TaskStatus = 'PENDING' | 'CLARIFYING' | 'PLANNING' | 'BUILDING' | 'BUILDING_PARALLEL' | 'JOINING' | 'REVIEWING' | 'VERIFYING' | 'COMPLETED' | 'FAILED';
export interface SubtaskNode {
    id: string;
    title: string;
    assignedAgent: 'CODER' | 'TESTER' | 'REVIEWER' | 'DOCS' | null;
    dependsOn: string[];
    status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
    worktreePath: string | null;
    artifactOutput: string | null;
}
export interface TaskRecord {
    id: string;
    title: string;
    originalPrompt: string;
    branchName: string;
    worktreePath: string;
    status: TaskStatus;
    planMarkdown?: string | null;
    subtasksGraph?: SubtaskNode[] | null;
    createdAt: string;
    updatedAt: string;
}
