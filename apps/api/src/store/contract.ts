import { beforeEach, describe, expect, it } from 'vitest';

import { geohashFor } from '../domain/geo';
import type { NewReport, Store } from './types';

const BASE = { lat: 51.5033, lng: -0.0866 };
const north = (m: number) => ({ lat: BASE.lat + m / 111_320, lng: BASE.lng });

export function newReport(store: Store, overrides: Partial<NewReport> = {}): NewReport {
  const location = overrides.location ?? BASE;
  return {
    id: store.reports.newId(),
    authorId: 'author-1',
    authorName: 'Author One',
    authorRole: 'resident',
    description: 'Pothole outside the station',
    summary: 'Pothole outside the station',
    category: 'roads',
    severity: 'medium',
    status: 'open',
    photo: null,
    location,
    geohash: geohashFor(location),
    address: null,
    ai: { provider: 'mock', model: 'heuristic-v1', confidence: 0.6 },
    embedding: [0.1, 0.2],
    embeddingModel: 'hashed-bow-v1',
    duplicates: [],
    duplicateOf: null,
    statusHistory: [],
    createdAt: new Date('2026-09-01T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Behaviour every Store implementation must share. Runs against the in-memory store in the
 * unit suite and against the Firestore emulator in `npm run test:emulator`.
 */
export function storeContract(name: string, factory: () => Promise<Store> | Store) {
  describe(`${name} store contract`, () => {
    let store: Store;
    beforeEach(async () => {
      store = await factory();
    });

    it('creates users once and never overwrites their role', async () => {
      const first = await store.users.ensure({
        id: 'u1',
        displayName: 'A',
        role: 'moderator',
        email: null,
        isDemo: false,
      });
      const second = await store.users.ensure({
        id: 'u1',
        displayName: 'B',
        role: 'resident',
        email: null,
        isDemo: false,
      });
      expect(second.role).toBe('moderator');
      expect(second.displayName).toBe(first.displayName);
      expect((await store.users.update('u1', { displayName: 'Renamed' })).displayName).toBe(
        'Renamed',
      );
    });

    it('round-trips a report', async () => {
      const input = newReport(store, {
        address: '1 Test St',
        photo: { url: 'https://x/y.jpg', path: 'reports/y.jpg' },
      });
      await store.reports.create(input);
      const got = await store.reports.get(input.id);
      expect(got).toMatchObject({ ...input, upvoteCount: 0, commentCount: 0 });
      expect(got?.createdAt.toISOString()).toBe(input.createdAt.toISOString());
      expect(await store.reports.get('missing')).toBeNull();
    });

    it('lists newest first with keyset pagination and filters', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const r = newReport(store, {
          createdAt: new Date(Date.UTC(2026, 8, 1, 10, i)),
          category: i % 2 ? 'lighting' : 'roads',
          authorId: i === 4 ? 'author-2' : 'author-1',
        });
        ids.push(r.id);
        await store.reports.create(r);
      }
      const page1 = await store.reports.list({ sort: 'new', limit: 2 });
      expect(page1.items.map((r) => r.id)).toEqual([ids[4], ids[3]]);
      const page2 = await store.reports.list({ sort: 'new', limit: 2, cursor: page1.next! });
      expect(page2.items.map((r) => r.id)).toEqual([ids[2], ids[1]]);
      const page3 = await store.reports.list({ sort: 'new', limit: 2, cursor: page2.next! });
      expect(page3.items.map((r) => r.id)).toEqual([ids[0]]);
      expect(page3.next).toBeNull();

      const lighting = await store.reports.list({ sort: 'new', limit: 10, category: 'lighting' });
      expect(lighting.items.map((r) => r.id)).toEqual([ids[3], ids[1]]);
      const mine = await store.reports.list({ sort: 'new', limit: 10, authorId: 'author-2' });
      expect(mine.items.map((r) => r.id)).toEqual([ids[4]]);
    });

    it('sorts by upvotes for "top" and paginates across ties', async () => {
      const a = newReport(store, { createdAt: new Date('2026-09-01T10:00:00Z') });
      const b = newReport(store, { createdAt: new Date('2026-09-02T10:00:00Z') });
      const c = newReport(store, { createdAt: new Date('2026-09-03T10:00:00Z') });
      for (const r of [a, b, c]) await store.reports.create(r);
      await store.reports.toggleUpvote(a.id, 'v1');
      await store.reports.toggleUpvote(a.id, 'v2');
      await store.reports.toggleUpvote(b.id, 'v1');
      const page1 = await store.reports.list({ sort: 'top', limit: 1 });
      expect(page1.items.map((r) => r.id)).toEqual([a.id]);
      const page2 = await store.reports.list({ sort: 'top', limit: 5, cursor: page1.next! });
      expect(page2.items.map((r) => r.id)).toEqual([b.id, c.id]);
    });

    it('finds nearby reports nearest first within the radius and time window', async () => {
      const near = newReport(store, { location: north(50) });
      const nearer = newReport(store, { location: north(10) });
      const far = newReport(store, { location: north(2_000) });
      const old = newReport(store, {
        location: north(20),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      for (const r of [near, nearer, far, old]) await store.reports.create(r);
      const found = await store.reports.near(BASE, 250, {
        since: new Date('2026-06-01T00:00:00Z'),
      });
      expect(found.map((r) => r.id)).toEqual([nearer.id, near.id]);
    });

    it('toggles upvotes idempotently per user', async () => {
      const r = newReport(store);
      await store.reports.create(r);
      expect(await store.reports.toggleUpvote(r.id, 'v1')).toEqual({
        upvoted: true,
        upvoteCount: 1,
      });
      expect(await store.reports.toggleUpvote(r.id, 'v2')).toEqual({
        upvoted: true,
        upvoteCount: 2,
      });
      expect(await store.reports.toggleUpvote(r.id, 'v1')).toEqual({
        upvoted: false,
        upvoteCount: 1,
      });
      expect(await store.reports.upvotedBy('v2', [r.id, 'other'])).toEqual(new Set([r.id]));
      expect((await store.reports.get(r.id))?.upvoteCount).toBe(1);
      await expect(store.reports.toggleUpvote('missing', 'v1')).rejects.toThrow(/not found/);
    });

    it('mutates in a transaction and aborts when the mutation throws', async () => {
      const r = newReport(store);
      await store.reports.create(r);
      const updated = await store.reports.mutate(r.id, () => ({ status: 'acknowledged' }));
      expect(updated.status).toBe('acknowledged');
      await expect(
        store.reports.mutate(r.id, () => {
          throw new Error('nope');
        }),
      ).rejects.toThrow('nope');
      expect((await store.reports.get(r.id))?.status).toBe('acknowledged');
    });

    it('adds comments in order and counts them on the report', async () => {
      const r = newReport(store);
      await store.reports.create(r);
      for (let i = 0; i < 3; i++) {
        await store.comments.create({
          reportId: r.id,
          authorId: 'u',
          authorName: 'U',
          authorRole: 'resident',
          body: `comment ${i}`,
          createdAt: new Date(Date.UTC(2026, 8, 2, 10, i)),
        });
      }
      const page1 = await store.comments.list(r.id, 2);
      expect(page1.items.map((c) => c.body)).toEqual(['comment 0', 'comment 1']);
      const page2 = await store.comments.list(r.id, 2, page1.next!);
      expect(page2.items.map((c) => c.body)).toEqual(['comment 2']);
      expect((await store.reports.get(r.id))?.commentCount).toBe(3);
    });

    it('enforces the budget cap atomically', async () => {
      const month = `test-${Math.random().toString(36).slice(2)}`;
      const results = await Promise.all(
        Array.from({ length: 6 }, () => store.budget.tryReserve(month, 0.4, 1)),
      );
      expect(results.filter(Boolean)).toHaveLength(2);
      await store.budget.adjust(month, -0.3);
      const usage = await store.budget.get(month);
      expect(usage.calls).toBe(2);
      expect(usage.spentUsd).toBeCloseTo(0.5, 10);
    });
  });
}
