import { pino } from 'pino';
import sharp from 'sharp';

import { createMockProvider } from '../ai/mock';
import { AiService } from '../ai/service';
import type { AiProvider } from '../ai/types';
import type { AuthService } from '../auth/firebase';
import { loadConfig, type Config } from '../config';
import type { AppDeps } from '../deps';
import { createMemoryPhotoStorage } from '../storage/photos';
import { createMemoryStore } from '../store/memory';
import type { Store } from '../store/types';

export const silentLogger = pino({ level: 'silent' });

/** Fake auth: a token "uid" or "uid|Display Name" verifies as that user; "bad" fails. */
export function createFakeAuth(): AuthService & { issued: string[] } {
  const issued: string[] = [];
  return {
    issued,
    async verifyIdToken(token) {
      if (token === 'bad') throw new Error('invalid token');
      const [uid, name] = token.split('|');
      return {
        uid: uid!,
        email: `${uid}@example.test`,
        name: name ? decodeURIComponent(name) : null,
      };
    },
    async createDemoToken(uid) {
      issued.push(uid);
      return `custom-token-for-${uid}`;
    },
  };
}

export function testConfig(env: Record<string, string> = {}): Config {
  return loadConfig({ NODE_ENV: 'test', AI_PROVIDER: 'mock', ...env });
}

export interface TestDeps extends AppDeps {
  store: Store;
  photos: ReturnType<typeof createMemoryPhotoStorage>;
}

export function createTestDeps(
  options: { env?: Record<string, string>; primary?: AiProvider; now?: () => Date } = {},
): TestDeps {
  const now = options.now ?? (() => new Date());
  const config = testConfig(options.env);
  const store = createMemoryStore(now);
  return {
    config,
    store,
    ai: new AiService({
      primary: options.primary ?? null,
      fallback: createMockProvider(),
      budget: store.budget,
      monthlyBudgetUsd: config.ai.monthlyBudgetUsd,
      timeoutMs: 1_000,
      logger: silentLogger,
      now,
    }),
    photos: createMemoryPhotoStorage(),
    auth: createFakeAuth(),
    logger: silentLogger,
    now,
    version: 'test',
  };
}

export async function makeImage(
  format: 'jpeg' | 'png' = 'jpeg',
  size = { width: 64, height: 48 },
): Promise<Buffer> {
  const img = sharp({
    create: { ...size, channels: 3, background: { r: 120, g: 120, b: 120 } },
  });
  return format === 'png' ? img.png().toBuffer() : img.jpeg().toBuffer();
}

export const auth = (uid: string, name?: string) => ({
  Authorization: `Bearer ${name ? `${uid}|${encodeURIComponent(name)}` : uid}`,
});
