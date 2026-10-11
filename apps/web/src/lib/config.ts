import type { GeoPoint } from '@civiccircle/shared';

/**
 * Build-time configuration. Expo inlines EXPO_PUBLIC_* variables when the bundle is built, so
 * these must be read with direct `process.env.EXPO_PUBLIC_…` access.
 * Defaults target the local Firebase emulators + API from docker compose.
 */
export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787').replace(/\/$/, ''),
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'demo-key',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'demo-civiccircle.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-civiccircle',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? 'demo-app',
  },
  /** e.g. http://localhost:9099 — set only when using the Auth emulator. */
  authEmulatorUrl: process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL ?? '',
  /** Where the map opens when location is unavailable (the seeded demo area). */
  defaultCenter: { lat: 51.5033, lng: -0.0866 } as GeoPoint,
};
