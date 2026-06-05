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
    const isWindows = process.platform === 'win32';

    // On Windows, force UTF-8 (code page 65001) before every command
    // so accented characters (ã, é, ç, etc.) are decoded correctly.
    const shell = isWindows ? 'cmd.exe' : 'sh';
    const wrappedCmd = isWindows ? `chcp 65001 >NUL 2>&1 && ${command}` : command;
    const args = isWindows ? ['/c', wrappedCmd] : ['-c', wrappedCmd];

    const child = spawn(shell, args, {
      cwd,
      env: sanitizeEnv(process.env),
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => { stdoutChunks.push(chunk); });
    child.stderr.on('data', (chunk: Buffer) => { stderrChunks.push(chunk); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Timeout: comando demorou mais de ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      // Decode as UTF-8 so Windows special chars (ã, é, ç) render correctly
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        exitCode: code ?? -1,
      });
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
