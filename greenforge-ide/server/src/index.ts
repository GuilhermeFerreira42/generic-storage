// server/src/index.ts
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import 'dotenv/config';
import { initDB } from './db/init.js';
import { handleWSConnection } from './ws/handler.js';

const app = express();

// Configuração de CORS
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
}));

app.use(express.json());

/**
 * Endpoint REST para listar sessões de um workspace
 */
app.get('/api/sessions', (req, res) => {
  const { SessionStore } = require('./db/sessions.js');
  const workspace = req.query.workspace as string;
  
  if (!workspace) {
    res.status(400).json({ error: 'workspace é obrigatório' });
    return;
  }
  
  const sessions = SessionStore.listByWorkspace(workspace);
  res.json(sessions);
});

/**
 * Endpoint REST para deletar uma sessão
 */
app.delete('/api/sessions/:id', (req, res) => {
  const { SessionStore } = require('./db/sessions.js');
  SessionStore.delete(req.params.id);
  res.json({ ok: true });
});

// Criação do servidor HTTP e WebSocket
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Inicializa o banco antes de aceitar conexões
initDB();

// Handler de novas conexões WebSocket
wss.on('connection', (ws: WebSocket, req) => {
  const origin = req.headers.origin;
  const allowed = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

  // Bloqueia conexões de origens não autorizadas
  if (origin !== allowed) {
    console.error(`[WS] Conexão rejeitada de origem não autorizada: ${origin}`);
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('[SERVER] Recebido SIGINT, encerrando...');
  wss.clients.forEach((client) => {
    client.close();
  });
  httpServer.close(() => {
    console.error('[SERVER] Servidor HTTP encerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.error('[SERVER] Recebido SIGTERM, encerrando...');
  wss.clients.forEach((client) => {
    client.close();
  });
  httpServer.close(() => {
    console.error('[SERVER] Servidor HTTP encerrado');
    process.exit(0);
  });
});
