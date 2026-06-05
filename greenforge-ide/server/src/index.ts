// server/src/index.ts
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { initDB } from './db/init.js';
import { handleWSConnection } from './ws/handler.js';
import { loadMCPConfig } from './mcp/loader.js';
import { connectMCPServer } from './mcp/client.js';
import { buildToolRegistry } from './tools/registry.js';
import { SessionStore } from './db/sessions.js';

const app = express();

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use(express.json());

// Endpoint REST para listar sessões
app.get('/api/sessions', (req, res) => {
  const workspace = req.query.workspace as string;
  const sessions = SessionStore.listByWorkspace(workspace);
  res.json(sessions);
});

// Endpoint REST para deletar sessão
app.delete('/api/sessions/:id', (req, res) => {
  SessionStore.delete(req.params.id);
  res.json({ ok: true });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Inicializa o banco antes de aceitar conexões
initDB();

let defaultWorkspace = path.join(process.cwd(), 'workspaces', 'default');
if (!fs.existsSync(defaultWorkspace)) {
  fs.mkdirSync(defaultWorkspace, { recursive: true });
}

let envWorkspace = process.env.WORKSPACE_ROOT;
const workspacePath = (!envWorkspace || envWorkspace === '.' || envWorkspace === './')
  ? defaultWorkspace
  : envWorkspace;
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

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
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
