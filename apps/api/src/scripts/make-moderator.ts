/**
 * Promote an existing user to moderator (or demote with --resident).
 *
 *   npm run make-moderator -- someone@example.com
 *   npm run make-moderator -- someone@example.com --resident
 */
import { loadConfig } from '../config';
import { initFirebase } from '../firebase';

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) throw new Error('Usage: make-moderator <email> [--resident]');
  const role = flag === '--resident' ? 'resident' : 'moderator';
  const { db, auth } = initFirebase(loadConfig().firebase);
  const user = await auth.getUserByEmail(email);
  const ref = db.collection('users').doc(user.uid);
  const existing = await ref.get();
  await ref.set(
    {
      role,
      email,
      isDemo: false,
      ...(existing.exists
        ? {}
        : { displayName: user.displayName ?? email.split('@')[0], createdAt: new Date() }),
    },
    { merge: true },
  );
  console.log(`${email} is now a ${role}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
