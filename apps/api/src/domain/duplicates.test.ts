import { describe, expect, it } from 'vitest';

import { HASH_EMBEDDING_MODEL, HASH_SIMILARITY_THRESHOLD, hashEmbedding } from '../ai/text';
import type { ReportRecord } from '../store/types';
import { findDuplicates, scoreCandidate, type DuplicateTarget } from './duplicates';

const NOW = new Date('2026-10-01T12:00:00Z');
const BASE = { lat: 51.5033, lng: -0.0866 };
/** Roughly `m` metres north of BASE. */
const north = (m: number) => ({ lat: BASE.lat + m / 111_320, lng: BASE.lng });

function candidate(overrides: Partial<ReportRecord> & { description: string }): ReportRecord {
  return {
    id: overrides.id ?? overrides.description.slice(0, 10),
    authorId: 'u1',
    authorName: 'U',
    authorRole: 'resident',
    summary: overrides.description,
    category: 'roads',
    severity: 'medium',
    status: 'open',
    photo: null,
    location: BASE,
    geohash: '',
    address: null,
    ai: { provider: 'mock', model: 'heuristic-v1', confidence: 0.5 },
    embedding: hashEmbedding(overrides.description),
    embeddingModel: HASH_EMBEDDING_MODEL,
    duplicates: [],
    duplicateOf: null,
    statusHistory: [],
    upvoteCount: 0,
    commentCount: 0,
    createdAt: new Date(NOW.getTime() - 86_400_000),
    updatedAt: NOW,
    ...overrides,
  };
}

function target(description: string, overrides: Partial<DuplicateTarget> = {}): DuplicateTarget {
  return {
    location: BASE,
    category: 'roads',
    text: description,
    embedding: hashEmbedding(description),
    embeddingModel: HASH_EMBEDDING_MODEL,
    similarityThreshold: HASH_SIMILARITY_THRESHOLD,
    ...overrides,
  };
}

const POTHOLE = 'Large pothole on Tooley Street by the bus stop, cars swerving';

describe('findDuplicates', () => {
  it('flags a paraphrase of a nearby report', () => {
    const existing = candidate({
      id: 'a',
      description: 'Huge potholes outside the bus stop on Tooley St',
      location: north(40),
    });
    const [match, ...rest] = findDuplicates(target(POTHOLE), [existing], NOW);
    expect(rest).toHaveLength(0);
    expect(match).toMatchObject({ id: 'a', distanceM: 40, status: 'open' });
    expect(match!.score).toBeGreaterThan(0.7);
  });

  it('still matches a same-category paraphrase with little word overlap', () => {
    const t = target('Overflowing bins outside the station', { category: 'waste' });
    const bags = candidate({
      id: 'w',
      category: 'waste',
      description: 'Rubbish bags piled up next to the station bins',
    });
    expect(findDuplicates(t, [bags], NOW).map((m) => m.id)).toEqual(['w']);
  });

  it('ignores different problems on the same street', () => {
    const light = candidate({
      id: 'b',
      category: 'lighting',
      description: 'Streetlight out on Tooley Street by the bus stop',
    });
    expect(findDuplicates(target(POTHOLE), [light], NOW)).toEqual([]);
  });

  it('ignores reports that are too far, too old or closed', () => {
    const same = 'Huge pothole outside the bus stop on Tooley St';
    const far = candidate({ id: 'far', description: same, location: north(400) });
    const old = candidate({
      id: 'old',
      description: same,
      createdAt: new Date(NOW.getTime() - 40 * 86_400_000),
    });
    const resolved = candidate({ id: 'res', description: same, status: 'resolved' });
    const dup = candidate({ id: 'dup', description: same, status: 'duplicate' });
    expect(findDuplicates(target(POTHOLE), [far, old, resolved, dup], NOW)).toEqual([]);
  });

  it('ranks closer, same-category matches first and caps the list', () => {
    const text = 'Pothole by the bus stop on Tooley Street';
    const candidates = [
      candidate({ id: 'c200', description: text, location: north(200) }),
      candidate({ id: 'c10', description: text, location: north(10) }),
      candidate({ id: 'c100', description: text, location: north(100) }),
      candidate({ id: 'c50other', description: text, location: north(50), category: 'pavements' }),
      candidate({ id: 'c60', description: text, location: north(60) }),
    ];
    const ids = findDuplicates(target(POTHOLE), candidates, NOW).map((m) => m.id);
    expect(ids).toEqual(['c10', 'c60', 'c100']);
  });

  it('falls back to the shared hashed embedding when models differ', () => {
    const existing = candidate({
      id: 'openai',
      description: 'Huge potholes outside the bus stop on Tooley St',
      embedding: [1, 0, 0],
      embeddingModel: 'text-embedding-3-small@256',
    });
    expect(findDuplicates(target(POTHOLE), [existing], NOW).map((m) => m.id)).toEqual(['openai']);
  });

  it('uses the provider threshold when models match', () => {
    const t = target(POTHOLE, { embedding: [1, 0], embeddingModel: 'm', similarityThreshold: 0.9 });
    const close = candidate({
      id: 'x',
      description: 'anything',
      embedding: [0.95, 0.31],
      embeddingModel: 'm',
    });
    const apart = candidate({
      id: 'y',
      description: 'anything',
      embedding: [0.6, 0.8],
      embeddingModel: 'm',
    });
    expect(scoreCandidate(t, close)).not.toBeNull();
    expect(scoreCandidate(t, apart)).toBeNull();
  });
});
