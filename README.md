# Higala-AI

> **Higalaay, dili yes-man.**
> A 24/7, dialect-aware crisis first responder and psychological support web app for Kagay-anons.

Higala-AI is a green-themed, mobile-first companion built with **Gemini 3** and **Firebase Hosting**. It talks like a grounded friend from Cagayan de Oro—warm, direct, and unwilling to agree just to keep the peace. It supports **Bisaya/Cebuano**, **Filipino/Tagalog**, and **English**, and it keeps the hard parts of the conversation visible.

The original brief describes a tool that is not another passive, overly agreeable chatbot. Higala is designed around **radical candor**: it validates the feeling, challenges the distorted story, names harmful choices, and still stays in your corner.

---

## What it does

- **Conversations that sound human** — replies follow the user's length, language, and mood instead of a template. Higala listens before advising, avoids stock therapy phrases, and asks a question only when it actually helps.
- **No-yes-man conversations** — the agent can gently push back, name avoidance or harmful behaviour, and ask for a concrete next step instead of offering empty reassurance.
- **Dialect-aware replies** — Kagay-anon Cebuano, natural Filipino, or English, selected in Settings or in the chat header. Code-switching follows the way the user writes.
- **Crisis-first safety** — client-side and server-side screening catch direct self-harm and suicide language. A crisis strip, one-tap crisis modal, and verified Philippine hotlines are always within reach.
- **Structured psychological tools** — box breathing, 5-4-3-2-1 grounding, CBT thought records, a 90-second anger pause, a safety plan, and a mood check-in.
- **Mood tracking** — daily check-ins, tags, notes, a 7-day chart, a streak, and a plain-language read on the week.
- **Local-first privacy** — profile, moods, thought records, safety plan, and chat history live in `localStorage`. There is no account and no database.
- **Offline/demo mode** — without a Gemini API key, a rule-based Higala response engine keeps the app usable and testable. These replies are labelled `Demo`, never passed off as live AI.
- **Data ownership** — export everything as JSON or clear individual data types (or everything) from Settings.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Icons | lucide-react |
| Markdown | react-markdown + remark-gfm |
| AI | Gemini 3 via `@google/genai` |
| Server (dev) | Vite middleware at `/api/chat` |
| Server (prod) | Firebase Cloud Function `chat`, or Vercel Function `api/chat.ts` |
| Hosting | Firebase Hosting or Vercel |

The Gemini key is **server-side only**. It is read from `GEMINI_API_KEY` by the dev middleware and by the Cloud Function secret in production. It is never exposed as a `VITE_` variable.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://127.0.0.1:5173>.

### Without a Gemini key

Leave `GEMINI_API_KEY` empty. The app runs in **demo mode**: the shared demo engine chooses a Bisaya, Filipino, or English response based on the message category and the risk screen. The UI shows a small `Demo` badge on those messages.

### With a Gemini key

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Put it in `.env`:

   ```dotenv
   GEMINI_API_KEY=your-key-here
   GEMINI_MODEL=gemini-3.5-flash
   ```

3. Restart `npm run dev`.

`GEMINI_MODEL` is optional. The default is `gemini-3.5-flash`. If the configured model is rate-limited or unavailable, the server retries, then falls back to `gemini-3.5-flash-lite`. If every live attempt fails, the app tells the user the live service is unavailable and labels any offline reply as `Demo` instead of quietly swapping in a scripted answer.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Vite with the `/api/chat` dev middleware. |
| `npm run build` | Type-check and build the client into `dist/`. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run preview` | Preview the production build (the chat middleware is also attached to preview). |
| `npm run build:functions` | Bundle `server/functions.ts` into `functions/lib/index.js` with esbuild. |
| `npm run build:all` | Build the client and the Cloud Function. |
| `npm run deploy` | Build everything, then run `firebase deploy`. |

---

## Project structure

```text
api/
  chat.ts            Vercel Function adapter for `/api/chat`
server/
  chat.ts            Shared Gemini handler, validation, safety, offline fallback
  functions.ts       Firebase Function adapter and secret binding
src/
  components/        Layout, chat, tools, home cards, UI primitives
  context/           Profile, mood, thought record, safety plan, crisis state
  hooks/             Local storage and chat state
  lib/               Constants, chat client, formatting helpers
  pages/             Home, Chat, Toolkit, Mood, Resources, Settings
  shared/            Types, prompt, safety rules, demo response engine
scripts/
  build-functions.mjs
functions/
  package.json       Cloud Function package manifest
  lib/               Generated bundle (gitignored)
firebase.json        Hosting rewrites, headers, function config
```

### Request flow

```text
Browser
  └─ POST /api/chat
       ├─ Vite dev/preview middleware (local)
       ├─ Firebase Function `chat` (Firebase production)
       └─ Vercel Function `api/chat.ts` (Vercel production)
            └─ handleChat()
                 ├─ validate input + screen the last user message
                 ├─ Gemini 3 with a JSON response schema
                 │    { message, challenge, suggestedTool, riskLevel }
                 ├─ retry transient errors, then try gemini-3.5-flash-lite
                 └─ demo reply if no key / Gemini fails
