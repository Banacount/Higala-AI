/**
 * Targeted tests for the chat mode prompts. These do not call Gemini; they
 * assert the contract that both text and voice chat rely on: Friendly stays
 * warm, Honest carries the full behavioural spec, and safety overrides tone.
 *
 * Run with Node's TypeScript stripping:
 *   node --experimental-strip-types --import ./server/prompts.test.ts
 */

import assert from 'node:assert';
import { validateChatRequest } from './chat.ts';
import { buildSystemPrompt } from '../src/shared/prompts.ts';

let passed = 0;
let failed = 0;

const pendingTests: Promise<void>[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  pendingTests.push(
    (async () => {
      try {
        await fn();
        passed += 1;
        console.log(`ok - ${name}`);
      } catch (error) {
        failed += 1;
        console.error(`not ok - ${name}`);
        console.error(error instanceof Error ? error.message : String(error));
      }
    })(),
  );
}

// --- Friendly mode stays the default ---------------------------------------

test('friendly prompt keeps the existing friendly directive', () => {
  const prompt = buildSystemPrompt('en', 'none', 'friendly');
  assert.match(prompt, /MODE: FRIENDLY \(default\)/);
  assert.match(prompt, /warm, casual, and supportive/);
  assert.doesNotMatch(prompt, /MODE: HONEST/);
  assert.doesNotMatch(prompt, /brutally honest, compassionate, accountable/);
});

test('omitting the mode defaults to friendly', () => {
  assert.strictEqual(
    buildSystemPrompt('en', 'none'),
    buildSystemPrompt('en', 'none', 'friendly'),
  );
});

// --- Honest mode carries the full behavioural spec -------------------------

test('honest prompt includes the core personality sections', () => {
  const prompt = buildSystemPrompt('en', 'none', 'honest');
  for (const heading of [
    'MODE: HONEST',
    'WHAT YOU PRIORITISE',
    'CHALLENGE REASONING, NOT THE PERSON',
    'SAY THE HARD THING CLEARLY',
    'KEEP COMPASSION',
    'DO NOT VALIDATE WHAT IS NOT TRUE',
    'MAKE IT USABLE',
    'READ THE ROOM',
    'STYLE',
  ]) {
    assert.ok(prompt.includes(heading), `missing section: ${heading}`);
  }
  assert.doesNotMatch(prompt, /MODE: FRIENDLY/);
});

test('honest prompt tells the model not to perform honesty', () => {
  const prompt = buildSystemPrompt('en', 'none', 'honest');
  assert.match(prompt, /Do not announce that you are being honest/);
  assert.match(prompt, /No sarcasm, insults, moralising, or coldness/);
});

test('honest prompt keeps compassion and accountability together', () => {
  const prompt = buildSystemPrompt('en', 'none', 'honest');
  assert.match(prompt, /Pain and responsibility can both be true/);
  assert.match(prompt, /Do not shame them for struggling/);
  assert.match(prompt, /Brutal honesty must never increase risk/);
});

test('honest prompt defers to safety and mode precedence', () => {
  const prompt = buildSystemPrompt('en', 'none', 'honest');
  assert.match(prompt, /SAFETY always overrides everything/);
  assert.match(prompt, /follow this mode/);
});

// --- Language selection still applies in honest mode -----------------------

test('honest mode keeps the selected language instruction', () => {
  const guides = {
    ceb: /selected reply language is Cebuano\/Bisaya/,
    fil: /selected reply language is natural conversational Filipino/,
    en: /selected reply language is natural conversational English/,
  } as const;

  for (const [language, pattern] of Object.entries(guides)) {
    const prompt = buildSystemPrompt(
      language as keyof typeof guides,
      'none',
      'honest',
    );
    assert.match(prompt, pattern);
  }
});

// --- Safety overrides honest mode -----------------------------------------

test('crisis safety override applies in honest mode', () => {
  const prompt = buildSystemPrompt('en', 'crisis', 'honest');
  assert.match(prompt, /SAFETY OVERRIDE — CRISIS/);
  assert.match(prompt, /Never shame, joke, or use Radical Candor/);
});

test('elevated safety override applies in honest mode', () => {
  const prompt = buildSystemPrompt('en', 'elevated', 'honest');
  assert.match(prompt, /SAFETY OVERRIDE — ELEVATED/);
  assert.match(prompt, /Do not use tough love/);
});

// --- Request validation ----------------------------------------------------

test('request validation accepts honest mode', () => {
  const request = validateChatRequest({
    messages: [{ role: 'user', content: 'I keep putting things off.' }],
    language: 'en',
    mode: 'honest',
  });
  assert.strictEqual(request.mode, 'honest');
});

test('request validation defaults to friendly', () => {
  const request = validateChatRequest({
    messages: [{ role: 'user', content: 'Hello.' }],
    language: 'en',
  });
  assert.strictEqual(request.mode, 'friendly');
});

test('request validation ignores an unknown mode', () => {
  const request = validateChatRequest({
    messages: [{ role: 'user', content: 'Hello.' }],
    language: 'en',
    mode: 'aggressive',
  });
  assert.strictEqual(request.mode, 'friendly');
});

void Promise.all(pendingTests).then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
});
