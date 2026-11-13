# Higala-AI

> **Higalaay, dili yes-man.**
> A 24/7, dialect-aware crisis first responder and psychological support web app for Kagay-anons.

Higala-AI is a green-themed, mobile-first companion built with **Gemini 3** and deployed on **Vercel**. It talks like a grounded friend from Cagayan de Oro—warm, direct, and unwilling to agree just to keep the peace. It supports **Bisaya/Cebuano**, **Filipino/Tagalog**, and **English**, and it keeps the hard parts of the conversation visible.

The original brief describes a tool that is not another passive, overly agreeable chatbot. Higala is designed around **radical candor**: it validates the feeling, challenges the distorted story, names harmful choices, and still stays in your corner.

---

## What it does

- **Conversations that sound human** — replies follow the user's length, language, and mood instead of a template. Higala listens before advising, avoids stock therapy phrases, and asks a question only when it actually helps.
- **No-yes-man conversations** — the agent can gently push back, name avoidance or harmful behaviour, and ask for a concrete next step instead of offering empty reassurance.
- **Dialect-aware replies** — Kagay-anon Cebuano, natural Filipino, or English, selected in Settings or in the chat header. Code-switching follows the way the user writes, and changing the selector mid-conversation switches the next reply immediately.
- **Crisis-first safety** — client-side and server-side screening catch direct self-harm and suicide language. A crisis strip, one-tap crisis modal, and verified Philippine hotlines are always within reach.
- **Structured psychological tools** — box breathing, 5-4-3-2-1 grounding, CBT thought records, a 90-second anger pause, a safety plan, and a mood check-in.
- **Mood tracking** — daily check-ins, tags, notes, a 7-day chart, a streak, and a plain-language read on the week.
- **Local-first personal data** — profile, moods, thought records, safety plan, and chat history live in `localStorage`. Anonymous Sharing adds a separate server-side community, but that local data is never attached to posts.
- **Anonymous Sharing (Phase 1)** — a moderated community feed where signed-in anonymous accounts can publish uncategorized or categorized reflections, browse by category, read a post, delete their own post, report unsafe content, and accept the community guidelines before their first post.
- **Offline/demo mode** — without a Gemini API key, a rule-based Higala response engine keeps the app usable and testable. These replies are labelled `Demo`, never passed off as live AI.
- **Data ownership** — export everything as JSON or clear individual data types (or everything) from Settings. Settings also deletes all of your community data.

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
| Auth (community) | Firebase Anonymous Auth |
| Database (community) | Firestore via Firebase Admin SDK (server only) |
| Server (dev) | Vite middleware at `/api/chat`, `/api/voice-chat`, and `/api/community` |
| Server (prod) | Vercel Functions `api/chat.ts`, `api/voice-chat.ts`, and `api/community.ts` |
| Hosting | Vercel |

The Gemini key is **server-side only**. It is read from `GEMINI_API_KEY` by the dev middleware and by the Vercel Function environment. It is never exposed as a `VITE_` variable. Firebase Admin credentials are also server-only; the browser only receives the public Firebase client configuration needed for anonymous sign-in.

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

Voice messages still need a Gemini key because transcription requires the live model; without one, the voice endpoint returns a clear "not configured" message and the text chat continues in demo mode.

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
| `npm run dev` | Start Vite with the `/api/chat`, `/api/voice-chat`, and `/api/community` dev middleware. |
| `npm run build` | Type-check and build the client into `dist/`. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run preview` | Preview the production build (the chat middleware is also attached to preview). |
| `npm run build:functions` | Bundle `server/functions.ts` into `functions/lib/index.js` with esbuild. |
| `npm run build:all` | Build the client and the Cloud Function. |
| `npm run deploy` | Build everything, then run `firebase deploy`. |
| `npm run deploy:rules` | Deploy `firestore.rules` and `firestore.indexes.json` with the Firebase CLI. |
| `npm run emulators` | Start the Firebase Auth and Firestore emulators for local community testing. |
| `npm run set-admin -- <uid>` | Grant the `admin: true` custom claim used by the moderation queue. Add `--remove` to revoke it. |

---

## Project structure

```text
api/
  chat.ts            Vercel Function adapter for `/api/chat`
  voice-chat.ts      Vercel Function adapter for `/api/voice-chat` (multipart)
  community.ts       Vercel Function adapter for `/api/community`
