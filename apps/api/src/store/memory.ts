import { randomUUID } from 'node:crypto';

import { distanceM } from '../domain/geo';
import { notFound } from '../errors';
import type {
  BudgetStore,
  CommentRecord,
  CommentStore,
  Cursor,
  ListReportsOptions,
  NearOptions,
  NewComment,
  NewReport,
  Paged,
  ReportMutation,
  ReportRecord,
  ReportStore,
  Store,
  UserRecord,
  UserStore,
} from './types';

/**
 * In-memory implementation of the store interfaces. Used by unit/integration tests and
 * as the reference behaviour the Firestore implementation is contract-tested against.
 */
export function createMemoryStore(now: () => Date = () => new Date()): Store {
  const users = new Map<string, UserRecord>();
  const reports = new Map<string, ReportRecord>();
  const comments = new Map<string, CommentRecord[]>();
  const upvotes = new Map<string, Set<string>>();
  const budget = new Map<string, { spentUsd: number; calls: number }>();
  const clone = <T>(v: T): T => structuredClone(v);

  const userStore: UserStore = {
    async get(id) {
      const u = users.get(id);
      return u ? clone(u) : null;
    },
    async ensure(user) {
      const existing = users.get(user.id);
      if (existing) return clone(existing);
      const created = { ...user, createdAt: now() };
      users.set(user.id, created);
      return clone(created);
    },
    async update(id, patch) {
      const u = users.get(id);
      if (!u) throw notFound('User');
      Object.assign(u, patch);
      return clone(u);
    },
  };

  const reportStore: ReportStore = {
    newId: () => randomUUID().replace(/-/g, '').slice(0, 20),
    async create(input: NewReport) {
      const record: ReportRecord = {
        ...clone(input),
        upvoteCount: 0,
        commentCount: 0,
        updatedAt: input.createdAt,
      };
      reports.set(record.id, record);
      return clone(record);
    },
    async get(id) {
      const r = reports.get(id);
      return r ? clone(r) : null;
    },
    async list(options: ListReportsOptions): Promise<Paged<ReportRecord>> {
      const compare = options.sort === 'top' ? compareTop : compareNew;
      const filtered = [...reports.values()]
        .filter((r) => !options.status || r.status === options.status)
        .filter((r) => !options.category || r.category === options.category)
        .filter((r) => !options.authorId || r.authorId === options.authorId)
        .sort(compare);
      const start = options.cursor
        ? filtered.findIndex((r) => compare(r, cursorAsRecord(options.cursor!)) > 0)
        : 0;
      const page = start === -1 ? [] : filtered.slice(start, start + options.limit + 1);
      return paginate(page.map(clone), options.limit, options.sort === 'top');
    },
    async near(center, radiusM, options: NearOptions = {}) {
      return [...reports.values()]
        .filter((r) => !options.since || r.createdAt >= options.since)
        .map((r) => ({ r, d: distanceM(center, r.location) }))
        .filter(({ d }) => d <= radiusM)
        .sort((a, b) => a.d - b.d)
        .slice(0, options.limit ?? 200)
        .map(({ r }) => clone(r));
    },
    async mutate(id, mutation: ReportMutation) {
      const current = reports.get(id);
      if (!current) throw notFound('Report');
      const patch = mutation(clone(current));
      const next = { ...current, ...clone(patch), updatedAt: now() };
      reports.set(id, next);
      return clone(next);
    },
    async toggleUpvote(reportId, userId) {
      const report = reports.get(reportId);
      if (!report) throw notFound('Report');
      const voters = upvotes.get(reportId) ?? new Set<string>();
      upvotes.set(reportId, voters);
      const upvoted = !voters.has(userId);
      if (upvoted) voters.add(userId);
      else voters.delete(userId);
      report.upvoteCount += upvoted ? 1 : -1;
      return { upvoted, upvoteCount: report.upvoteCount };
    },
    async upvotedBy(userId, reportIds) {
      return new Set(reportIds.filter((id) => upvotes.get(id)?.has(userId)));
    },
  };

  const commentStore: CommentStore = {
    async list(reportId, limit, after) {
      const all = comments.get(reportId) ?? [];
      const start = after
        ? all.findIndex((c) => compareCommentAsc(c, cursorAsComment(after)) > 0)
        : 0;
      const page = start === -1 ? [] : all.slice(start, start + limit + 1);
      return paginate(page.map(clone), limit, false);
    },
    async create(input: NewComment) {
      const report = reports.get(input.reportId);
      if (!report) throw notFound('Report');
      const record: CommentRecord = { ...clone(input), id: randomUUID() };
      const list = comments.get(input.reportId) ?? [];
      list.push(record);
      list.sort(compareCommentAsc);
      comments.set(input.reportId, list);
      report.commentCount += 1;
      return clone(record);
    },
  };

  const budgetStore: BudgetStore = {
    async tryReserve(month, amountUsd, capUsd) {
      const current = budget.get(month) ?? { spentUsd: 0, calls: 0 };
      if (current.spentUsd + amountUsd > capUsd) return false;
      budget.set(month, { spentUsd: current.spentUsd + amountUsd, calls: current.calls + 1 });
      return true;
    },
    async adjust(month, deltaUsd) {
      const current = budget.get(month) ?? { spentUsd: 0, calls: 0 };
      budget.set(month, { ...current, spentUsd: Math.max(0, current.spentUsd + deltaUsd) });
    },
    async get(month) {
      return { ...(budget.get(month) ?? { spentUsd: 0, calls: 0 }) };
    },
  };

  return { users: userStore, reports: reportStore, comments: commentStore, budget: budgetStore };
}

function compareNew(a: Pick<ReportRecord, 'createdAt' | 'id'>, b: typeof a): number {
  return b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
}

function compareTop(
  a: Pick<ReportRecord, 'createdAt' | 'id' | 'upvoteCount'>,
  b: Pick<ReportRecord, 'createdAt' | 'id' | 'upvoteCount'>,
): number {
  return b.upvoteCount - a.upvoteCount || compareNew(a, b);
}

function compareCommentAsc(a: Pick<CommentRecord, 'createdAt' | 'id'>, b: typeof a): number {
  return a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function cursorAsRecord(c: Cursor) {
  return { id: c.id, createdAt: new Date(c.createdAt), upvoteCount: c.upvoteCount ?? 0 };
}

function cursorAsComment(c: Cursor) {
  return { id: c.id, createdAt: new Date(c.createdAt) };
}

/** Callers fetch `limit + 1` rows; the extra row only signals that another page exists. */
export function paginate<T extends { id: string; createdAt: Date; upvoteCount?: number }>(
  rows: T[],
  limit: number,
  withUpvotes: boolean,
): Paged<T> {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const next =
    rows.length > limit && last
      ? {
          createdAt: last.createdAt.toISOString(),
          id: last.id,
          ...(withUpvotes ? { upvoteCount: last.upvoteCount ?? 0 } : {}),
        }
      : null;
  return { items, next };
}
