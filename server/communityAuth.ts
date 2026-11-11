import type { IncomingMessage } from 'node:http';
import {
  CommunityAuthError,
  CommunityForbiddenError,
} from './communityErrors.ts';
import { getCommunityAuth } from './firebaseAdmin.ts';

export interface CommunityIdentity {
  uid: string;
  isAdmin: boolean;
}

export interface AuthCarrier {
  headers: IncomingMessage['headers'];
}

function bearerToken(headers: IncomingMessage['headers']): string | null {
  const header = headers.authorization;
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  const [scheme, ...rest] = raw.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  const token = rest.join(' ').trim();
  return token || null;
}

/**
 * Verifies the Firebase ID token and derives the UID from the verified token.
 * Callers must never accept a UID from the request body.
 */
export async function verifyCommunityRequest(
  req: AuthCarrier,
): Promise<CommunityIdentity> {
  const token = bearerToken(req.headers);
  if (!token) {
    throw new CommunityAuthError();
  }

  // Resolve Firebase Admin outside the catch so a missing/misconfigured
  // service account surfaces as a setup error instead of "invalid token".
  const auth = getCommunityAuth();

  try {
    const decoded = await auth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      isAdmin: decoded.admin === true,
    };
  } catch {
    throw new CommunityAuthError(
      'Your community session expired. Reload the page and try again.',
    );
  }
}

export async function requireCommunityAdmin(
  req: AuthCarrier,
): Promise<CommunityIdentity> {
  const identity = await verifyCommunityRequest(req);
  if (!identity.isAdmin) {
    throw new CommunityForbiddenError('Moderator access is required.');
  }
  return identity;
}
