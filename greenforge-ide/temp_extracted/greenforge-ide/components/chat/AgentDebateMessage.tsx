'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { AgentMessage } from '@/store/debateStore'
import { ChevronDown, ChevronRight, Code, Shield, Sparkles, Bot, Eye, EyeOff } from 'lucide-react'

interface AgentDebateMessageProps {
  message: AgentMessage
  onToggleExpand: () => void
}

const AGENT_ICONS = {
  proposer: Code,
  critic: Shield,
  judge: Sparkles
} as any

const AGENT_TITLES = {
  technical_proposer: 'Propositor Técnico',
  quality_critic: 'Quality Critic',
  debate_judge: 'Debate Judge'
} as any

const AGENT_THEME = {
  proposer: 'border-blue-500/20 bg-blue-500/5 text-blue-300',
  critic: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
  judge: 'border-purple-500/20 bg-purple-500/5 text-purple-300'
} as any

export function AgentDebateMessage({ message, onToggleExpand }: AgentDebateMessageProps) {
  const Icon = AGENT_ICONS[message.role] || Bot
  const themeClass = AGENT_THEME[message.role] || 'border-border bg-muted/20 text-foreground'
  const title = AGENT_TITLES[message.agentId] || message.agentId

  return (
    <div id={`debate-msg-${message.id}`} className={cn(
      "border rounded-lg overflow-hidden transition-all duration-300 shadow bg-[#151520]",
      themeClass
    )}>
      {/* Header/Toggle panel */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-foreground/5 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-semibold text-xs uppercase tracking-wider">{title}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs">
          <span>{message.isExpanded ? 'Ocultar Detalhes' : 'Visualizar Detalhes'}</span>
          {message.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* Content panel */}
      {message.isExpanded && (
        <div className="p-3 border-t border-border/40 font-mono text-[11px] md:text-xs leading-relaxed max-h-96 overflow-y-auto bg-black/40 text-gray-200 whitespace-pre-wrap select-all">
          {message.content ? message.content : 'Aguardando conteúdo...'}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-amber-400 ml-1 animate-[blink_0.8s_infinite]" />
          )}
        </div>
      )}
    </div>
  )
}
