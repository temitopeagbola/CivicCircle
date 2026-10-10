import {
  FieldPath,
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';

import { distanceM, geohashBounds } from '../domain/geo';
import { notFound } from '../errors';
import { paginate } from './memory';
import type {
  CommentRecord,
  ListReportsOptions,
  NewComment,
  NewReport,
  ReportRecord,
  Store,
  UserRecord,
} from './types';

const toDate = (v: unknown): Date =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date(String(v));

function reportFromDoc(doc: DocumentSnapshot): ReportRecord {
  const d = doc.data()!;
  return {
    ...(d as Omit<ReportRecord, 'id' | 'createdAt' | 'updatedAt'>),
    id: doc.id,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

function commentFromDoc(doc: DocumentSnapshot, reportId: string): CommentRecord {
  const d = doc.data()!;
  return {
    id: doc.id,
    reportId,
    authorId: d.authorId,
    authorName: d.authorName,
    authorRole: d.authorRole,
    body: d.body,
    createdAt: toDate(d.createdAt),
  };
}

function userFromDoc(doc: DocumentSnapshot): UserRecord {
  const d = doc.data()!;
  return {
    id: doc.id,
    displayName: d.displayName,
    role: d.role,
    email: d.email ?? null,
    isDemo: Boolean(d.isDemo),
    createdAt: toDate(d.createdAt),
  };
}

export function createFirestoreStore(db: Firestore): Store {
  const usersCol = db.collection('users');
  const reportsCol = db.collection('reports');
  const usageCol = db.collection('aiUsage');

  return {
    users: {
      async get(id) {
        const snap = await usersCol.doc(id).get();
        return snap.exists ? userFromDoc(snap) : null;
      },
      async ensure(user) {
        const ref = usersCol.doc(user.id);
        return db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (snap.exists) return userFromDoc(snap);
          const { id: _id, ...rest } = user;
          const createdAt = new Date();
          tx.set(ref, { ...rest, createdAt });
          return { ...user, createdAt };
        });
      },
      async update(id, patch) {
        const ref = usersCol.doc(id);
        await ref.update(patch);
        const snap = await ref.get();
        return userFromDoc(snap);
      },
    },

    reports: {
      newId: () => reportsCol.doc().id,
      async create(input: NewReport) {
        const { id, ...rest } = input;
        const record = { ...rest, upvoteCount: 0, commentCount: 0, updatedAt: input.createdAt };
        await reportsCol.doc(id).create(record);
        return { ...record, id };
      },
      async get(id) {
        const snap = await reportsCol.doc(id).get();
        return snap.exists ? reportFromDoc(snap) : null;
      },
      async list(options: ListReportsOptions) {
        let q: Query = reportsCol;
        if (options.status) q = q.where('status', '==', options.status);
        if (options.category) q = q.where('category', '==', options.category);
        if (options.authorId) q = q.where('authorId', '==', options.authorId);
        const top = options.sort === 'top';
        if (top) q = q.orderBy('upvoteCount', 'desc');
        q = q.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
        if (options.cursor) {
          const c = options.cursor;
          const at = Timestamp.fromDate(new Date(c.createdAt));
          q = top ? q.startAfter(c.upvoteCount ?? 0, at, c.id) : q.startAfter(at, c.id);
        }
        const snap = await q.limit(options.limit + 1).get();
        return paginate(snap.docs.map(reportFromDoc), options.limit, top);
      },
      async near(center, radiusM, options = {}) {
        const limit = options.limit ?? 200;
        const snaps = await Promise.all(
          geohashBounds(center, radiusM).map(([start, end]) =>
            reportsCol.orderBy('geohash').startAt(start).endAt(end).limit(limit).get(),
          ),
        );
        const seen = new Set<string>();
        return snaps
          .flatMap((s) => s.docs)
          .filter((doc) => !seen.has(doc.id) && seen.add(doc.id))
          .map(reportFromDoc)
          .filter((r) => !options.since || r.createdAt >= options.since)
          .map((r) => ({ r, d: distanceM(center, r.location) }))
          .filter(({ d }) => d <= radiusM)
          .sort((a, b) => a.d - b.d)
          .slice(0, limit)
          .map(({ r }) => r);
      },
      async mutate(id, mutation) {
        const ref = reportsCol.doc(id);
        return db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists) throw notFound('Report');
          const current = reportFromDoc(snap);
          const patch = mutation(current);
          const updatedAt = new Date();
          tx.update(ref, { ...patch, updatedAt });
          return { ...current, ...patch, updatedAt };
        });
      },
      async toggleUpvote(reportId, userId) {
        const reportRef = reportsCol.doc(reportId);
        const voteRef = reportRef.collection('upvotes').doc(userId);
        return db.runTransaction(async (tx) => {
          const [report, vote] = await tx.getAll(reportRef, voteRef);
          if (!report?.exists) throw notFound('Report');
          const count = (report.get('upvoteCount') as number | undefined) ?? 0;
          if (vote?.exists) {
            tx.delete(voteRef);
            tx.update(reportRef, { upvoteCount: FieldValue.increment(-1) });
            return { upvoted: false, upvoteCount: count - 1 };
          }
          tx.set(voteRef, { userId, createdAt: new Date() });
          tx.update(reportRef, { upvoteCount: FieldValue.increment(1) });
          return { upvoted: true, upvoteCount: count + 1 };
        });
      },
      async upvotedBy(userId, reportIds) {
        if (reportIds.length === 0) return new Set();
        const refs = reportIds.map((id) => reportsCol.doc(id).collection('upvotes').doc(userId));
        const snaps = await db.getAll(...refs);
        return new Set(snaps.filter((s) => s.exists).map((s) => s.ref.parent.parent!.id));
      },
    },

    comments: {
      async list(reportId, limit, after) {
        let q = reportsCol
          .doc(reportId)
          .collection('comments')
          .orderBy('createdAt', 'asc')
          .orderBy(FieldPath.documentId(), 'asc');
        if (after) q = q.startAfter(Timestamp.fromDate(new Date(after.createdAt)), after.id);
        const snap = await q.limit(limit + 1).get();
        return paginate(
          snap.docs.map((d) => commentFromDoc(d, reportId)),
          limit,
          false,
        );
      },
      async create(input: NewComment) {
        const reportRef = reportsCol.doc(input.reportId);
        const commentRef = reportRef.collection('comments').doc();
        return db.runTransaction(async (tx) => {
          const report = await tx.get(reportRef);
          if (!report.exists) throw notFound('Report');
          const { reportId: _r, ...data } = input;
          tx.set(commentRef, data);
          tx.update(reportRef, { commentCount: FieldValue.increment(1) });
          return { ...input, id: commentRef.id };
        });
      },
    },

    budget: {
      async tryReserve(month, amountUsd, capUsd) {
        const ref = usageCol.doc(month);
        return db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const spent = (snap.get('spentUsd') as number | undefined) ?? 0;
          const calls = (snap.get('calls') as number | undefined) ?? 0;
          if (spent + amountUsd > capUsd) return false;
          tx.set(
            ref,
            { spentUsd: spent + amountUsd, calls: calls + 1, updatedAt: new Date() },
            { merge: true },
          );
          return true;
        });
      },
      async adjust(month, deltaUsd) {
        await usageCol
          .doc(month)
          .set(
            { spentUsd: FieldValue.increment(deltaUsd), updatedAt: new Date() },
            { merge: true },
          );
      },
      async get(month) {
        const snap = await usageCol.doc(month).get();
        return {
          spentUsd: Math.max(0, (snap.get('spentUsd') as number | undefined) ?? 0),
          calls: (snap.get('calls') as number | undefined) ?? 0,
        };
      },
    },
  };
}
