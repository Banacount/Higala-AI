import { fileURLToPath, URL } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { ChatValidationError, handleChat } from './server/chat.ts';
import { handleCommunity } from './server/community.ts';
import { readJsonBody, sendJson } from './server/http.ts';

const MAX_BODY_BYTES = 1_000_000;

const COMMUNITY_MAX_BODY_BYTES = 64 * 1024;

function readChatBody(req: IncomingMessage): Promise<unknown> {
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
      const body = await readChatBody(req);
      const result = await handleChat(body, {
        apiKey: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL || process.env.GEMINI_MODEL,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(result));
    } catch (error) {
      // Validation and malformed-body problems are the caller's fault; a live
      // model failure is a server problem and should not look like a 400.
      const isClientError =
        error instanceof ChatValidationError || error instanceof SyntaxError;
      const message = isClientError
        ? error instanceof Error
          ? error.message
          : 'Something went wrong.'
        : 'The support service is unavailable right now.';
      res.statusCode = isClientError ? 400 : 500;
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

const FIREBASE_ENV_KEYS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIRESTORE_EMULATOR_HOST',
  'GCLOUD_PROJECT',
] as const;

function shareFirebaseEnv(env: Record<string, string>): void {
  for (const key of FIREBASE_ENV_KEYS) {
    if (!process.env[key] && env[key]) {
      process.env[key] = env[key];
    }
  }
}

function communityApiPlugin(env: Record<string, string>): Plugin {
  const middleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    _next: (error?: unknown) => void,
  ) => {
    const method = (req.method ?? 'GET').toUpperCase();

    if (method !== 'GET' && method !== 'POST') {
      sendJson(
        res,
        405,
        { error: 'Method not allowed. Use GET or POST.' },
        { Allow: 'GET, POST' },
      );
      return;
    }

    let body: unknown;
    if (method === 'POST') {
      try {
        body = await readJsonBody(
          req as Parameters<typeof readJsonBody>[0],
          COMMUNITY_MAX_BODY_BYTES,
        );
      } catch (error) {
        const status = error instanceof SyntaxError ? 400 : 413;
        sendJson(res, status, {
          error:
            error instanceof Error ? error.message : 'Invalid request body.',
        });
        return;
      }
    }

    shareFirebaseEnv(env);

    const result = await handleCommunity({
      method,
      url: req.url,
      headers: req.headers,
      body,
    });

    sendJson(res, result.status, result.body, result.headers);
  };

  return {
    name: 'higala-community-api',
    configureServer(server) {
      server.middlewares.use('/api/community', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/community', middleware);
    },
    enforce: 'pre',
  } satisfies Plugin;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  shareFirebaseEnv(env);

  return {
    plugins: [
      react(),
      tailwindcss(),
      chatApiPlugin(env),
      communityApiPlugin(env),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
