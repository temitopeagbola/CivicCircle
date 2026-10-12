/**
 * Seed demo users and ~16 reports around London Bridge.
 *
 *   npm run seed                  # replace the seed-* reports, keep user-created ones
 *   npm run seed -- --reset       # wipe ALL reports first (asks for --yes outside the emulator)
 *
 * Uses the same mock classifier, hashed embeddings and duplicate detection as the API, so
 * seeded data looks exactly like reports created without an OpenAI key. Never calls OpenAI.
 */
import type { DuplicateMatch, StatusChange } from '@civiccircle/shared';

import { classifyText } from '../ai/mock';
import { HASH_EMBEDDING_MODEL, HASH_SIMILARITY_THRESHOLD, hashEmbedding } from '../ai/text';
import { loadConfig } from '../config';
import { findDuplicates } from '../domain/duplicates';
import { geohashFor } from '../domain/geo';
import { initFirebase } from '../firebase';
import { createFirebasePhotoStorage } from '../storage/photos';
import type { ReportRecord } from '../store/types';
import { SEED_REPORTS, SEED_USERS } from './seed-data';
import { renderSeedPhoto } from './seed-photos';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

async function main() {
  const args = new Set(process.argv.slice(2));
  const config = loadConfig();
  const { db, auth, storage } = initFirebase(config.firebase);
  const photos = createFirebasePhotoStorage(
    storage,
    config.firebase.storageBucket,
    config.firebase.storagePublicUrl,
  );
  const target = config.firebase.usingEmulators
    ? 'emulator'
    : `project ${config.firebase.projectId}`;
  console.log(`Seeding ${target}…`);

  if (args.has('--reset') && !config.firebase.usingEmulators && !args.has('--yes')) {
    throw new Error('--reset on a real project deletes every report. Re-run with --reset --yes.');
  }

  const users = new Map(SEED_USERS.map((u) => [u.id, u]));
  for (const user of SEED_USERS) {
    if (user.isDemo) {
      try {
        await auth.getUser(user.id);
      } catch {
        await auth.createUser({ uid: user.id, displayName: user.displayName });
      }
    }
    await db
      .collection('users')
      .doc(user.id)
      .set(
        {
          displayName: user.displayName,
          role: user.role,
          email: null,
          isDemo: user.isDemo,
          createdAt: new Date(Date.now() - 30 * DAY),
        },
        { merge: true },
      );
  }

  const reports = db.collection('reports');
  if (args.has('--reset')) {
    await db.recursiveDelete(reports);
  } else {
    await Promise.all(SEED_REPORTS.map((r) => db.recursiveDelete(reports.doc(r.id))));
  }

  const now = Date.now();
  const created: ReportRecord[] = [];
  const ordered = [...SEED_REPORTS].sort((a, b) => b.daysAgo - a.daysAgo);

  for (const [index, seed] of ordered.entries()) {
    const author = users.get(seed.author)!;
    const moderator = users.get('demo-moderator')!;
    const createdAt = new Date(now - seed.daysAgo * DAY + index * 60_000);
    const classification = classifyText(`${seed.description}. ${seed.address}`);
    if (classification.category !== seed.expectedCategory) {
      throw new Error(
        `${seed.id}: classifier said ${classification.category}, expected ${seed.expectedCategory}`,
      );
    }

    const location = { lat: seed.lat, lng: seed.lng };
    const embedding = hashEmbedding(seed.description);
    const duplicates: DuplicateMatch[] = findDuplicates(
      {
        location,
        category: classification.category,
        text: seed.description,
        embedding,
        embeddingModel: HASH_EMBEDDING_MODEL,
        similarityThreshold: HASH_SIMILARITY_THRESHOLD,
      },
      created,
      createdAt,
    );

    const statusHistory: StatusChange[] = [
      {
        status: 'open',
        by: { id: author.id, displayName: author.displayName },
        at: createdAt.toISOString(),
      },
      ...(seed.history ?? []).map((h) => ({
        status: h.status,
        ...(h.note ? { note: h.note } : {}),
        by: { id: moderator.id, displayName: moderator.displayName },
        at: new Date(createdAt.getTime() + h.hoursLater * HOUR).toISOString(),
      })),
    ];
    const comments = seed.comments ?? [];
    const lastActivity = Math.max(
      createdAt.getTime(),
      ...statusHistory.map((s) => Date.parse(s.at)),
      ...comments.map((c) => createdAt.getTime() + c.hoursLater * HOUR),
    );

    const photo = await photos.save(
      `seed/${seed.id}.jpg`,
      await renderSeedPhoto(classification.category),
      'image/jpeg',
    );

    const record: ReportRecord = {
      id: seed.id,
      authorId: author.id,
      authorName: author.displayName,
      authorRole: author.role,
      description: seed.description,
      summary: classification.summary,
      category: classification.category,
      severity: classification.severity,
      status: statusHistory.at(-1)!.status,
      photo,
      location,
      geohash: geohashFor(location),
      address: seed.address,
      ai: { provider: 'mock', model: 'heuristic-v1', confidence: classification.confidence },
      embedding,
      embeddingModel: HASH_EMBEDDING_MODEL,
      duplicates,
      duplicateOf: null,
      statusHistory,
      upvoteCount: seed.upvotes,
      commentCount: comments.length,
      createdAt,
      updatedAt: new Date(Math.min(lastActivity, now)),
    };

    const batch = db.batch();
    const ref = reports.doc(seed.id);
    const { id: _id, ...data } = record;
    batch.set(ref, data);
    // The demo resident has already upvoted the two most popular reports.
    const voters = Array.from({ length: seed.upvotes }, (_, i) => `seed-voter-${i + 1}`);
    if (seed.upvotes >= 15) voters[0] = 'demo-resident';
    for (const voter of voters) {
      batch.set(ref.collection('upvotes').doc(voter), { userId: voter, createdAt });
    }
    for (const comment of comments) {
      const commenter = users.get(comment.author)!;
      batch.set(ref.collection('comments').doc(), {
        authorId: commenter.id,
        authorName: commenter.displayName,
        authorRole: commenter.role,
        body: comment.body,
        createdAt: new Date(Math.min(createdAt.getTime() + comment.hoursLater * HOUR, now)),
      });
    }
    await batch.commit();
    created.push(record);
    console.log(
      `  ${seed.id}  ${record.category.padEnd(9)} ${record.severity.padEnd(6)} ${record.status.padEnd(12)}` +
        (duplicates.length ? ` dup→${duplicates.map((d) => d.id).join(',')}` : ''),
    );
  }

  console.log(`Seeded ${SEED_USERS.length} users and ${created.length} reports.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
