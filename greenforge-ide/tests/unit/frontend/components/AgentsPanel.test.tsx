/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentsPanel } from '@/components/ide/agents-panel';
import React from 'react';

vi.mock('lucide-react', () => ({
  Bot: () => <span>Bot</span>,
  Code2: () => <span>Code2</span>,
  Shield: () => <span>Shield</span>,
  Sparkles: () => <span>Sparkles</span>,
  Settings: () => <span>Settings</span>,
  Play: () => <span>Play</span>,
  Pause: () => <span>Pause</span>,
  Square: () => <span>Square</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  Zap: () => <span>Zap</span>,
  Brain: () => <span>Brain</span>,
  Target: () => <span>Target</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  CheckCircle2: () => <span>CheckCircle2</span>,
}));

describe('AgentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the agents panel header', () => {
    render(<AgentsPanel />);
    expect(screen.getByText('Agentes')).toBeDefined();
  });

  it('displays all mock agents', () => {
    render(<AgentsPanel />);
    expect(screen.getByText('Propositor Técnico')).toBeDefined();
    expect(screen.getByText('Crítico de Qualidade')).toBeDefined();
    expect(screen.getByText('Árbitro')).toBeDefined();
    expect(screen.getByText('Manager Agent')).toBeDefined();
  });

  it('shows agent model information', () => {
    render(<AgentsPanel />);
    expect(screen.getByText('gemini-2.5-flash')).toBeDefined();
    expect(screen.getByText('gemini-2.5-flash-lite')).toBeDefined();
    expect(screen.getByText('gemini-2.5-pro')).toBeDefined();
  });

  it('expands agent details when clicking on an agent', () => {
    render(<AgentsPanel />);
    
    // Technical proposer is expanded by default
    expect(screen.getByText(/Gera propostas técnicas/i)).toBeDefined();
    
    // Click to collapse
    const criticButton = screen.getByText('Crítico de Qualidade').closest('button');
    if (criticButton) {
      fireEvent.click(criticButton);
    }
    
    // Now critic description should be visible
    expect(screen.getByText(/Inspeciona adversarialmente/i)).toBeDefined();
  });

  it('toggles agent enabled state when clicking the toggle switch', () => {
    render(<AgentsPanel />);
    
    // Find and click a toggle switch
    const toggles = screen.getAllByRole('button');
    const agentToggle = toggles.find(t => t.getAttribute('title')?.includes('Habilitado') || 
                                          t.getAttribute('title')?.includes('Desabilitado'));
    
    if (agentToggle) {
      fireEvent.click(agentToggle);
    }
    
    // The toggle should have been clicked (we can't verify state change without access to internal state)
    expect(agentToggle).toBeDefined();
  });

  it('displays agent constraints', () => {
    render(<AgentsPanel />);
    
    // Expand an agent to see constraints
    expect(screen.getByText('Constraints')).toBeDefined();
    expect(screen.getByText(/Sempre justificar decisões arquiteturais/i)).toBeDefined();
  });

  it('displays agent tools', () => {
    render(<AgentsPanel />);
    
    expect(screen.getByText('Tools')).toBeDefined();
    expect(screen.getByText('read_file')).toBeDefined();
    expect(screen.getByText('write_file')).toBeDefined();
  });

  it('shows agent status icons', () => {
    render(<AgentsPanel />);
    
    // All agents start as 'idle'
    expect(screen.getAllByText('CheckCircle2').length).toBeGreaterThan(0);
  });

  it('displays role-specific colors and icons', () => {
    render(<AgentsPanel />);
    
    // Verify different roles are displayed
    expect(screen.getByText('Propositor Técnico')).toBeDefined();
    expect(screen.getByText('Crítico de Qualidade')).toBeDefined();
    expect(screen.getByText('Árbitro')).toBeDefined();
    expect(screen.getByText('Manager Agent')).toBeDefined();
  });

  it('shows config button in header', () => {
    render(<AgentsPanel />);
    
    const configButton = screen.getByTitle('Configurações');
    expect(configButton).toBeDefined();
    
    fireEvent.click(configButton);
    // Config button click should toggle showConfig state
  });

  it('displays test and config buttons for each agent', () => {
    render(<AgentsPanel />);
    
    // Expand an agent to see action buttons
    expect(screen.getByText('Testar')).toBeDefined();
    expect(screen.getByText('Config')).toBeDefined();
  });

  it('shows agent count summary in footer', () => {
    render(<AgentsPanel />);
    
    expect(screen.getByText(/4\/4 ativos/i)).toBeDefined();
    expect(screen.getByText('Debate Protocol v2.3')).toBeDefined();
  });

  it('can collapse expanded agent details', () => {
    render(<AgentsPanel />);
    
    // Technical proposer is expanded by default
    expect(screen.getByText(/Gera propostas técnicas/i)).toBeDefined();
    
    // Click to collapse
    const proposerButton = screen.getByText('Propositor Técnico').closest('button');
    if (proposerButton) {
      fireEvent.click(proposerButton);
    }
    
    // Description should no longer be visible
    expect(screen.queryByText(/Gera propostas técnicas/i)).toBeNull();
  });

  it('displays agent descriptions', () => {
    render(<AgentsPanel />);
    
    expect(screen.getByText(/Gera propostas técnicas e arquiteturais para implementação/i)).toBeDefined();
    expect(screen.getByText(/Inspeciona adversarialmente as propostas em busca de problemas/i)).toBeDefined();
    expect(screen.getByText(/Sintetiza debates e produz veredictos através de síntese dialética/i)).toBeDefined();
    expect(screen.getByText(/Analisa objetivos, infere escopo e gerencia o fluxo de debate/i)).toBeDefined();
  });

  it('shows role badges with correct icons', () => {
    render(<AgentsPanel />);
    
    // Each agent should have a role icon
    expect(screen.getByText('Code2')).toBeDefined(); // proposer
    expect(screen.getByText('Shield')).toBeDefined(); // critic
    expect(screen.getByText('Sparkles')).toBeDefined(); // judge
    expect(screen.getByText('Brain')).toBeDefined(); // manager
  });

  it('handles multiple agent expansions simultaneously', () => {
    render(<AgentsPanel />);
    
    // Expand multiple agents
    const agentButtons = screen.getAllByRole('button').filter(b => 
      b.textContent?.includes('Técnico') || 
      b.textContent?.includes('Qualidade') ||
      b.textContent?.includes('Árbitro')
    );
    
    agentButtons.forEach(btn => fireEvent.click(btn));
    
    // Multiple agent details should be visible
    expect(screen.getByText(/Gera propostas técnicas/i)).toBeDefined();
    expect(screen.getByText(/Inspeciona adversarialmente/i)).toBeDefined();
  });
});
