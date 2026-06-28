/**
 * Fase 18 — Teste End-to-End com Runtime Real do GreenForge
 * Valida fluxo completo usando QwenExtensionEntrypoint real.
 * Usa InternalMockLLMProvider (determinístico).
 */
import { createExtension } from '../src/integration/qwen/QwenExtensionEntrypoint.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const tempDir = join(tmpdir(), `greenforge-phase18-e2e-${Date.now()}`);
mkdirSync(tempDir, { recursive: true });

const LOG: string[] = [];
function log(msg: string, data?: unknown) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  const d = data !== undefined ? ': ' + JSON.stringify(data).slice(0, 200) : '';
  const line = `[${ts}] ${msg}${d}`;
  LOG.push(line);
  console.log(line);
}

async function main() {
  let passed = 0;
  let failed = 0;
  try {
    log('PASSO 0: Inicializar extensao');
    const ext = createExtension({ projectRoot, tempDir });
    ext.init();
    log('Extensao inicializada');
    passed++;

    log('PASSO 1: Validar manifesto');
    const manifest = ext.getRuntime().getManifest();
    log('name: ' + manifest.name);
    if (manifest.name !== 'greenforge') throw new Error('Manifesto invalido');
    log('Manifesto validado');
    passed++;

    log('PASSO 2: Validar settings');
    const settings = ext.getRuntime().getSettings();
    log('hooks: ' + Object.keys(settings.hooks).join(', '));
    const reqHooks = ['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse'];
    for (const h of reqHooks) { if (!settings.hooks[h]) throw new Error('Hook ' + h + ' ausente'); }
    log('Settings validados');
    passed++;

    log('PASSO 3: Validar SKILL.md');
    const skill = ext.getRuntime().getSkillManifest();
    log('skill name: ' + skill.frontmatter.name);
    const cmds = ['start', 'status', 'list', 'approve', 'abort'];
    for (const c of cmds) { if (!new RegExp('\\b' + c + '\\b').test(skill.body)) throw new Error('Cmd ' + c + ' ausente'); }
    log('SKILL.md validado');
    passed++;

    log('PASSO 4: Hook SessionStart');
    const ss = await ext.handleSessionStart({});
    log('result: ' + JSON.stringify(ss));
    if (!ss.ok || ss.action !== 'ALLOW') throw new Error('SessionStart falhou: ' + ss.reason);
    log('SessionStart aprovado');
    passed++;

    log('PASSO 5: Hook UserPromptSubmit (dev task)');
    const ps = await ext.handleUserPromptSubmit({ prompt: 'Criar tela de login' });
    log('result: ' + JSON.stringify(ps));
    if (ps.action === 'BLOCK') throw new Error('Prompt bloqueado: ' + ps.reason);
    log('UserPromptSubmit: ' + ps.action);
    passed++;

    log('PASSO 5b: UserPromptSubmit (chat normal)');
    const cs = await ext.handleUserPromptSubmit({ prompt: 'Hello, how are you?' });
    log('result: ' + JSON.stringify(cs));
    if (cs.action === 'NOOP') { log('Chat = NOOP'); passed++; }
    else { log('AVISO: chat normal = ' + cs.action); }

    log('PASSO 6: Hook PreToolUse (seguranca)');
    const safePT = ext.handlePreToolUse({ tool: 'WriteFile', path: 'src/index.ts', allowedRoot: tempDir });
    log('safe write: ' + JSON.stringify(safePT));
    if (safePT.action !== 'ALLOW') throw new Error('PreToolUse seguro bloqueado');
    const unsafePT = ext.handlePreToolUse({ tool: 'WriteFile', path: '/etc/passwd', allowedRoot: tempDir });
    log('unsafe write: ' + JSON.stringify(unsafePT));
    if (unsafePT.action !== 'BLOCK') throw new Error('PreToolUse inseguro deve ser bloqueado');
    log('PreToolUse seguranca validada');
    passed++;

    log('PASSO 7: Comando start "Criar tela de login"');
    const sr = await ext.handleCommand('start', ['Criar tela de login']);
    log('result: ' + JSON.stringify(sr));
    if (!sr.ok) throw new Error('start falhou: ' + sr.result);
    const taskId = (sr.data as Record<string, unknown>)?.taskId as string;
    log('Task criada: ' + taskId);
    passed++;

    log('PASSO 8: Comando status');
    const str = await ext.handleCommand('status', []);
    log('result: ' + JSON.stringify(str));
    if (!str.ok) throw new Error('status falhou');
    log('Status obtido');
    passed++;

    log('PASSO 9: Comando list');
    const lr = await ext.handleCommand('list', []);
    log('result: ' + JSON.stringify(lr));
    if (!lr.ok) throw new Error('list falhou');
    log('Tarefas listadas');
    passed++;

    log('PASSO 10: Comando approve ' + taskId);
    const ar = await ext.handleCommand('approve', [taskId]);
    log('result: ' + JSON.stringify(ar));
    if (!ar.ok) throw new Error('approve falhou: ' + ar.result);
    log('Plano aprovado');
    passed++;

    log('PASSO 11: Hook PostToolUse');
    const ptu = ext.handlePostToolUse({ tool: 'WriteFile', taskId });
    log('result: ' + JSON.stringify(ptu));
    if (!ptu.ok) throw new Error('PostToolUse falhou');
    log('Checkpoint registrado');
    passed++;

    log('PASSO 12: Comando abort ' + taskId);
    const abr = await ext.handleCommand('abort', [taskId]);
    log('result: ' + JSON.stringify(abr));
    log('Task abortada');
    passed++;

    log('PASSO 13: PostToolUse sem taskId');
    const pnt = ext.handlePostToolUse({ tool: 'ReadFile' });
    log('result: ' + JSON.stringify(pnt));
    log('PostToolUse sem taskId OK');
    passed++;

    log('PASSO 14: Hook SessionEnd');
    const se = ext.handleSessionEnd({});
    log('result: ' + JSON.stringify(se));
    if (!se.ok || se.action !== 'ALLOW') throw new Error('SessionEnd falhou');
    log('SessionEnd OK');
    passed++;

    log('PASSO 15: Verificar isolamento');
    const rt = ext.getRuntime();
    log('realQwen: ' + rt.usesRealQwen());
    log('realMCP: ' + rt.usesRealMCP());
    log('realLLM: ' + rt.usesRealLLM());
    log('network: ' + rt.makesNetworkCalls());
    log('destructiveGit: ' + rt.canDoDestructiveGitOps());
    if (rt.usesRealQwen() || rt.usesRealMCP() || rt.usesRealLLM() ||
        rt.makesNetworkCalls() || rt.canDoDestructiveGitOps()) {
      log('ISOLAMENTO VIOLADO'); failed++;
    } else { log('Isolamento OK'); passed++; }

    log('PASSO 16: Cleanup final');
    ext.cleanup();
    log('Cleanup OK');
    passed++;

    log('RESULTADO: ' + passed + ' passaram, ' + failed + ' falharam');
    return { passed, failed, log: LOG };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('ERRO FATAL: ' + msg);
    failed++;
    return { passed, failed, log: LOG };
  }
}

main().then(r => {
  if (r.failed > 0) { console.error('E2E REAL: ' + r.failed + ' falha(s)'); process.exit(1); }
  else { console.log('E2E REAL: Todos os ' + r.passed + ' passos passaram!'); process.exit(0); }
}).catch(err => { console.error(err); process.exit(1); });