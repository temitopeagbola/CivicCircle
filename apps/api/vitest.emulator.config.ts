import { defineConfig } from 'vitest/config';

// Runs the store contract suite against the Firestore/Storage emulators.
// Use `npm run test:emulator` from the repo root, which wraps this in `firebase emulators:exec`.
export default defineConfig({
  test: {
    include: ['src/**/*.emulator.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
  },
});
