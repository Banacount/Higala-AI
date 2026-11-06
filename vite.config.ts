import { fileURLToPath, URL } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleChat } from './server/chat.ts';

const MAX_BODY_BYTES = 1_000_000;

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large.'));
        req.destroy();
        return;
      }
      body += chunk.toString('utf8');
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', reject);
  });
}

function chatApiPlugin(env: Record<string, string>): Plugin {
  const middleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    _next: (error?: unknown) => void,
  ) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
      return;
    }

    try {
      const body = await readJsonBody(req);
      const result = await handleChat(body, {
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: message }));
    }
  };

  return {
    name: 'higala-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/chat', middleware);
    },
    // Keep the Connect typing honest without forcing the dev server to depend
    // on it. `next` is part of the standard middleware signature.
    enforce: 'pre',
  } satisfies Plugin;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss(), chatApiPlugin(env)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: '127.0.0.1',
    },
    preview: {
      port: 4173,
      host: '127.0.0.1',
    },
  };
});
