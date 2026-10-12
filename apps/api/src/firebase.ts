import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import type { Config } from './config';

/**
 * Initialise firebase-admin. With *_EMULATOR_HOST env vars set (docker compose, CI) the SDK
 * talks to the local Emulator Suite and needs no credentials.
 */
export function initFirebase(config: Config['firebase']) {
  const app: App =
    getApps()[0] ??
    initializeApp({
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      ...(config.serviceAccount ? { credential: cert(config.serviceAccount) } : {}),
    });

  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() throws if Firestore was already used (e.g. hot reload); safe to ignore.
  }
  return { app, db, auth: getAuth(app), storage: getStorage(app) };
}
