import type { TokenUsage } from './types';

export interface Price {
  /** USD per 1M input tokens. */
  inputPer1M: number;
  /** USD per 1M output tokens. */
  outputPer1M: number;
}

/**
 * Published list prices (USD per 1M tokens) for models this app is likely to be pointed at.
 * Unknown models fall back to a deliberately pessimistic price so the spend cap errs on the
 * safe side; set OPENAI_PRICE_INPUT_PER_1M / OPENAI_PRICE_OUTPUT_PER_1M to be exact.
 */
const PRICES: Record<string, Price> = {
  'gpt-4.1-mini': { inputPer1M: 0.4, outputPer1M: 1.6 },
  'gpt-4.1-nano': { inputPer1M: 0.1, outputPer1M: 0.4 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-5-mini': { inputPer1M: 0.25, outputPer1M: 2 },
  'gpt-5-nano': { inputPer1M: 0.05, outputPer1M: 0.4 },
  'text-embedding-3-small': { inputPer1M: 0.02, outputPer1M: 0 },
  'text-embedding-3-large': { inputPer1M: 0.13, outputPer1M: 0 },
};

export const UNKNOWN_MODEL_PRICE: Price = { inputPer1M: 5, outputPer1M: 20 };

export function priceFor(model: string, override?: Price): Price {
  if (override) return override;
  // Match dated snapshots such as "gpt-4.1-mini-2025-04-14" to their family.
  const key = Object.keys(PRICES)
    .sort((a, b) => b.length - a.length)
    .find((k) => model === k || model.startsWith(`${k}-`));
  return key ? PRICES[key]! : UNKNOWN_MODEL_PRICE;
}

export function costUsd(usage: TokenUsage, price: Price): number {
  return (
    (usage.inputTokens * price.inputPer1M + usage.outputTokens * price.outputPer1M) / 1_000_000
  );
}

/** Rough upper bound on tokens for a string (English averages ~4 chars/token; use 3 to be safe). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

/**
 * Upper bound for an image at detail "low". Most models bill 85–~1,600 tokens; gpt-4o-mini
 * bills ~2,833 because of its token multiplier, so reserve 3,000.
 */
export const IMAGE_TOKEN_ESTIMATE = 3_000;
