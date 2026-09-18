import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

function nexusDevServerPlugin(): Plugin {
  const rooms = new Map<string, any>();
  const messagesByRoom = new Map<string, any[]>();
  const membersByRoom = new Map<string, any[]>();
  const sseClientsByRoom = new Map<string, Set<ServerResponse>>();

  function broadcastSSE(roomCode: string, payload: any) {
    const clients = sseClientsByRoom.get(roomCode);
    if (clients) {
      const data = `data: ${JSON.stringify(payload)}\n\n`;
      clients.forEach((res) => {
        try {
          res.write(data);
        } catch {
          clients.delete(res);
        }
      });
    }
  }

  function readJsonBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  return {
    name: 'nexus-dev-server-relay',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/nexus', async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        // Health Check
        if (pathname === '/health' || pathname === '/health/') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ONLINE', activeRooms: rooms.size }));
          return;
        }

        // SSE Realtime Subscription: /events?room=444
        if (pathname === '/events' || pathname === '/events/') {
          const roomCode = url.searchParams.get('room') || '';
          if (!roomCode) {
            res.statusCode = 400;
            res.end('Missing room parameter');
            return;
          }

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });
          res.write(': connected\n\n');

          if (!sseClientsByRoom.has(roomCode)) {
            sseClientsByRoom.set(roomCode, new Set());
          }
          sseClientsByRoom.get(roomCode)!.add(res);

          req.on('close', () => {
            sseClientsByRoom.get(roomCode)?.delete(res);
          });
          return;
        }

        // Rooms API: /rooms, /rooms/:code
        if (pathname.startsWith('/rooms')) {
          const parts = pathname.split('/').filter(Boolean);
          const roomCodeParam = parts[1]; // /rooms/444 -> 444

          if (req.method === 'GET' && roomCodeParam) {
            const cleanCode = decodeURIComponent(roomCodeParam).trim().toUpperCase();
            const room = rooms.get(cleanCode);
            if (!room) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'ROOM_NOT_FOUND', message: 'Room enclave not found' }));
              return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ data: room }));
            return;
          }

          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const cleanCode = (body.room_code || '').trim().toUpperCase();
            if (!cleanCode) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'INVALID_ROOM_CODE' }));
              return;
            }

            rooms.set(cleanCode, body);
            if (!messagesByRoom.has(cleanCode)) {
              messagesByRoom.set(cleanCode, []);
            }
            if (!membersByRoom.has(cleanCode)) {
              membersByRoom.set(cleanCode, []);
            }

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, room: body }));
            return;
          }
        }

        // Messages API: /messages
        if (pathname.startsWith('/messages')) {
          if (req.method === 'GET') {
            const roomCode = url.searchParams.get('room') || '';
            const msgs = messagesByRoom.get(roomCode) || [];
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ data: msgs }));
            return;
          }

          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const roomCode = (body.room_code || '').trim().toUpperCase();
            if (roomCode) {
              if (!messagesByRoom.has(roomCode)) {
                messagesByRoom.set(roomCode, []);
              }
              messagesByRoom.get(roomCode)!.push(body.message);
              broadcastSSE(roomCode, { type: 'NEW_MESSAGE', message: body.message });
            }

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }
        }

        // Members API: /members
        if (pathname.startsWith('/members')) {
          if (req.method === 'GET') {
            const roomCode = url.searchParams.get('room') || '';
            const members = membersByRoom.get(roomCode) || [];
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ data: members }));
            return;
          }

          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const roomCode = (body.room_code || '').trim().toUpperCase();
            if (roomCode) {
              if (!membersByRoom.has(roomCode)) {
                membersByRoom.set(roomCode, []);
              }
              const list = membersByRoom.get(roomCode)!;
              if (!list.some((m) => m.user_id === body.member?.user_id)) {
                list.push(body.member);
              }
              broadcastSSE(roomCode, { type: 'USER_JOINED', user: body.member });
            }

            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }
        }

        res.statusCode = 404;
        res.end('Not found');
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nexusDevServerPlugin()],
  test: {
    globals: true,
    environment: 'happy-dom',
  },
  server: {
    port: 3000,
    open: false,
  },
});
