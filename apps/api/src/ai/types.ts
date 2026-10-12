import type { AiClassification, AiProviderName } from '@civiccircle/shared';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ClassifyInput {
  description: string;
  address?: string;
  /** Downscaled JPEG, base64-encoded (no data: prefix). */
  imageBase64?: string;
}

export interface ModerationResult {
  flagged: boolean;
  reasons: string[];
}

/**
 * A provider does the raw model work. Budgeting, timeouts and fallbacks live in AiService,
 * so providers stay small and easy to fake in tests.
 */
export interface AiProvider {
  readonly name: AiProviderName;
  readonly model: string;
  readonly embeddingModel: string;
  /** Cosine similarity above which two reports' text is considered "about the same thing". */
  readonly similarityThreshold: number;
  classify(
    input: ClassifyInput,
    signal?: AbortSignal,
  ): Promise<{ result: AiClassification; usage: TokenUsage }>;
  embed(text: string, signal?: AbortSignal): Promise<{ vector: number[]; usage: TokenUsage }>;
  moderate(
    input: { text: string; imageBase64?: string },
    signal?: AbortSignal,
  ): Promise<ModerationResult>;
}
