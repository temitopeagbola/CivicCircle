import { afterAll } from 'vitest';

import { loadConfig } from '../config';
import { initFirebase } from '../firebase';
import { storeContract } from './contract';
import { createFirestoreStore } from './firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Run via `npm run test:emulator` so the Firestore emulator is available');
}

const { db, app } = initFirebase(loadConfig({ ...process.env, NODE_ENV: 'test' }).firebase);

async function clearEmulator() {
  // Emulator-only endpoint that wipes every document in the project.
  const res = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${app.options.projectId}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`Failed to clear emulator: ${res.status}`);
}

storeContract('firestore', async () => {
  await clearEmulator();
  return createFirestoreStore(db);
});

afterAll(async () => {
  await db.terminate();
});
