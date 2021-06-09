import { config, WebSocket, WebSocketServer } from './deps.ts';

import { handleConnectRequest } from './components/connectSockets.ts';

const server = new WebSocketServer(parseInt(config().WS_PORT));
console.log(`WebSocket: ws://localhost:${parseInt(config().WS_PORT)}/`);

server.on('connection', (ws: WebSocket) => {
  ws.on('message', (message: string) => {
    const obj = JSON.parse(message);

    handleConnectRequest(ws, { ...obj });
  });
});
