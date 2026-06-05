// server/src/tools/shell/executeCommand.ts
import { spawn } from 'child_process';
import type { Tool } from '../types.js';

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ExecuteOptions {
  command: string;
  workingDirectory: string;
  mode?: 'plan' | 'auto_edit' | 'yolo';
  onApprovalNeeded?: (description: string) => Promise<boolean>;
}

export async function executeTerminalCommand(
  opts: ExecuteOptions,
): Promise<CommandResult> {
  return runCommand(opts.command, opts.workingDirectory, 30000);
}

export class ExecuteCommandTool implements Tool {
  name = 'execute_shell_command';
  description = 'Executa um comando shell no workspace. Use para rodar testes, instalar dependências, compilar código, etc.';
  isDestructive = true;
  inputSchema = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'O comando shell a executar',
      },
      timeout_seconds: {
        type: 'number',
        description: 'Timeout em segundos. Padrão: 30.',
      },
    },
    required: ['command'],
  };

  constructor(private workspacePath: string) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const command = input.command as string;
    const timeoutSeconds = (input.timeout_seconds as number) ?? 30;

    const result = await runCommand(command, this.workspacePath, timeoutSeconds * 1000);

    const output = [
      result.stdout && `STDOUT:\n${result.stdout}`,
      result.stderr && `STDERR:\n${result.stderr}`,
      `Exit code: ${result.exitCode}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    return output || '(sem output)';
  }

  describeAction(input: Record<string, unknown>): string {
    return `Executar comando shell: \`${input.command}\`\nDiretório: ${this.workspacePath}`;
  }
}

function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    // Check if running on Windows or Unix-like
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'sh';
    const args = process.platform === 'win32' ? ['/c', command] : ['-c', command];

    const child = spawn(shell, args, {
      cwd,
      env: sanitizeEnv(process.env),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Timeout: comando demorou mais de ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? -1 });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Remove variáveis sensíveis do ambiente antes de passar ao subprocesso
function sanitizeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const sanitized = { ...env };
  const sensitiveKeys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'AWS_SECRET_ACCESS_KEY',
    'DATABASE_URL',
    'JWT_SECRET',
  ];
  for (const key of sensitiveKeys) {
    delete sanitized[key];
  }
  return sanitized;
}
