// server/src/tools/shell/dockerRunner.ts
import Docker from 'dockerode';

const docker = new Docker();

export async function runInDocker(
  command: string,
  workspacePath: string,
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const container = await docker.createContainer({
    Image: 'node:22-alpine',
    Cmd: ['sh', '-c', command],
    WorkingDir: '/workspace',
    HostConfig: {
      Binds: [`${workspacePath}:/workspace:rw`],
      NetworkMode: 'none',      // sem acesso à rede por padrão
      Memory: 512 * 1024 * 1024, // 512MB de RAM máximo
      CpuPeriod: 100000,
      CpuQuota: 50000,           // 50% de CPU máximo
      AutoRemove: true,
    },
    Env: [],                     // sem variáveis de ambiente do host
  });

  await container.start();

  const timeoutHandle = setTimeout(async () => {
    try {
      await container.kill();
    } catch (e) {
      // Ignora erro se o container já parou
    }
  }, timeoutMs);

  const output = await container.wait();
  clearTimeout(timeoutHandle);

  const logs = await container.logs({ stdout: true, stderr: true });
  const logString = logs.toString('utf-8');

  return {
    stdout: logString,
    stderr: '',
    exitCode: output.StatusCode,
  };
}
