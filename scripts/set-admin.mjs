import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Grant or revoke the `admin: true` custom claim used by the community
 * moderation queue.
 *
 * Usage:
 *   npm run set-admin -- <firebase-anon-uid>
 *   npm run set-admin -- <firebase-anon-uid> --remove
 *
 * Requires Firebase Admin credentials in .env (the same values Vercel uses),
 * Application Default Credentials, or a running Auth emulator.
 */

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const parsed = JSON.parse(raw);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

const args = process.argv.slice(2);
const remove = args.includes('--remove');
const uid = args.find((argument) => !argument.startsWith('--'));

if (!uid) {
  console.error(
    'Usage: npm run set-admin -- <firebase-anon-uid> [--remove]',
  );
  process.exit(1);
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  'demo-higala';
const serviceAccount = readServiceAccount();

let app = getApps()[0];
if (!app) {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    app = initializeApp({ projectId });
  } else if (serviceAccount) {
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  } else {
    app = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }
}

const auth = getAuth(app);
const user = await auth.getUser(uid);
const claims = { ...(user.customClaims ?? {}) };

if (remove) {
  delete claims.admin;
} else {
  claims.admin = true;
}

await auth.setCustomUserClaims(uid, claims);

console.log(
  remove
    ? `Removed moderator access from ${uid}.`
    : `Granted moderator access to ${uid}. Reload the app to pick up the new claim.`,
);
