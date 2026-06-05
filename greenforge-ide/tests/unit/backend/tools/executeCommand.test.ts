import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecuteCommandTool } from '@/server/src/tools/shell/executeCommand';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';

vi.mock('child_process');

describe('ExecuteCommandTool', () => {
  let tool: ExecuteCommandTool;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = new ExecuteCommandTool('/workspace');
  });

  it('should execute a command successfully', async () => {
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.kill = vi.fn();

    (child_process.spawn as any).mockReturnValue(mockChild);

    const promise = tool.execute({ command: 'echo hello' });

    mockChild.stdout.emit('data', Buffer.from('hello'));
    mockChild.emit('close', 0);

    const result = await promise;

    expect(result).toContain('STDOUT:\nhello');
    expect(result).toContain('Exit code: 0');
  });

  it('should handle command errors', async () => {
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.kill = vi.fn();

    (child_process.spawn as any).mockReturnValue(mockChild);

    const promise = tool.execute({ command: 'invalid' });

    mockChild.stderr.emit('data', Buffer.from('command not found'));
    mockChild.emit('close', 127);

    const result = await promise;

    expect(result).toContain('STDERR:\ncommand not found');
    expect(result).toContain('Exit code: 127');
  });

  it('should timeout if command takes too long', async () => {
    vi.useFakeTimers();
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.kill = vi.fn();

    (child_process.spawn as any).mockReturnValue(mockChild);

    const promise = tool.execute({ command: 'sleep 100', timeout_seconds: 1 });

    vi.advanceTimersByTime(1500);

    await expect(promise).rejects.toThrow('Timeout');
    expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    
    vi.useRealTimers();
  });
});
