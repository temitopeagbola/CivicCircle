import { describe, expect, it, vi } from 'vitest';

import { silentLogger } from '../test/helpers';
import { createMemoryStore } from '../store/memory';
import { createMockProvider } from './mock';
import { costUsd, priceFor, UNKNOWN_MODEL_PRICE } from './pricing';
import { AiService, monthKey } from './service';
import type { AiProvider } from './types';

const NOW = new Date('2026-10-15T10:00:00Z');
const MONTH = '2026-10';

function fakeOpenAi(overrides: Partial<AiProvider> = {}): AiProvider {
  return {
    name: 'openai',
    model: 'gpt-4.1-mini',
    embeddingModel: 'text-embedding-3-small@256',
    similarityThreshold: 0.55,
    classify: vi.fn(async () => ({
      result: {
        category: 'water' as const,
        severity: 'high' as const,
        summary: 'Flooded underpass',
        confidence: 0.92,
      },
      usage: { inputTokens: 1_000, outputTokens: 50 },
    })),
    embed: vi.fn(async () => ({ vector: [0.6, 0.8], usage: { inputTokens: 20, outputTokens: 0 } })),
    moderate: vi.fn(async () => ({ flagged: false, reasons: [] })),
    ...overrides,
  };
}

function setup(primary: AiProvider | null, budgetUsd = 5) {
  const store = createMemoryStore(() => NOW);
  const service = new AiService({
    primary,
    fallback: createMockProvider(),
    budget: store.budget,
    monthlyBudgetUsd: budgetUsd,
    timeoutMs: 50,
    logger: silentLogger,
    now: () => NOW,
  });
  return { service, store };
}

const INPUT = { description: 'The underpass is flooded again after the rain' };

describe('pricing', () => {
  it('matches dated snapshots to their model family', () => {
    expect(priceFor('gpt-4.1-mini-2025-04-14')).toEqual(priceFor('gpt-4.1-mini'));
    expect(priceFor('gpt-4.1-mini')).not.toEqual(priceFor('gpt-4.1-nano'));
  });

  it('is pessimistic for unknown models and honours overrides', () => {
    expect(priceFor('some-future-model')).toEqual(UNKNOWN_MODEL_PRICE);
    expect(priceFor('some-future-model', { inputPer1M: 1, outputPer1M: 2 })).toEqual({
      inputPer1M: 1,
      outputPer1M: 2,
    });
  });

  it('computes cost from token usage', () => {
    expect(
      costUsd(
        { inputTokens: 1_000_000, outputTokens: 500_000 },
        { inputPer1M: 0.4, outputPer1M: 1.6 },
      ),
    ).toBeCloseTo(1.2);
  });
});

describe('AiService', () => {
  it('uses the mock provider when no OpenAI key is configured', async () => {
    const { service, store } = setup(null);
    const { classification, info } = await service.classify(INPUT);
    expect(info).toMatchObject({ provider: 'mock', model: 'heuristic-v1' });
    expect(info.fallbackReason).toBeUndefined();
    expect(classification.category).toBe('water');
    expect(await store.budget.get(MONTH)).toEqual({ spentUsd: 0, calls: 0 });
  });

  it('settles the reservation to the real cost after a successful call', async () => {
    const primary = fakeOpenAi();
    const { service, store } = setup(primary);
    const { info } = await service.classify(INPUT);
    expect(info).toEqual({ provider: 'openai', model: 'gpt-4.1-mini', confidence: 0.92 });
    const expected = costUsd({ inputTokens: 1_000, outputTokens: 50 }, priceFor('gpt-4.1-mini'));
    const usage = await store.budget.get(MONTH);
    expect(usage.calls).toBe(1);
    expect(usage.spentUsd).toBeCloseTo(expected, 10);
  });

  it('falls back to heuristics once the monthly cap is reached', async () => {
    const primary = fakeOpenAi();
    const { service, store } = setup(primary, 0.001);
    await store.budget.adjust(MONTH, 0.000_999);
    const { info, classification } = await service.classify(INPUT);
    expect(primary.classify).not.toHaveBeenCalled();
    expect(info).toMatchObject({ provider: 'mock', fallbackReason: 'Monthly AI budget reached' });
    expect(classification.category).toBe('water');
  });

  it('never lets concurrent calls overshoot the cap', async () => {
    const primary = fakeOpenAi();
    // Budget for roughly two reservations, then fire ten requests at once.
    const perCall = costUsd(
      { inputTokens: 600 + 16 + 0, outputTokens: 300 },
      priceFor('gpt-4.1-mini'),
    );
    const { service, store } = setup(primary, perCall * 2.5);
    await Promise.all(Array.from({ length: 10 }, () => service.classify(INPUT)));
    expect(vi.mocked(primary.classify).mock.calls.length).toBeLessThanOrEqual(2);
    expect((await store.budget.get(MONTH)).spentUsd).toBeLessThanOrEqual(perCall * 2.5);
  });

  it('refunds the reservation and falls back when the provider errors', async () => {
    const primary = fakeOpenAi({ classify: vi.fn(async () => Promise.reject(new Error('500'))) });
    const { service, store } = setup(primary);
    const { info } = await service.classify(INPUT);
    expect(info).toMatchObject({ provider: 'mock', fallbackReason: 'AI provider error' });
    expect((await store.budget.get(MONTH)).spentUsd).toBeCloseTo(0, 10);
  });

  it('keeps the reservation when the call times out (it may still be billed)', async () => {
    const primary = fakeOpenAi({
      classify: vi.fn<AiProvider['classify']>(
        (_input, signal) =>
          new Promise((_resolve, reject) =>
            signal?.addEventListener('abort', () => reject(new Error('aborted'))),
          ),
      ),
    });
    const { service, store } = setup(primary);
    const { info } = await service.classify(INPUT);
    expect(info.fallbackReason).toBe('AI request timed out');
    expect((await store.budget.get(MONTH)).spentUsd).toBeGreaterThan(0);
  });

  it('labels embeddings with their model so they are only compared like-for-like', async () => {
    const { service } = setup(fakeOpenAi());
    expect(await service.embed('x')).toEqual({
      vector: [0.6, 0.8],
      model: 'text-embedding-3-small@256',
      similarityThreshold: 0.55,
    });
    const { service: offline } = setup(null);
    expect((await offline.embed('x')).model).toBe('hashed-bow-v1');
  });

  it('falls back to heuristic moderation if the moderation call fails', async () => {
    const primary = fakeOpenAi({ moderate: vi.fn(async () => Promise.reject(new Error('down'))) });
    const { service } = setup(primary);
    expect(await service.moderate({ text: "I'm going to hurt you" })).toEqual({
      flagged: true,
      reasons: ['violence'],
    });
  });

  it('reports usage for the current month', async () => {
    const { service } = setup(fakeOpenAi(), 5);
    await service.classify(INPUT);
    const usage = await service.usage();
    expect(usage).toMatchObject({
      month: monthKey(NOW),
      budgetUsd: 5,
      calls: 1,
      provider: 'openai',
    });
  });
});
