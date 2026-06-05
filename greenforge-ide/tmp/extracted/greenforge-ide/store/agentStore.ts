import { create } from 'zustand'

export interface ToolEvent {
  type: 'call' | 'result'
  actionId: string
  toolName: string
  args?: Record<string, any>
  result?: string
  isError?: boolean
  sessionId: string
}

export interface ApprovalRequest {
  actionId: string
  toolName: string
  diff?: string
  description: string
  sessionId: string
}

interface AgentState {
  isConnected: boolean
  isThinking: boolean
  currentTokens: string
  approvalRequired: ApprovalRequest | null
  toolEvents: ToolEvent[]
  sessionId: string | null

  setConnected: (connected: boolean) => void
  addToken: (token: string, sessionId: string) => void
  finalizeMessage: (fullText: string, sessionId: string) => void
  setApprovalRequired: (request: ApprovalRequest | null) => void
  addToolEvent: (event: ToolEvent) => void
  resetAgent: () => void
}

export const useAgentStore = create<AgentState>((set) => ({
  isConnected: false,
  isThinking: false,
  currentTokens: '',
  approvalRequired: null,
  toolEvents: [],
  sessionId: null,

  setConnected: (isConnected) => set({ isConnected }),
  
  addToken: (token, sessionId) => set((state) => ({
    currentTokens: state.currentTokens + token,
    isThinking: true,
    sessionId
  })),

  finalizeMessage: (fullText, sessionId) => set({
    currentTokens: '', // Clear streaming tokens
    isThinking: false,
    sessionId
    // In a real app, you'd add the full message to a messages list here
  }),

  setApprovalRequired: (approvalRequired) => set({ approvalRequired }),

  addToolEvent: (event) => set((state) => ({
    toolEvents: [...state.toolEvents, event]
  })),

  resetAgent: () => set({
    isThinking: false,
    currentTokens: '',
    approvalRequired: null,
    toolEvents: [],
    sessionId: null
  })
}))
