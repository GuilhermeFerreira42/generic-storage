'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useIDEStore } from '@/lib/store'
import { Loader2, Copy, Check, Trash2, Terminal as TerminalIcon } from 'lucide-react'
import { useAgentSocket } from '@/hooks/useAgentSocket'

export function Terminal() {
  const terminalHistory = useIDEStore(s => s.terminalHistory)
  const addTerminalLine = useIDEStore(s => s.addTerminalLine)
  const executeTerminalCommand = useIDEStore(s => s.executeTerminalCommand)
  const clearTerminal = useIDEStore(s => s.clearTerminal)
  const currentDir = useIDEStore(s => s.currentDir)
  
  const { sendMessage, isConnected, sessionId } = useAgentSocket()
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [currentInput, setCurrentInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const listener = (event: Event) => {
      const { data, isError, sessionId: msgSessionId } = (event as CustomEvent).detail;
      if (sessionId && msgSessionId !== sessionId) return;
      addTerminalLine(isError ? `\x1b[31m${data}\x1b[0m` : data);
    };
    window.addEventListener('terminal-output', listener);
    return () => window.removeEventListener('terminal-output', listener);
  }, [addTerminalLine, sessionId]);

  const handleExecute = useCallback(async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return

    setIsLoading(true)
    setCommandHistory(prev => [...prev, trimmed])
    setHistoryIndex(-1)

    try {
      if (isConnected) {
        addTerminalLine(`\x1b[32m$\x1b[0m ${trimmed}`)
        sendMessage({
          type: 'terminal_command',
          sessionId: sessionId || crypto.randomUUID(),
          command: trimmed,
          workspacePath: currentDir || '.'
        })
      } else {
        await executeTerminalCommand(trimmed)
      }
    } catch (e: any) {
      addTerminalLine(`\x1b[31m[ERRO EXECUÇÃO]: ${e.message}\x1b[0m`)
    } finally {
      setIsLoading(false)
    }
  }, [executeTerminalCommand, addTerminalLine, isConnected, sendMessage, sessionId, currentDir])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isLoading) { e.preventDefault(); return }

    if (e.key === 'Enter') {
      handleExecute(currentInput)
      setCurrentInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setCurrentInput('')
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      clearTerminal()
    }
  }

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [terminalHistory, isLoading])

  const handleContainerClick = () => { inputRef.current?.focus() }

  // Strip ANSI escape codes and copy plain text to clipboard
  const handleCopy = useCallback(() => {
    const stripAnsi = (str: string) => str.replace(/\x1b\[[\d;]*m/g, '')
    const plainText = terminalHistory.map(stripAnsi).join('\n')
    navigator.clipboard.writeText(plainText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [terminalHistory])

  const renderAnsiText = (text: string) => {
    const parts = text.split(/\x1b\[(\d+)m/)
    let currentClass = ''
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        switch (part) {
          case '0':  currentClass = ''; break
          case '31': currentClass = 'text-red-400'; break
          case '32': currentClass = 'text-green-400'; break
          case '33': currentClass = 'text-yellow-400 font-medium'; break
          case '34': currentClass = 'text-blue-400 font-semibold'; break
          case '36': currentClass = 'text-cyan-400 font-medium'; break
          case '90': currentClass = 'text-gray-500'; break
        }
        return null
      }
      return part ? <span key={index} className={currentClass}>{part}</span> : null
    })
  }

  return (
    <div id="terminal-wrapper" className="h-full flex flex-col bg-[#0d0e15]">
      {/* Toolbar */}
      <div
        id="terminal-toolbar"
        className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-[#111218] shrink-0"
      >
        <div className="flex items-center gap-2 text-xs text-gray-500 select-none">
          <TerminalIcon className="h-3.5 w-3.5 text-green-500" />
          <span className="font-mono font-semibold text-gray-400">Terminal</span>
          {isConnected && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
              conectado
            </span>
          )}
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-amber-400" />}
        </div>

        <div className="flex items-center gap-1">
          {/* Copy button */}
          <button
            id="btn-terminal-copy"
            onClick={handleCopy}
            disabled={terminalHistory.length === 0}
            title={copied ? 'Copiado!' : 'Copiar conteúdo do terminal'}
            className={[
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200',
              copied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'hover:bg-white/5 text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10',
              'disabled:opacity-30 disabled:cursor-not-allowed'
            ].join(' ')}
          >
            {copied
              ? <><Check className="h-3.5 w-3.5" /><span>Copiado</span></>
              : <><Copy className="h-3.5 w-3.5" /><span>Copiar</span></>
            }
          </button>

          {/* Clear button */}
          <button
            id="btn-terminal-clear"
            onClick={clearTerminal}
            disabled={terminalHistory.length === 0}
            title="Limpar terminal (Ctrl+L)"
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200 hover:bg-white/5 text-gray-500 hover:text-red-400 border border-transparent hover:border-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={containerRef}
        id="terminal-container"
        className="flex-1 text-[#d1d5db] font-mono text-xs md:text-sm px-4 pt-3 pb-2 overflow-auto cursor-text selection:bg-neutral-700 leading-relaxed"
        onClick={handleContainerClick}
      >
        {terminalHistory.length === 0 && !isLoading ? (
          <div className="text-gray-500 select-none">
            <div className="font-semibold text-primary/80">GreenForge OS Terminal v2.3</div>
            <div className="text-xs mt-1">Digite &quot;help&quot; para verificar comandos VFS locais e de cota.</div>
            <div className="mt-2" />
          </div>
        ) : (
          terminalHistory.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {renderAnsiText(line)}
            </div>
          ))
        )}
        
        <div className="flex items-center mt-1">
          <span className="text-green-400 mr-2 font-bold">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 bg-transparent outline-none caret-amber-400 font-mono text-[#f3f4f6]"
            autoFocus
            spellCheck={false}
            placeholder={isLoading ? "Aguardando resposta..." : ""}
          />
        </div>
      </div>
    </div>
  )
}
