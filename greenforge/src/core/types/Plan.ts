import { SubtaskNode } from './Task.js';

export interface ClarificationQuestion {
  id: string;
  question: string;
  required: boolean;
}

export interface Plan {
  id: string;
  title: string;
  originalPrompt: string;
  questions: ClarificationQuestion[];
  subtasksGraph: SubtaskNode[];
  acceptanceCriteria: string[];
  risks: string[];
  createdAt: string;
}
