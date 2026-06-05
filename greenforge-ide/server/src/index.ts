// server/src/index.ts
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import 'dotenv/config';
import { initDB } from './db/init.js';
import { handleWSConnection } from './ws/handler.js';
import { loadMCPConfig } from './mcp/loader.js';
import { connectMCPServer } from './mcp/client.js';
import { buildToolRegistry } from './tools/registry.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
}));

app.use(express.json());

// Endpoint REST para listar sessões
app.get('/api/sessions', (req, res) => {
  const { SessionStore } = require('./db/sessions.js');
  const workspace = req.query.workspace as string;
  const sessions = SessionStore.listByWorkspace(workspace);
  res.json(sessions);
});

// Endpoint REST para deletar sessão
app.delete('/api/sessions/:id', (req, res) => {
  const { SessionStore } = require('./db/sessions.js');
  SessionStore.delete(req.params.id);
  res.json({ ok: true });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Inicializa o banco antes de aceitar conexões
initDB();

const workspacePath = process.env.WORKSPACE_ROOT ?? process.cwd();
const mcpConfigs = loadMCPConfig(workspacePath);
const globalRegistry = buildToolRegistry(workspacePath);

// Conecta servidores MCP em background sem bloquear a inicialização
Promise.all(
  mcpConfigs.map((config) => connectMCPServer(config, globalRegistry))
).then(() => {
  console.error(`[MCP] ${mcpConfigs.length} servidor(es) configurado(s)`);
});

wss.on('connection', (ws: WebSocket, req) => {
  const origin = req.headers.origin;
  const allowed = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

  if (origin !== allowed) {
    ws.terminate();
    return;
  }

  handleWSConnection(ws);
});

const PORT = parseInt(process.env.PORT ?? '3001', 10);

httpServer.listen(PORT, () => {
  // Usar console.error em vez de console.log
  // para não poluir stdout em integrações stdio futuras
  console.error(`GreenForge backend rodando na porta ${PORT}`);
});
