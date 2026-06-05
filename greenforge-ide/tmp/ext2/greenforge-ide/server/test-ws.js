import WebSocket from 'ws';
import { randomUUID } from 'crypto';

const ws = new WebSocket('ws://localhost:3001');
const sessionId = randomUUID();

ws.on('open', () => {
  console.log('Connected to WS');
  
  const msg = {
    type: 'chat_message',
    sessionId,
    content: 'oi',
    mode: 'auto_edit',
    workspacePath: process.cwd()
  };
  
  ws.send(JSON.stringify(msg));
});

let tokens = '';

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'agent_token') {
    tokens += msg.token;
    process.stdout.write(msg.token);
  } else if (msg.type === 'agent_thinking_done') {
    console.log('\n\n[Thinking Done]', tokens);
  } else if (msg.type === 'agent_done') {
    console.log('\n[Agent Done]', msg.summary);
    ws.close();
  } else if (msg.type === 'error') {
    console.error('\n[Error]', msg.message);
    ws.close();
  } else {
    console.log('\n[Event]', msg.type, msg);
  }
});

ws.on('close', () => {
  console.log('Disconnected');
});