server/
  chat.ts            Shared Gemini handler, validation, safety, offline fallback
  voice.ts           Audio validation, Gemini transcription, transcript + reply
  multipart.ts       Bounded multipart/form-data reader for voice uploads
  community.ts       Shared community handler: auth, validation, rate limits, DTOs
  communityAuth.ts   Firebase ID-token verification and admin claims
  communityStore.ts  Admin-SDK Firestore reads/writes, cursors, moderation
  communityValidation.ts  Server-side input validation and limits
  communityModeration.ts  Rule-based policy checks (crisis kept separate)
  firebaseAdmin.ts   Lazy Firebase Admin initialization
  http.ts            Shared JSON/body/rate-limit helpers for community adapters
  functions.ts       Legacy Firebase Function adapter for chat
src/
  components/        Layout, chat, tools, home cards, UI primitives
  components/community/  Feed, post, report, guidelines, and safety pieces
  context/           Local personal data, crisis state, anonymous auth
  hooks/             Local storage, chat state, community feed/post loading
  lib/               Constants, chat client, community client, Firebase client
  pages/             Home, Chat, Community, Toolkit, Mood, Resources, Settings
  shared/            Types, prompts, safety rules, community types/guidelines
scripts/
  build-functions.mjs
  set-admin.mjs      Grant or revoke the moderator custom claim
functions/
  package.json       Legacy Cloud Function package manifest
  lib/               Generated bundle (gitignored)
firestore.rules      Deny-all client access; Admin SDK is the only path
firestore.indexes.json  Feed, report, and moderation composite indexes
firebase.json        Legacy Hosting/Function config plus Firestore rules/indexes
```

### Request flow

```text
Browser
  └─ POST /api/chat
       ├─ Vite dev/preview middleware (local)
       ├─ Firebase Function `chat` (legacy Firebase production)
       └─ Vercel Function `api/chat.ts` (Vercel production)
            └─ handleChat()
                 ├─ validate input + screen the last user message
                 ├─ Gemini 3 with a JSON response schema
                 │    { message, challenge, suggestedTool, riskLevel }
                 ├─ retry transient errors, then try gemini-3.5-flash-lite
                 └─ demo reply if no key / Gemini fails
```

### Voice message flow

```text
Browser (MediaRecorder)
  └─ POST /api/voice-chat   multipart: audio + history + language + risk
       └─ Vercel Function `api/voice-chat.ts` (Vite middleware locally)
            ├─ validate MIME from magic bytes, size, declared duration
            ├─ Gemini transcribes the audio in the spoken language
            ├─ replay the transcript through handleChat()
            └─ return { transcript, message, challenge, tool, risk, demo? }
```

Audio is kept in memory only and played back from a session-scoped `blob:`
URL. The transcript is stored in the existing chat history (localStorage); the
audio itself is never written to Firestore, localStorage, or a storage bucket.

The server never trusts the client's risk assessment alone: it screens the last user message again and takes the maximum of the client's and server's risk level. The model's own risk output is also merged conservatively.

---

## Anonymous Sharing (Phase 1)

Anonymous Sharing is a separate, moderated community surface. It does **not** move or attach any personal Higala data (profile, moods, thought records, safety plan, chat) to community posts.

### Architecture

```text
Browser (Firebase Anonymous Auth only)
  └─ GET/POST /api/community  (Authorization: Bearer <Firebase ID token>)
       ├─ Vite dev/preview middleware (local)
       └─ Vercel Function api/community.ts (production)
            └─ handleCommunity()
                 ├─ verify the Firebase ID token and derive the UID
                 ├─ read the admin custom claim for moderation
                 ├─ validate input + rate-limit by UID in Firestore
                 ├─ screen crisis separately from policy moderation
                 ├─ read/write Firestore through the Firebase Admin SDK
                 └─ return sanitized public DTOs
