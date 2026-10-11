import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';

import { config } from './config';

/** Web: Firebase's default browser persistence (IndexedDB) keeps users signed in. */
export function createAuth(): Auth {
  const app = getApps().length ? getApp() : initializeApp(config.firebase);
  const auth = getAuth(app);
  if (config.authEmulatorUrl && !auth.emulatorConfig) {
    connectAuthEmulator(auth, config.authEmulatorUrl, { disableWarnings: true });
  }
  return auth;
}

export const auth = createAuth();
