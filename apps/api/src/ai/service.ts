import type { AiClassification, AiInfo, AiUsageDTO } from '@civiccircle/shared';
import type { Logger } from 'pino';

import type { BudgetStore } from '../store/types';
import { maxOutputTokens } from './openai';
import { IMAGE_TOKEN_ESTIMATE, costUsd, estimateTokens, priceFor, type Price } from './pricing';
import { HASH_EMBEDDING_MODEL, hashEmbedding } from './text';
import type { AiProvider, ClassifyInput, ModerationResult, TokenUsage } from './types';

export interface AiServiceOptions {
  /** The paid provider, or null when running on the mock only. */
  primary: AiProvider | null;
  /** Always-available offline provider used when the primary is unavailable. */
  fallback: AiProvider;
  budget: BudgetStore;
  monthlyBudgetUsd: number;
  /** Overrides the chat model's list price (from env). */
  priceOverride?: Price;
  timeoutMs: number;
  logger: Logger;
  now?: () => Date;
}

export interface Embedding {
  vector: number[];
  model: string;
  similarityThreshold: number;
}

type Guarded<T> = { ok: true; value: T } | { ok: false; reason: string };

export const monthKey = (d: Date) => d.toISOString().slice(0, 7);

/**
 * Wraps the AI providers with the monthly spend cap, timeouts and graceful fallback.
 * Every paid call reserves an upper-bound cost before it starts and settles to the real
 * cost afterwards, so concurrent requests can't overshoot the cap.
 */
export class AiService {
  private readonly now: () => Date;

  constructor(private readonly options: AiServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  get providerName() {
    return (this.options.primary ?? this.options.fallback).name;
  }

  get model() {
    return (this.options.primary ?? this.options.fallback).model;
  }

  async classify(
    input: ClassifyInput,
  ): Promise<{ classification: AiClassification; info: AiInfo }> {
    const { primary, fallback } = this.options;
    if (primary) {
      const estimate: TokenUsage = {
        inputTokens:
          600 +
          estimateTokens(input.description + (input.address ?? '')) +
          (input.imageBase64 ? IMAGE_TOKEN_ESTIMATE : 0),
        outputTokens: maxOutputTokens(primary.model),
      };
      const outcome = await this.guarded(
        'classify',
        primary.model,
        this.options.priceOverride,
        estimate,
        (signal) => primary.classify(input, signal),
      );
      if (outcome.ok) {
        const { result } = outcome.value;
        return {
          classification: result,
          info: { provider: primary.name, model: primary.model, confidence: result.confidence },
        };
      }
      const { result } = await fallback.classify(input);
      return {
        classification: result,
        info: {
          provider: fallback.name,
          model: fallback.model,
          confidence: result.confidence,
          fallbackReason: outcome.reason,
        },
      };
    }
    const { result } = await fallback.classify(input);
    return {
      classification: result,
      info: { provider: fallback.name, model: fallback.model, confidence: result.confidence },
    };
  }

  async embed(text: string): Promise<Embedding> {
    const { primary } = this.options;
    if (primary) {
      const pricingModel = primary.embeddingModel.split('@')[0]!;
      const outcome = await this.guarded(
        'embed',
        pricingModel,
        undefined,
        { inputTokens: estimateTokens(text), outputTokens: 0 },
        (signal) => primary.embed(text, signal),
      );
      if (outcome.ok) {
        return {
          vector: outcome.value.vector,
          model: primary.embeddingModel,
          similarityThreshold: primary.similarityThreshold,
        };
      }
    }
    return this.embedLocally(text);
  }

  /** The deterministic embedding every report can be compared with, whatever model made it. */
  embedLocally(text: string): Embedding {
    return {
      vector: hashEmbedding(text),
      model: HASH_EMBEDDING_MODEL,
      similarityThreshold: this.options.fallback.similarityThreshold,
    };
  }

  /** Moderation is free on OpenAI, so it is not budgeted; on failure fall back to heuristics. */
  async moderate(input: { text: string; imageBase64?: string }): Promise<ModerationResult> {
    const { primary, fallback } = this.options;
    if (primary) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
      try {
        return await primary.moderate(input, controller.signal);
      } catch (err) {
        this.options.logger.warn({ err }, 'moderation failed; using heuristic check');
      } finally {
        clearTimeout(timer);
      }
    }
    return fallback.moderate(input);
  }

  async usage(): Promise<AiUsageDTO> {
    const month = monthKey(this.now());
    const { spentUsd, calls } = await this.options.budget.get(month);
    return {
      month,
      spentUsd: Math.round(spentUsd * 1e6) / 1e6,
      calls,
      budgetUsd: this.options.monthlyBudgetUsd,
      provider: this.providerName,
      model: this.model,
    };
  }

  private async guarded<T extends { usage: TokenUsage }>(
    label: string,
    model: string,
    priceOverride: Price | undefined,
    estimate: TokenUsage,
    call: (signal: AbortSignal) => Promise<T>,
  ): Promise<Guarded<T>> {
    const { budget, monthlyBudgetUsd, timeoutMs, logger } = this.options;
    const price = priceFor(model, priceOverride);
    const reserved = costUsd(estimate, price);
    const month = monthKey(this.now());

    let reservedOk: boolean;
    try {
      reservedOk = await budget.tryReserve(month, reserved, monthlyBudgetUsd);
    } catch (err) {
      logger.error({ err, label }, 'could not reserve AI budget; skipping paid call');
      return { ok: false, reason: 'AI budget unavailable' };
    }
    if (!reservedOk) {
      logger.warn({ label, month, monthlyBudgetUsd }, 'monthly AI budget reached; using fallback');
      return { ok: false, reason: 'Monthly AI budget reached' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const value = await call(controller.signal);
      await budget.adjust(month, costUsd(value.usage, price) - reserved);
      return { ok: true, value };
    } catch (err) {
      const timedOut = controller.signal.aborted;
      // A timed-out request may still be billed, so keep the reservation; otherwise refund it.
      if (!timedOut) await budget.adjust(month, -reserved).catch(() => undefined);
      logger.warn({ err, label, timedOut }, 'AI call failed; using fallback');
      return { ok: false, reason: timedOut ? 'AI request timed out' : 'AI provider error' };
    } finally {
      clearTimeout(timer);
    }
  }
}
