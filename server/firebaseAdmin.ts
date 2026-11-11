import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { CommunityConfigError } from './communityErrors.ts';

/**
 * Firebase Admin is initialized lazily so the rest of Higala (chat, mood,
 * toolkit) keeps working when community credentials are not configured.
 */

interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let cachedApp: App | null = null;

function usingEmulator(): boolean {
  return Boolean(
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIRESTORE_EMULATOR_HOST,
  );
}

function readServiceAccount(): ServiceAccount | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (
        parsed.project_id &&
        parsed.client_email &&
        parsed.private_key
      ) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      }
    } catch {
      throw new CommunityConfigError(
        'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.',
      );
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

export function getFirebaseApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    'demo-higala';
  const serviceAccount = readServiceAccount();

  if (serviceAccount) {
    cachedApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
    return cachedApp;
  }

  if (usingEmulator()) {
    cachedApp = initializeApp({ projectId });
    return cachedApp;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    cachedApp = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    return cachedApp;
  }

  throw new CommunityConfigError();
}

export function getCommunityFirestore(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getCommunityAuth(): Auth {
  return getAuth(getFirebaseApp());
}
