import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore } from '@/store/agentStore';

describe('agentStore', () => {
  beforeEach(() => {
    useAgentStore.getState().resetAgent();
  });

  it('should update connection status', () => {
    useAgentStore.getState().setConnected(true);
    expect(useAgentStore.getState().isConnected).toBe(true);
  });

  it('should add tokens and set isThinking', () => {
    useAgentStore.getState().addToken('Hello', 'session-1');
    expect(useAgentStore.getState().currentTokens).toBe('Hello');
    expect(useAgentStore.getState().isThinking).toBe(true);
  });

  it('should finalize message', () => {
    useAgentStore.getState().addToken('Hello', 'session-1');
    useAgentStore.getState().finalizeMessage('Hello world', 'session-1');
    expect(useAgentStore.getState().currentTokens).toBe('');
    expect(useAgentStore.getState().isThinking).toBe(false);
  });

  it('should set approval required', () => {
    const request = {
      actionId: '1',
      toolName: 'test',
      description: 'test desc',
      sessionId: 'session-1'
    };
    useAgentStore.getState().setApprovalRequired(request);
    expect(useAgentStore.getState().approvalRequired).toEqual(request);
  });

  it('should add tool events', () => {
    const event = {
      type: 'call' as const,
      actionId: '1',
      toolName: 'test',
      sessionId: 'session-1'
    };
    useAgentStore.getState().addToolEvent(event);
    expect(useAgentStore.getState().toolEvents).toContainEqual(event);
  });
});
