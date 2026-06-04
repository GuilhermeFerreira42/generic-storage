import { create } from 'zustand'

export interface AgentMessage {
  id: string
  agentId: 'technical_proposer' | 'quality_critic' | 'debate_judge' | string
  role: 'proposer' | 'critic' | 'judge' | string
  content: string
  isExpanded: boolean
  isStreaming: boolean
  timestamp: number
}

interface DebateState {
  messages: AgentMessage[]
  status: 'IDLE' | 'IN_PROGRESS' | 'GATE_1' | 'COMPLETED' | 'ABORTED'
  activeAgent: 'technical_proposer' | 'quality_critic' | 'debate_judge' | null
  currentRound: number
  objective: string
  globalExpanded: boolean
  setObjective: (objective: string) => void
  setStatus: (status: 'IDLE' | 'IN_PROGRESS' | 'GATE_1' | 'COMPLETED' | 'ABORTED') => void
  setActiveAgent: (agent: 'technical_proposer' | 'quality_critic' | 'debate_judge' | null) => void
  setCurrentRound: (round: number) => void
  addMessageToken: (agentId: string, role: string, token: string, isLast: boolean) => void
  toggleMessageExpanded: (id: string) => void
  setGlobalExpanded: (expanded: boolean) => void
  resetDebate: () => void
}

export const useDebateStore = create<DebateState>((set) => ({
  messages: [],
  status: 'IDLE',
  activeAgent: null,
  currentRound: 1,
  objective: '',
  globalExpanded: false,

  setObjective: (objective) => set({ objective }),
  setStatus: (status) => set({ status }),
  setActiveAgent: (activeAgent) => set({ activeAgent }),
  setCurrentRound: (currentRound) => set({ currentRound }),

  addMessageToken: (agentId, role, token, isLast) => set((state) => {
    const existingMsgIndex = state.messages.findIndex(m => m.agentId === agentId)
    
    if (existingMsgIndex === -1) {
      // Create new message
      const newMsg: AgentMessage = {
        id: `${agentId}-${Date.now()}`,
        agentId,
        role,
        content: token,
        isExpanded: state.globalExpanded, // inherit global expand state initially
        isStreaming: !isLast,
        timestamp: Date.now()
      }
      return { messages: [...state.messages, newMsg] }
    } else {
      // Append token
      const updatedMessages = [...state.messages]
      const existing = updatedMessages[existingMsgIndex]
      updatedMessages[existingMsgIndex] = {
        ...existing,
        content: existing.content + token,
        isStreaming: !isLast
      }
      return { messages: updatedMessages }
    }
  }),

  toggleMessageExpanded: (id) => set((state) => ({
    messages: state.messages.map(m => m.id === id ? { ...m, isExpanded: !m.isExpanded } : m)
  })),

  setGlobalExpanded: (globalExpanded) => set((state) => ({
    globalExpanded,
    messages: state.messages.map(m => ({ ...m, isExpanded: globalExpanded }))
  })),

  resetDebate: () => set({
    messages: [],
    status: 'IDLE',
    activeAgent: null,
    currentRound: 1,
    objective: '',
    globalExpanded: false
  })
}))
