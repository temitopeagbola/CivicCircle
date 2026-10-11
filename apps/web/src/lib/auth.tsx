import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { MeDTO } from '@civiccircle/shared';

import { api, setTokenGetter } from './api';
import { auth } from './firebase';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  user: User | null;
  /** Profile from the API (role, display name). Null until loaded. */
  me: MeDTO | null;
  isModerator: boolean;
  signInDemo(as: 'resident' | 'moderator'): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(displayName: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

setTokenGetter(async () => (auth.currentUser ? auth.currentUser.getIdToken() : null));

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/email-already-in-use': 'An account with that email already exists. Try signing in.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

/** Turn Firebase Auth errors into friendly copy. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && FIREBASE_MESSAGES[code]) return FIREBASE_MESSAGES[code];
  return error instanceof Error ? error.message : 'Sign-in failed. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [status, setStatus] = useState<Status>(auth.currentUser ? 'signedIn' : 'loading');

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        setStatus(next ? 'signedIn' : 'signedOut');
        if (!next) queryClient.clear();
      }),
    [queryClient],
  );

  const meQuery = useQuery({
    queryKey: ['me', user?.uid],
    queryFn: api.me,
    enabled: status === 'signedIn',
    staleTime: 5 * 60_000,
  });

  const signInDemo = useCallback(async (as: 'resident' | 'moderator') => {
    const { customToken } = await api.demoLogin(as);
    await signInWithCustomToken(auth, customToken);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(
    async (displayName: string, email: string, password: string) => {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: displayName.trim() });
      const me = await api.updateMe(displayName.trim());
      queryClient.setQueryData(['me', credential.user.uid], me);
    },
    [queryClient],
  );

  const signOut = useCallback(() => firebaseSignOut(auth), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      me: meQuery.data ?? null,
      isModerator: meQuery.data?.role === 'moderator',
      signInDemo,
      signIn,
      signUp,
      signOut,
    }),
    [status, user, meQuery.data, signInDemo, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