```

The server never trusts the client's risk assessment alone: it screens the last user message again and takes the maximum of the client's and server's risk level. The model's own risk output is also merged conservatively.

---

## Firebase deployment

The repo is wired for Firebase Hosting plus one Cloud Function. `.firebaserc` currently contains the placeholder project `higala-ai`; change it to your project.

### 1. Install and sign in

```bash
npm install -g firebase-tools
firebase login
```

### 2. Select your project

```bash
firebase use --add
```

Choose the Firebase project and give it the alias `default` (or edit `.firebaserc` directly).

Enable **Hosting** and **Cloud Functions** in the Firebase console. The function uses Node.js 22.

### 3. Store the Gemini key as a secret

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Paste the key when prompted.

Optionally set a different model by creating `functions/.env` before deploying:

```dotenv
GEMINI_MODEL=gemini-3.5-flash
```

The code reads `GEMINI_MODEL` from the function environment. The default is `gemini-3.5-flash`.

### 4. Deploy

```bash
npm --prefix functions install
npm run deploy
```

`firebase.json` does the following:

- serves `dist/` as the Hosting public directory;
- rewrites `/api/chat` to the `chat` function in `asia-southeast1`;
- rewrites every other route to `index.html` for client-side routing;
- sets basic security headers and long-lived caching for static assets.

If you only want to deploy one side:

```bash
npm run build && firebase deploy --only hosting
npm run build:functions && firebase deploy --only functions
```

---

## Vercel deployment

Vercel needs a **server-side function** for the Gemini call. The browser only
knows about `/api/chat`; it must never receive the API key. `api/chat.ts` is that
function, and Vercel detects it automatically because it lives in the root
`api/` directory.

1. Import the repository in Vercel. The Vite preset builds the client into
   `dist/`; no build override is required.
2. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` — your Gemini key. **Do not** prefix it with `VITE_`.
   - `GEMINI_MODEL` — optional; defaults to `gemini-3.5-flash`.
3. Apply the variables to **Production**, **Preview**, and **Development**.
4. Redeploy. Environment variable changes only take effect on a new deployment.

Verify the function directly:

```bash
curl -i https://your-app.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"language":"en","riskLevel":"none","messages":[{"role":"user","content":"Hello"}]}'
```

A working deployment returns `application/json` with a `message` and
`"demo": false`. If it returns `text/html` (the SPA shell), the function was not
built or deployed.

`vercel.json` keeps the SPA catch-all rewrite, but Vercel checks the filesystem
and deployed functions before applying rewrites, so `api/chat.ts` is not
shadowed by `/index.html`.

### Server-side protection

The Vercel adapter does not trust the client:

- only `POST` is accepted (`405` otherwise);
- browser cross-origin calls are rejected (`403`) by comparing `Origin` with the
  request host;
- the body must be `application/json` (`415`) and no larger than 1 MB (`413`);
- each client IP gets a small in-memory rate limit (`429` with `Retry-After`);
- `GEMINI_API_KEY` stays in the function environment;
- the shared handler re-validates the payload and re-screens the last user
  message, taking the maximum of the client's and server's risk assessment.

The in-memory rate limit is per serverless instance, so it is a speed bump, not
a global quota. For a public production deployment, also enable Vercel's
platform rate limiting (or put a shared store such as Upstash Redis in front of
the route).

## Privacy and data

Stored locally under these keys:

| Key | Data |
| --- | --- |
| `higala.profile.v1` | Name and language |
| `higala.mood.v1` | Mood check-ins, tags, notes |
| `higala.thoughts.v1` | Thought records |
| `higala.safety.v1` | Safety plan |
| `higala.chat.v1` | Last 80 chat messages |

When a live Gemini key is configured, chat messages are sent to Google's Gemini API to generate a response. Everything else stays in the browser. There are no analytics or advertising scripts in the app. Settings includes a JSON export and clear controls.

---

## Safety disclaimer

Higala is **peer support, not a therapist, psychiatrist, or emergency service**. It cannot diagnose, prescribe, monitor you between sessions, or guarantee safety. If you or someone else is in immediate danger, call **911** or **NCMH 1553**.

The crisis numbers bundled in the app are:

- NCMH Crisis Hotline — **1553**
- NCMH mobile — **0919 057 1553**
- Hopeline Philippines — **(02) 8804 4673**
- Tawag Paglaum – Centro Bisaya — **0939 937 5433**
- Emergency — **911**

Numbers can change. If a line does not answer, call 911 or go to the nearest emergency room.

---

## Known limitations

- Crisis screening is pattern-based and deliberately conservative; it is not a clinical risk assessment.
- The AI can be wrong. It should not be used as the only support for someone in crisis.
- Chat history and tools are per-browser. There is no cross-device sync by design.
- The app has not been clinically validated. A production mental-health deployment should involve licensed professionals, local safeguarding review, and a clear escalation path.
- Firebase deployment requires your own project, billing for Cloud Functions, and a Gemini API key.
