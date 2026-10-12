import type { Category, DuplicateMatch, GeoPoint } from '@civiccircle/shared';
import { isActiveStatus } from '@civiccircle/shared';

import { HASH_SIMILARITY_THRESHOLD, cosineSimilarity, hashEmbedding } from '../ai/text';
import type { ReportRecord } from '../store/types';
import { distanceM } from './geo';

export const DUPLICATE_RULES = {
  /** Only reports this close are candidates. */
  radiusM: 250,
  /** Ignore reports older than this. */
  maxAgeDays: 30,
  /** Show at most this many matches. */
  limit: 3,
  /** Extra similarity required when the AI put the two reports in different categories. */
  crossCategoryMargin: 0.2,
} as const;

export interface DuplicateTarget {
  location: GeoPoint;
  category: Category;
  /** Text that was embedded (the description). */
  text: string;
  embedding: number[];
  embeddingModel: string;
  similarityThreshold: number;
}

/**
 * Score how likely `candidate` describes the same problem as `target`.
 *
 * Text similarity is the gate: below the model's threshold nothing is flagged, however close,
 * and reports the AI filed under different categories need a clearly higher similarity.
 * Past the gate, similarity (rescaled so different embedding models score comparably),
 * proximity and a category match blend into a 0.45–1 score used for ranking and shown as
 * "% match".
 */
export function scoreCandidate(
  target: DuplicateTarget,
  candidate: Pick<
    ReportRecord,
    'location' | 'category' | 'description' | 'embedding' | 'embeddingModel'
  >,
): { score: number; similarity: number; distanceM: number } | null {
  const d = distanceM(target.location, candidate.location);
  if (d > DUPLICATE_RULES.radiusM) return null;

  const comparable =
    candidate.embeddingModel === target.embeddingModel &&
    candidate.embedding.length === target.embedding.length;
  // Never compare vectors from different models; use the shared hashed embedding instead.
  const similarity = comparable
    ? cosineSimilarity(target.embedding, candidate.embedding)
    : cosineSimilarity(hashEmbedding(target.text), hashEmbedding(candidate.description));
  const threshold = comparable ? target.similarityThreshold : HASH_SIMILARITY_THRESHOLD;
  const sameCategory = candidate.category === target.category;
  if (similarity < threshold + (sameCategory ? 0 : DUPLICATE_RULES.crossCategoryMargin)) {
    return null;
  }

  const textScore = Math.min(1, (similarity - threshold) / (1 - threshold));
  const proximity = 1 - d / DUPLICATE_RULES.radiusM;
  const score = 0.45 + 0.3 * textScore + 0.15 * proximity + (sameCategory ? 0.1 : 0);
  return { score: Math.round(score * 100) / 100, similarity, distanceM: Math.round(d) };
}

export function findDuplicates(
  target: DuplicateTarget,
  candidates: ReportRecord[],
  now: Date,
): DuplicateMatch[] {
  const oldest = now.getTime() - DUPLICATE_RULES.maxAgeDays * 86_400_000;
  return candidates
    .filter((c) => isActiveStatus(c.status) && c.createdAt.getTime() >= oldest)
    .flatMap((c) => {
      const scored = scoreCandidate(target, c);
      if (!scored) return [];
      return [
        {
          id: c.id,
          summary: c.summary,
          status: c.status,
          score: scored.score,
          distanceM: scored.distanceM,
          createdAt: c.createdAt.toISOString(),
        } satisfies DuplicateMatch,
      ];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, DUPLICATE_RULES.limit);
}
