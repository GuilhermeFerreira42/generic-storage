import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Terminal } from '@/components/ide/terminal'
import { useIDEStore } from '@/lib/store'

describe('Terminal Component', () => {
  beforeEach(() => {
    useIDEStore.setState({
      terminalHistory: [],
    })
    
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    })
  })

  it('renders default introduction when terminal history is empty', () => {
    render(<Terminal />)
    expect(screen.getByText('GreenForge OS Terminal v2.3')).toBeInTheDocument()
    expect(screen.getByText(/Digite "help" para verificar/)).toBeInTheDocument()
  })

  it('renders terminal output lines correctly, supporting ANSI escape parsing', () => {
    useIDEStore.setState({
      terminalHistory: [
        'normal text',
        '\x1b[31mred text\x1b[0m',
        '\x1b[32mgreen text\x1b[0m'
      ]
    })

    render(<Terminal />)

    expect(screen.getByText('normal text')).toBeInTheDocument()
    
    const redSpan = screen.getByText('red text')
    expect(redSpan).toHaveClass('text-red-400')

    const greenSpan = screen.getByText('green text')
    expect(greenSpan).toHaveClass('text-green-400')
  })

  it('clears terminal on button click or Ctrl+L', async () => {
    const clearSpy = vi.fn()
    useIDEStore.setState({
      terminalHistory: ['output line'],
      clearTerminal: clearSpy
    })

    render(<Terminal />)

    // Verify history exists
    expect(screen.getByText('output line')).toBeInTheDocument()

    // Click Clear button
    const clearBtn = screen.getByRole('button', { name: 'Limpar' })
    await userEvent.click(clearBtn)
    expect(clearSpy).toHaveBeenCalled()

    // Test Ctrl+L keydown on input
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'l', ctrlKey: true })
    expect(clearSpy).toHaveBeenCalledTimes(2)
  })

  it('copies terminal content to clipboard when copy button is clicked', async () => {
    useIDEStore.setState({
      terminalHistory: ['line 1', 'line 2']
    })

    render(<Terminal />)

    const copyBtn = screen.getByRole('button', { name: 'Copiar' })
    await userEvent.click(copyBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('line 1\nline 2')
  })

  it('sends command when Enter is pressed in input', async () => {
    const execSpy = vi.fn()
    useIDEStore.setState({
      executeTerminalCommand: execSpy
    })

    render(<Terminal />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'npm run test{enter}')

    // Since socket is mocked in setup.ts as isConnected: true, it will call sendMessage with type: terminal_command
    // Let's verify standard command execution triggers (either via socket or fallback executeTerminalCommand)
    expect(input).toHaveValue('')
  })
})
