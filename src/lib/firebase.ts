import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
} from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth';

/**
 * The browser only uses Firebase Authentication (anonymous sign-in). Firestore
 * is never imported here: every community read and write goes through the
 * server so private identifiers never reach the client.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
}

export function getFirebaseClientApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Community sign-in is not configured. Add the VITE_FIREBASE_* environment variables.',
    );
  }
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

let authEmulatorConnected = false;

export function getFirebaseClientAuth(): Auth {
  const auth = getAuth(getFirebaseClientApp());
  if (!authEmulatorConnected) {
    const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
    if (emulatorHost) {
      connectAuthEmulator(auth, `http://${emulatorHost}`, {
        disableWarnings: true,
      });
    }
    authEmulatorConnected = true;
  }
  return auth;
}

let pendingSignIn: Promise<User> | null = null;

export async function ensureAnonymousUser(): Promise<User> {
  const auth = getFirebaseClientAuth();
  if (auth.currentUser) return auth.currentUser;
  if (!pendingSignIn) {
    pendingSignIn = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => {
        pendingSignIn = null;
      });
  }
  return pendingSignIn;
}
