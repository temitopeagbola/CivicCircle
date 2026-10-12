import type { Logger } from 'pino';

import type { AiService } from './ai/service';
import type { AuthService } from './auth/firebase';
import type { Config } from './config';
import type { PhotoStorage } from './storage/photos';
import type { Store } from './store/types';

/** Everything the HTTP layer needs. Production wires Firebase/OpenAI; tests pass fakes. */
export interface AppDeps {
  config: Config;
  store: Store;
  ai: AiService;
  photos: PhotoStorage;
  auth: AuthService;
  logger: Logger;
  now: () => Date;
  version: string;
}
