import { fileURLToPath, URL } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { ChatValidationError, handleChat } from './server/chat.ts';
import { handleCommunity } from './server/community.ts';
import {
  PayloadTooLargeError,
  readJsonBody,
  readRawBody,
  sendJson,
} from './server/http.ts';
import { MultipartError, parseMultipartForm } from './server/multipart.ts';
import {
  MAX_VOICE_AUDIO_BYTES,
  VoiceUnavailableError,
  VoiceValidationError,
  handleVoiceChat,
} from './server/voice.ts';

const MAX_BODY_BYTES = 1_000_000;

const COMMUNITY_MAX_BODY_BYTES = 64 * 1024;

const VOICE_MAX_BODY_BYTES = 3_500_000;

const VOICE_MAX_FIELD_BYTES = 128 * 1024;

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

function voiceApiPlugin(env: Record<string, string>): Plugin {
  const middleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    _next: (error?: unknown) => void,
  ) => {
    if (req.method !== 'POST') {
      sendJson(
        res,
        405,
        { error: 'Method not allowed. Use POST.' },
        { Allow: 'POST' },
      );
      return;
    }

    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      sendJson(res, 415, {
        error: 'Content-Type must be multipart/form-data.',
      });
      return;
    }

    try {
      const contentLength = Number(req.headers['content-length'] ?? 0);
      if (
        Number.isFinite(contentLength) &&
        contentLength > VOICE_MAX_BODY_BYTES
      ) {
        sendJson(res, 413, { error: 'The voice message is too large.' });
        return;
      }

      const body = await readRawBody(
        req as Parameters<typeof readRawBody>[0],
        VOICE_MAX_BODY_BYTES,
      );
      const form = parseMultipartForm(body, contentType, {
        maxFileBytes: MAX_VOICE_AUDIO_BYTES,
        maxFieldBytes: VOICE_MAX_FIELD_BYTES,
        maxFiles: 1,
      });
      const result = await handleVoiceChat(form, {
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
      });
      sendJson(res, 200, result);
    } catch (error) {
      if (
        error instanceof VoiceValidationError ||
        error instanceof ChatValidationError ||
        error instanceof MultipartError ||
        error instanceof SyntaxError
      ) {
        sendJson(res, 400, { error: error.message });
        return;
      }
      if (error instanceof PayloadTooLargeError) {
        sendJson(res, 413, { error: 'The voice message is too large.' });
        return;
      }
      if (error instanceof VoiceUnavailableError) {
        sendJson(res, 503, { error: error.message });
        return;
      }
      sendJson(res, 500, {
        error: 'The support service is unavailable right now.',
      });
    }
  };

  return {
    name: 'higala-voice-api',
    configureServer(server) {
      server.middlewares.use('/api/voice-chat', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/voice-chat', middleware);
    },
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
      voiceApiPlugin(env),
      communityApiPlugin(env),
    ],
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
