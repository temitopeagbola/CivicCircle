import { z } from 'zod';

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const optionalNumber = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.coerce.number().nonnegative().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(8787),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:8080'),
  /**
   * Express "trust proxy" setting: a hop count ("1"), "false", or a comma list of subnets.
   * Never "true" — that lets clients spoof X-Forwarded-For and dodge per-IP rate limits.
   */
  TRUST_PROXY: z.string().default('1'),

  FIREBASE_PROJECT_ID: z.string().min(1).default('demo-civiccircle'),
  /** Service account JSON (raw or base64). Not needed when running against the emulators. */
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  /** Public origin for Storage download URLs, e.g. http://localhost:9199 for the emulator. */
  STORAGE_PUBLIC_URL: z.url().optional(),

  AI_PROVIDER: z.enum(['auto', 'openai', 'mock']).default('auto'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_MODERATION_MODEL: z.string().default('omni-moderation-latest'),
  OPENAI_MONTHLY_BUDGET_USD: z.coerce.number().nonnegative().default(5),
  OPENAI_PRICE_INPUT_PER_1M: optionalNumber,
  OPENAI_PRICE_OUTPUT_PER_1M: optionalNumber,
  OPENAI_VISION: bool(true),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),

  DEMO_LOGIN_ENABLED: bool(true),
  DEMO_MODERATOR_ENABLED: bool(true),

  RATE_LIMIT_GLOBAL_PER_15M: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_REPORTS_PER_HOUR: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_COMMENTS_PER_10M: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_DEMO_PER_15M: z.coerce.number().int().positive().default(20),
});

export type Env = z.infer<typeof envSchema>;

export interface Config {
  env: Env['NODE_ENV'];
  port: number;
  logLevel: Env['LOG_LEVEL'];
  corsOrigins: string[];
  trustProxy: number | boolean | string[];
  firebase: {
    projectId: string;
    serviceAccount?: Record<string, unknown>;
    storageBucket: string;
    storagePublicUrl: string;
    usingEmulators: boolean;
  };
  ai: {
    provider: 'openai' | 'mock';
    openaiApiKey?: string;
    model: string;
    embeddingModel: string;
    moderationModel: string;
    monthlyBudgetUsd: number;
    priceOverride?: { inputPer1M: number; outputPer1M: number };
    vision: boolean;
    timeoutMs: number;
  };
  demo: { enabled: boolean; moderatorEnabled: boolean };
  rateLimits: {
    globalPer15m: number;
    reportsPerHour: number;
    commentsPer10m: number;
    demoPer15m: number;
  };
}

function parseServiceAccount(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be JSON or base64-encoded JSON');
  }
}

function parseTrustProxy(raw: string): Config['trustProxy'] {
  const value = raw.trim();
  if (value === 'false' || value === '0') return false;
  if (value === 'true') {
    throw new Error('TRUST_PROXY=true is unsafe (spoofable client IPs); use a hop count');
  }
  if (/^\d+$/.test(value)) return Number(value);
  return value.split(',').map((s) => s.trim());
}

export function loadConfig(rawSource: NodeJS.ProcessEnv = process.env): Config {
  // .env files leave optional settings blank (`NAME=`); treat those as unset, not as "".
  const source = Object.fromEntries(
    Object.entries(rawSource).filter(([, value]) => value !== undefined && value !== ''),
  );
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join('\n')}`);
  }
  const e = parsed.data;
  const usingEmulators = Boolean(source.FIRESTORE_EMULATOR_HOST);
  const storageEmulator = source.FIREBASE_STORAGE_EMULATOR_HOST;

  const hasKey = Boolean(e.OPENAI_API_KEY);
  if (e.AI_PROVIDER === 'openai' && !hasKey) {
    throw new Error('AI_PROVIDER=openai requires OPENAI_API_KEY');
  }
  const provider = e.AI_PROVIDER === 'mock' || !hasKey ? 'mock' : 'openai';

  const serviceAccount = parseServiceAccount(e.FIREBASE_SERVICE_ACCOUNT);
  if (e.NODE_ENV === 'production' && !usingEmulators && !serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is required in production');
  }

  const priceOverride =
    e.OPENAI_PRICE_INPUT_PER_1M !== undefined && e.OPENAI_PRICE_OUTPUT_PER_1M !== undefined
      ? { inputPer1M: e.OPENAI_PRICE_INPUT_PER_1M, outputPer1M: e.OPENAI_PRICE_OUTPUT_PER_1M }
      : undefined;

  return {
    env: e.NODE_ENV,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    corsOrigins: e.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    trustProxy: parseTrustProxy(e.TRUST_PROXY),
    firebase: {
      projectId: e.FIREBASE_PROJECT_ID,
      serviceAccount,
      storageBucket: e.FIREBASE_STORAGE_BUCKET ?? `${e.FIREBASE_PROJECT_ID}.firebasestorage.app`,
      storagePublicUrl:
        e.STORAGE_PUBLIC_URL ??
        (storageEmulator ? `http://${storageEmulator}` : 'https://firebasestorage.googleapis.com'),
      usingEmulators,
    },
    ai: {
      provider,
      openaiApiKey: e.OPENAI_API_KEY,
      model: e.OPENAI_MODEL,
      embeddingModel: e.OPENAI_EMBEDDING_MODEL,
      moderationModel: e.OPENAI_MODERATION_MODEL,
      monthlyBudgetUsd: e.OPENAI_MONTHLY_BUDGET_USD,
      priceOverride,
      vision: e.OPENAI_VISION,
      timeoutMs: e.OPENAI_TIMEOUT_MS,
    },
    demo: { enabled: e.DEMO_LOGIN_ENABLED, moderatorEnabled: e.DEMO_MODERATOR_ENABLED },
    rateLimits: {
      globalPer15m: e.RATE_LIMIT_GLOBAL_PER_15M,
      reportsPerHour: e.RATE_LIMIT_REPORTS_PER_HOUR,
      commentsPer10m: e.RATE_LIMIT_COMMENTS_PER_10M,
      demoPer15m: e.RATE_LIMIT_DEMO_PER_15M,
    },
  };
}
