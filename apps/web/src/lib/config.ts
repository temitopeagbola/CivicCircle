import type { GeoPoint } from '@civiccircle/shared';

/**
 * Build-time configuration. Expo inlines EXPO_PUBLIC_* variables when the bundle is built, so
 * these must be read with direct `process.env.EXPO_PUBLIC_…` access.
 * Defaults target the local Firebase emulators + API from docker compose.
 */
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-civiccircle';

export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787').replace(/\/$/, ''),
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'demo-key',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'demo-civiccircle.firebaseapp.com',
    projectId,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? 'demo-app',
  },
  /**
   * Auth emulator origin. "demo-*" projects only exist in the emulators, so default to the
   * local one for them; real projects leave this empty.
   */
  authEmulatorUrl:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL ??
    (projectId.startsWith('demo-') ? 'http://127.0.0.1:9099' : ''),
  /** Where the map opens when location is unavailable (the seeded demo area). */
  defaultCenter: { lat: 51.5033, lng: -0.0866 } as GeoPoint,
};
