import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
// Import the websocket handler from the server module
import { handleWSConnection } from './server/src/ws/handler.js';
import { initDB } from './server/src/db/init.js';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  initDB(); // Initialize sqlite in the root context
  
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    handleWSConnection(ws);
  });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url!);
    // Mount websocket on /ws or default
    if (pathname === '/ws' || pathname === '/') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
