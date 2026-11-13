import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ChatValidationError, handleChat } from './chat';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const chat = onRequest(
  {
    region: 'asia-southeast1',
    cors: true,
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: [geminiApiKey],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed. Use POST.' });
      return;
    }

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      try {
        apiKey = geminiApiKey.value();
      } catch {
        // Local emulator without a secret file: demo mode still works.
      }
    }

    try {
      const result = await handleChat(request.body, {
        apiKey,
        model: process.env.GEMINI_MODEL,
      });
      response.set('Cache-Control', 'no-store');
      response.status(200).json(result);
    } catch (error) {
      const status = error instanceof ChatValidationError ? 400 : 500;
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      console.error('[higala] chat function error:', error);
      response.status(status).json({ error: message });
    }
  },
);
