import { useState, useRef } from 'react'
import { useDebateStore } from '@/store/debateStore'
import { useIDEStore } from '@/lib/store'

export function useAgentSSE() {
  const [isLoading, setIsLoading] = useState(false)
  const debateStore = useDebateStore()
  const ideStore = useIDEStore()
  const abortControllerRef = useRef<AbortController | null>(null)

  const stopDebate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    debateStore.setStatus('ABORTED')
    // Clear debateSession or stop debating in IDEStore as well
    ideStore.stopDebate()
  }

  const runDebate = async (objective: string) => {
    setIsLoading(true)
    debateStore.resetDebate()
    debateStore.setObjective(objective)
    debateStore.setStatus('IN_PROGRESS')
    
    // Support existing IDEStore structure
    ideStore.startDebate(objective)

    const controller = new AbortController()
    abortControllerRef.current = controller

    // Add user message to the generic store
    ideStore.addMessage({
      role: 'user',
      content: objective
    })

    try {
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ objective }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Não foi possível acessar o stream de resposta.")
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEventName = ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          if (trimmedLine.startsWith('event:')) {
            currentEventName = trimmedLine.replace('event:', '').trim()
          } else if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.substring(5).trim()
            try {
              const payload = JSON.parse(dataStr)

              if (currentEventName === 'DEBATE_STATUS') {
                debateStore.setStatus(payload.status)
                debateStore.setActiveAgent(payload.activeAgent)
                debateStore.setCurrentRound(payload.currentRound)
                
                // Keep ideStore updated
                ideStore.updateDebateSession({
                  status: payload.status,
                  currentRound: payload.currentRound
                })
              } else if (currentEventName === 'AGENT_TOKEN') {
                debateStore.addMessageToken(payload.agentId, payload.role, payload.token, payload.isLast)
              } else if (currentEventName === 'SECURITY_VIOLATION') {
                ideStore.addMessage({
                  role: 'system',
                  content: `[POLÍTICA DE PÂNICO L3] Detecção de infração: "${payload.error}".`,
                  agentName: 'Sentinela'
                })
                debateStore.setStatus('ABORTED')
                ideStore.updateDebateSession({ status: 'ABORTED' })
                setIsLoading(false)
                return
              } else if (currentEventName === 'HITL_GATE') {
                if (payload.gateType === 'GATE_1') {
                  debateStore.setStatus('GATE_1')
                  ideStore.setApprovalCard(payload.approvalCard)
                  ideStore.updateDebateSession({ status: 'GATE_1' })
                }
              }
            } catch (err) {
              console.error('Erro ao processar linha de dados SSE:', err, dataStr)
            }
            currentEventName = ''
          }
        }
      }
      debateStore.setStatus('COMPLETED')
      ideStore.updateDebateSession({ status: 'COMPLETED' })
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Debate abortado pelo usuário')
      } else {
        console.error('Erro no debate:', err)
        ideStore.addMessage({
          role: 'system',
          content: `Um erro interrompeu o debate: ${err.message}`,
          agentName: 'Sistema'
        })
        debateStore.setStatus('ABORTED')
        ideStore.updateDebateSession({ status: 'ABORTED' })
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  return {
    runDebate,
    stopDebate,
    isLoading
  }
}
