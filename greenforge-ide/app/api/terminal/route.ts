import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { command } = await req.json();
    if (!command) {
      return NextResponse.json({ output: 'Comando inválido' }, { status: 400 });
    }

    try {
      const { stdout, stderr } = await execAsync(command, { cwd: process.cwd(), timeout: 10000 });
      let output = '';
      if (stdout) output += stdout;
      if (stderr) output += `\x1b[31m${stderr}\x1b[0m`;
      return NextResponse.json({ output: output || '\x1b[90m(Sem saída)\x1b[0m' });
    } catch (error: any) {
      return NextResponse.json({ output: `\x1b[31mErro: ${error.message}\x1b[0m` });
    }
  } catch (err: any) {
    return NextResponse.json({ output: `\x1b[31mErro no servidor: ${err.message}\x1b[0m` }, { status: 500 });
  }
}
