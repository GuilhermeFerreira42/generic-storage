'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle2, ShieldAlert, BadgeInfo } from 'lucide-react'

type AgentState = 'IDLE' | 'THINKING' | 'STREAMING' | 'COMPLETED' | 'ERROR'

interface StatusBadgeProps {
  agentName: string
  role: 'proposer' | 'critic' | 'judge' | string
  state: AgentState
  round?: number
}

export function StatusBadge({ agentName, role, state, round }: StatusBadgeProps) {
  const roleColors = {
    proposer: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    critic: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    judge: 'border-purple-500/30 bg-purple-500/10 text-purple-400'
  }[role] || 'border-border bg-muted text-muted-foreground'

  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg border text-xs transition-all animate-in fade-in duration-200",
      roleColors
    )}>
      <div className="flex items-center gap-2">
        {state === 'THINKING' && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
        )}
        {state === 'STREAMING' && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
        {state === 'COMPLETED' && (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        )}
        {state === 'ERROR' && (
          <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
        )}
        {state === 'IDLE' && (
          <BadgeInfo className="h-3.5 w-3.5 opacity-50" />
        )}
        <span className="font-semibold">{agentName}</span>
      </div>
      
      <div className="flex items-center gap-1.5 opacity-80">
        <span>
          {state === 'IDLE' && 'Aguardando'}
          {state === 'THINKING' && 'Analisando...'}
          {state === 'STREAMING' && 'Gerando arquitetura...'}
          {state === 'COMPLETED' && 'Validado'}
          {state === 'ERROR' && 'Interrompido'}
        </span>
        {round && <span className="text-[10px] bg-foreground/10 px-1.5 py-0.5 rounded font-mono">R{round}</span>}
      </div>
    </div>
  )
}
