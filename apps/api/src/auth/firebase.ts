import type { Auth } from 'firebase-admin/auth';

export interface VerifiedToken {
  uid: string;
  email: string | null;
  name: string | null;
}

export interface AuthService {
  verifyIdToken(token: string): Promise<VerifiedToken>;
  /** Ensure the Firebase Auth user exists and mint a custom token the client can sign in with. */
  createDemoToken(uid: string, displayName: string): Promise<string>;
}

export function createFirebaseAuthService(auth: Auth): AuthService {
  return {
    async verifyIdToken(token) {
      const decoded = await auth.verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        name: (decoded.name as string | undefined) ?? null,
      };
    },
    async createDemoToken(uid, displayName) {
      try {
        await auth.getUser(uid);
      } catch (err) {
        if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
        await auth.createUser({ uid, displayName });
      }
      return auth.createCustomToken(uid, { demo: true });
    },
  };
}