```

The browser **never** imports the Firestore client SDK. `firestore.rules` denies every client read and write; the Admin SDK is the only path to the data. Responses never include `authorId`, `reporterId`, the Firebase UID, email, or profile data. Ownership is expressed only as a server-computed `isMine` boolean.

### What Phase 1 includes

- Anonymous post creation with optional title, required content, and optional category.
- Anonymous feed with category filters and cursor pagination.
- Individual post view.
- Delete your own post (server-checked ownership; content is redacted).
- Community guidelines shown and accepted before the first post.
- Basic reporting of posts with private reporter identity and duplicate-report prevention.
- A minimal moderator queue: hide, restore, and dismiss reports.
- Private crisis screening that never treats suicidal or self-harm expression as a guideline violation and never auto-removes it.
- A Settings control that deletes all of your community data.

Phase 2 interactions (supportive reactions and anonymous replies) are intentionally **not** implemented yet. The data shape and DTOs leave room for them.

### Firestore collections

| Collection | Purpose |
| --- | --- |
| `communityPosts/{postId}` | Public post fields plus private `authorId`, `riskLevel`, review flags |
| `communityReports/{postId}_{uid}` | One report per member per post; private `reporterId` |
| `communityMembers/{uid}` | Guidelines acceptance and UID-based rate-limit windows |

Reply and reaction subcollections are reserved for Phase 2. `communityPosts/.../replies` and `.../reactions` are not read or written yet.

### Firebase services to configure

1. **Authentication → Sign-in method → Anonymous** — enable it.
2. **Firestore Database** — create the database (production mode is fine; the app's rules deny direct client access anyway).
3. Deploy the rules and indexes from this repo:

```bash
firebase login
firebase use --add          # select the project once
npm run deploy:rules
```

Do **not** deploy Firebase Hosting or a community Cloud Function for this feature. Vercel serves the app and runs `api/community.ts`; Firebase provides only Anonymous Auth and Firestore.

### Environment variables for Vercel

Client (public, but still configure them as Vercel environment variables):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Server (never prefix these with `VITE_`):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (keep the newlines; literal `\n` is also accepted)
- or `FIREBASE_SERVICE_ACCOUNT_JSON` with the full service-account JSON

Create the service account in **Firebase console → Project settings → Service accounts → Generate new private key**. Grant it only the access it needs (Firebase Admin SDK / Cloud Datastore access). Store the values in **Vercel → Project Settings → Environment Variables** for Production, Preview, and Development. Redeploy after changing them.

### Local development and testing

**Option A — real Firebase project.** Put the client and Admin values in `.env` (copy `.env.example`). The Vite dev server exposes `/api/community` through middleware, so `npm run dev` exercises the same handler Vercel uses.

**Option B — emulators.**

```bash
npm run emulators
```

In `.env`, use dummy client values plus the emulator hosts:

```dotenv
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=demo-higala
VITE_FIREBASE_APP_ID=demo-app
VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_PROJECT_ID=demo-higala
```

Then `npm run dev`. Visit `/community`, accept the guidelines, publish a post, open it, report it from a second anonymous browser profile, and check `/community/moderation` after granting a moderator claim:

```bash
npm run set-admin -- <anonymous-uid>
```

The anonymous UID is visible in the Firebase Auth emulator UI, not in the public app.

### Privacy and moderation behaviour

- Post authors are shown as `Anonymous`; replies (Phase 2) will show `Anonymous friend`.
- Crisis screening reuses `src/shared/safety.ts`. A crisis signal sets a **private** `riskLevel` and a review flag for moderators, shows the author compassionate support resources, and never becomes a policy violation.
- Ordinary policy checks block only high-confidence threats and encouragement of self-harm. Personal-information and dangerous-advice matches are flagged for human review instead of being silently removed.
- Reporting never auto-hides a post. Repeated reports flag it for a moderator, which reduces brigading.
- Moderation actions require the Firebase custom claim `admin: true`. The queue is at `/community/moderation`.
- Anonymous publishing is not absolute anonymity against platform operators, infrastructure providers, or legally required disclosures. The UI states this before publishing, and users are warned not to post names, addresses, phone numbers, or other identifying details.

### Known community limitations

- Anonymous identity is device-bound. Clearing browser storage loses the anonymous account and the ability to manage old posts.
- Firestore and Firebase Auth are still external infrastructure; content is readable by the server and by operators with credentials.
- The moderation queue is minimal and still needs a human moderator. Reports do not resolve themselves.
- UID-based rate limits can be bypassed by creating new anonymous accounts. Vercel/platform rate limiting and Firebase App Check are the next hardening steps.

---

## Firebase deployment

Vercel is the primary deployment for Higala, including Anonymous Sharing. This
section is kept for deployments that still use Firebase Hosting for the
chat-only app. Anonymous Sharing is **not** deployed through Firebase Hosting or
Cloud Functions; it runs in `api/community.ts` on Vercel.

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

Vercel needs **server-side functions** for the Gemini call and for the
community. The browser only knows about `/api/chat` and `/api/community`; it
must never receive the Gemini key or Firebase Admin credentials. `api/chat.ts`
and `api/community.ts` are those functions, and Vercel detects them
automatically because they live in the root `api/` directory.

1. Import the repository in Vercel. The Vite preset builds the client into
   `dist/`; no build override is required.
2. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` — your Gemini key. **Do not** prefix it with `VITE_`.
   - `GEMINI_MODEL` — optional; defaults to `gemini-3.5-flash`.
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
     `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` — the public Firebase
     client config for Anonymous Auth.
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
     (or `FIREBASE_SERVICE_ACCOUNT_JSON`) — **server-only** Admin credentials.
