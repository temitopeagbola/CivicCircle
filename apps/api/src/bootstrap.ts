import { pino } from 'pino';

import { createMockProvider } from './ai/mock';
import { createOpenAiProvider } from './ai/openai';
import { AiService } from './ai/service';
import { createFirebaseAuthService } from './auth/firebase';
import type { Config } from './config';
import type { AppDeps } from './deps';
import { initFirebase } from './firebase';
import { createFirebasePhotoStorage } from './storage/photos';
import { createFirestoreStore } from './store/firestore';

export const VERSION =
  process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? process.env.npm_package_version ?? 'dev';

/** Wire the production dependencies (Firebase + OpenAI or the mock provider). */
export function buildDeps(config: Config): AppDeps {
  const logger = pino({ level: config.logLevel, timestamp: pino.stdTimeFunctions.isoTime });
  const firebase = initFirebase(config.firebase);
  const store = createFirestoreStore(firebase.db);

  const primary =
    config.ai.provider === 'openai' && config.ai.openaiApiKey
      ? createOpenAiProvider({
          apiKey: config.ai.openaiApiKey,
          model: config.ai.model,
          embeddingModel: config.ai.embeddingModel,
          moderationModel: config.ai.moderationModel,
          vision: config.ai.vision,
          timeoutMs: config.ai.timeoutMs,
        })
      : null;

  const ai = new AiService({
    primary,
    fallback: createMockProvider(),
    budget: store.budget,
    monthlyBudgetUsd: config.ai.monthlyBudgetUsd,
    priceOverride: config.ai.priceOverride,
    timeoutMs: config.ai.timeoutMs,
    logger,
  });

  return {
    config,
    store,
    ai,
    photos: createFirebasePhotoStorage(
      firebase.storage,
      config.firebase.storageBucket,
      config.firebase.storagePublicUrl,
    ),
    auth: createFirebaseAuthService(firebase.auth),
    logger,
    now: () => new Date(),
    version: VERSION,
  };
}
