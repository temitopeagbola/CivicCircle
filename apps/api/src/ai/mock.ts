import type { AiClassification, Category, Severity } from '@civiccircle/shared';
import { SEVERITIES } from '@civiccircle/shared';

import { KEYWORDS } from './keywords';
import {
  HASH_EMBEDDING_MODEL,
  HASH_SIMILARITY_THRESHOLD,
  hashEmbedding,
  oneLineSummary,
  tokenize,
} from './text';
import type { AiProvider, ClassifyInput, ModerationResult, TokenUsage } from './types';

const FREE: TokenUsage = { inputTokens: 0, outputTokens: 0 };

const CATEGORY_DEFAULT_SEVERITY: Record<Category, Severity> = {
  roads: 'medium',
  lighting: 'medium',
  waste: 'medium',
  graffiti: 'low',
  water: 'medium',
  parks: 'low',
  traffic: 'medium',
  pavements: 'medium',
  other: 'low',
};

const URGENT =
  /gas leak|smell(s|ing)? (of )?gas|exposed (live )?wires?|live wire|sparking|electric shock|sinkhole|collapsed|on fire|sewage|burst (water )?main|fallen (tree|power line|cable)|power lines? down/;
const HIGH =
  /danger|hazard|injur|accident|nearly (fell|hit|crashed)|tripp?ed|fell over|child|school|wheelchair|blind|elderly|deep|flood(ed|ing)|blocking|blocked|pitch black|broken glass|needles?|syringe|swerv/;
const LOW = /\b(minor|small|cosmetic|faded|slightly|a bit|tiny)\b/;

const THREAT = /\b(i('| a)?m going to|i will|i'll|gonna) (kill|hurt|attack|stab|shoot)\b/;

export function classifyText(description: string): AiClassification {
  const tokens = tokenize(description);
  let best: Category = 'other';
  let bestScore = 0;
  for (const [category, weights] of Object.entries(KEYWORDS) as [
    Category,
    Record<string, number>,
  ][]) {
    const score = tokens.reduce((s, t) => s + (weights[t] ?? 0), 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return {
    category: best,
    severity: severityFor(description, best),
    summary: oneLineSummary(description),
    confidence: bestScore === 0 ? 0.3 : Math.min(0.9, 0.45 + 0.1 * bestScore),
  };
}

export function severityFor(description: string, category: Category): Severity {
  const text = description.toLowerCase();
  if (URGENT.test(text)) return 'urgent';
  if (HIGH.test(text)) return 'high';
  const base = CATEGORY_DEFAULT_SEVERITY[category];
  if (LOW.test(text)) return SEVERITIES[Math.max(0, SEVERITIES.indexOf(base) - 1)]!;
  return base;
}

export function moderateText(text: string): ModerationResult {
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  if (THREAT.test(lower)) reasons.push('violence');
  if ((lower.match(/https?:\/\//g) ?? []).length > 2) reasons.push('spam');
  return { flagged: reasons.length > 0, reasons };
}

/**
 * Deterministic, offline provider: keyword classifier, rule-based severity, first-sentence
 * summary and hashed bag-of-words embeddings. Used when no OpenAI key is configured, in
 * tests, and as the fallback when the budget cap is hit or OpenAI errors.
 */
export function createMockProvider(): AiProvider {
  return {
    name: 'mock',
    model: 'heuristic-v1',
    embeddingModel: HASH_EMBEDDING_MODEL,
    similarityThreshold: HASH_SIMILARITY_THRESHOLD,
    async classify(input: ClassifyInput) {
      const text = [input.description, input.address].filter(Boolean).join('. ');
      return { result: classifyText(text), usage: FREE };
    },
    async embed(text: string) {
      return { vector: hashEmbedding(text), usage: FREE };
    },
    async moderate(input) {
      return moderateText(input.text);
    },
  };
}
