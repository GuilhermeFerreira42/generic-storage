// server/src/types/session.ts

export type SessionStatus = 'active' | 'paused' | 'completed' | 'error';

export interface Session {
  id: string;
  createdAt: number; // timestamp Unix em segundos
  updatedAt: number;
  status: SessionStatus;
  projectPath?: string;
  metadata: Record<string, any>;
}

export interface Message {
  id?: number;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: any[];
  toolResults?: any[];
}

export interface ToolExecution {
  id?: number;
  sessionId: string;
  toolName: string;
  inputArgs: Record<string, any>;
  outputResult?: any;
  status: 'pending' | 'success' | 'error';
  startedAt: number;
  completedAt?: number;
  errorMessage?: string;
}

export interface FileChange {
  id?: number;
  sessionId: string;
  filePath: string;
  operation: 'create' | 'update' | 'delete';
  previousContent?: string;
  newContent?: string;
  timestamp: number;
}
