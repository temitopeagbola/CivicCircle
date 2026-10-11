import AsyncStorage from '@react-native-async-storage/async-storage';
// The React Native build of Firebase Auth (resolved via the "react-native" export condition)
// is the one that exposes AsyncStorage persistence.
import { getReactNativePersistence } from '@firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth } from 'firebase/auth';

import { config } from './config';

/** Native: persist the session in AsyncStorage so users stay signed in across launches. */
export function createAuth(): Auth {
  const existing = getApps().length > 0;
  const app = existing ? getApp() : initializeApp(config.firebase);
  const auth = existing
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  if (config.authEmulatorUrl && !auth.emulatorConfig) {
    connectAuthEmulator(auth, config.authEmulatorUrl, { disableWarnings: true });
  }
  return auth;
}

export const auth = createAuth();