3. Apply the variables to **Production**, **Preview**, and **Development**.
4. Redeploy. Environment variable changes only take effect on a new deployment.

`vercel.json` sets a longer duration for `api/chat.ts` and a shorter one for the
community function. The SPA catch-all rewrite still applies to normal routes.

> **Why `overrides.jose` exists:** `firebase-admin@14` → `jwks-rsa@4` → `jose@6`,
> and jose 6 is ESM-only. Vercel's CommonJS function runtime cannot `require()`
> it, which crashes the function at startup with `ERR_REQUIRE_ESM`.
> `package.json` pins `jwks-rsa`'s `jose` to 5.x, which ships a CommonJS build and
> is API-compatible with the only two functions jwks-rsa uses (`importJWK` and
> `exportSPKI`). Do not remove the override while `firebase-admin` depends on
> `jwks-rsa@4`.

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

**Personal Higala data** is stored locally under these keys:

| Key | Data |
| --- | --- |
| `higala.profile.v1` | Name and language |
| `higala.mood.v1` | Mood check-ins, tags, notes |
| `higala.thoughts.v1` | Thought records |
| `higala.safety.v1` | Safety plan |
| `higala.chat.v1` | Last 80 chat messages |

When a live Gemini key is configured, chat messages are sent to Google's Gemini API to generate a response. The rest of the personal data stays in the browser and is never attached to community posts. There are no analytics or advertising scripts in the app. Settings includes a JSON export and clear controls.

**Anonymous Sharing data** is different:

- Posts, reports, and guidelines acceptance are stored in Firestore.
- Each record is linked only to a random Firebase Anonymous Auth UID.
- The browser never reads or writes Firestore directly; deny-all rules block it.
- API responses omit `authorId`, `reporterId`, the UID, email, and profile data. Authorship is exposed only as a server-computed `isMine` boolean.
- Settings → **Anonymous Sharing data → Delete my community data** removes your posts, reports, and guidelines acceptance. It does not touch local personal data.
- Anonymous publishing does not guarantee anonymity against platform operators, infrastructure providers, or legally required disclosures. Avoid posting identifying details about yourself or anyone else.

Crisis screening and ordinary moderation are separate. Distress, grief, and
suicidal thoughts are never treated as guideline violations and are never
auto-removed. They surface support resources and create a private review flag so
a moderator can offer help.

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
- Anonymous community identity is device-bound. Clearing browser storage loses the ability to manage old posts.
- Community moderation is human-dependent. Reports only help when someone reviews them.
- AI-assisted moderation is not part of Phase 1; the current policy checks are rule-based and intentionally conservative.
- The app has not been clinically validated. A production mental-health deployment should involve licensed professionals, local safeguarding review, and a clear escalation path.
- Vercel deployment requires your own project, Firebase Auth/Firestore configuration, and a Gemini API key.
