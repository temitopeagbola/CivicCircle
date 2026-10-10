import { describe, expect, it } from 'vitest';

import { loadConfig } from './config';

describe('loadConfig', () => {
  it('selects the mock provider when no key is set and OpenAI when one is', () => {
    expect(loadConfig({}).ai.provider).toBe('mock');
    expect(loadConfig({ OPENAI_API_KEY: 'sk-test' }).ai.provider).toBe('openai');
    expect(loadConfig({ OPENAI_API_KEY: 'sk-test', AI_PROVIDER: 'mock' }).ai.provider).toBe('mock');
    expect(() => loadConfig({ AI_PROVIDER: 'openai' })).toThrow(/requires OPENAI_API_KEY/);
  });

  it('refuses a spoofable trust proxy setting', () => {
    expect(loadConfig({ TRUST_PROXY: '2' }).trustProxy).toBe(2);
    expect(loadConfig({ TRUST_PROXY: 'false' }).trustProxy).toBe(false);
    expect(() => loadConfig({ TRUST_PROXY: 'true' })).toThrow(/unsafe/);
  });

  it('accepts a base64 service account and requires one in production', () => {
    const sa = Buffer.from(JSON.stringify({ project_id: 'p' })).toString('base64');
    expect(loadConfig({ FIREBASE_SERVICE_ACCOUNT: sa }).firebase.serviceAccount).toEqual({
      project_id: 'p',
    });
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/FIREBASE_SERVICE_ACCOUNT/);
    expect(() =>
      loadConfig({ NODE_ENV: 'production', FIRESTORE_EMULATOR_HOST: 'localhost:8080' }),
    ).not.toThrow();
  });

  it('points Storage URLs at the emulator when it is in use', () => {
    const cfg = loadConfig({ FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199' });
    expect(cfg.firebase.storagePublicUrl).toBe('http://127.0.0.1:9199');
    expect(cfg.firebase.storageBucket).toBe('demo-civiccircle.firebasestorage.app');
  });

  it('only applies a price override when both prices are set', () => {
    expect(loadConfig({ OPENAI_PRICE_INPUT_PER_1M: '1' }).ai.priceOverride).toBeUndefined();
    expect(
      loadConfig({ OPENAI_PRICE_INPUT_PER_1M: '1', OPENAI_PRICE_OUTPUT_PER_1M: '4' }).ai
        .priceOverride,
    ).toEqual({ inputPer1M: 1, outputPer1M: 4 });
  });
});
