import { Router, type RequestHandler } from 'express';

import type { DemoLoginDTO } from '@civiccircle/shared';
import { demoLoginSchema, updateProfileSchema } from '@civiccircle/shared';

import type { AppDeps } from '../deps';
import { toMeDTO } from '../domain/dto';
import { HttpError, parseOrThrow } from '../errors';
import { requireModerator, requireUser } from '../middleware/auth';

export const DEMO_USERS = {
  resident: { id: 'demo-resident', displayName: 'Alex (demo)', role: 'resident' },
  moderator: { id: 'demo-moderator', displayName: 'Sam (demo moderator)', role: 'moderator' },
} as const;

export function accountRoutes(deps: AppDeps, limits: { demo: RequestHandler }): Router {
  const { store, auth, config } = deps;
  const router = Router();

  /** One-click demo sign-in: mints a Firebase custom token for a shared demo account. */
  router.post('/auth/demo', limits.demo, async (req, res) => {
    const { as } = parseOrThrow(demoLoginSchema, req.body ?? {});
    if (!config.demo.enabled) throw new HttpError(404, 'not_found', 'Demo sign-in is disabled');
    if (as === 'moderator' && !config.demo.moderatorEnabled) {
      throw new HttpError(403, 'forbidden', 'The demo moderator account is disabled');
    }
    const demo = DEMO_USERS[as];
    await store.users.ensure({ ...demo, email: null, isDemo: true });
    const body: DemoLoginDTO = {
      customToken: await auth.createDemoToken(demo.id, demo.displayName),
    };
    res.json(body);
  });

  router.get('/me', (req, res) => {
    res.json(toMeDTO(requireUser(req)));
  });

  router.patch('/me', async (req, res) => {
    const user = requireUser(req);
    if (user.isDemo) throw new HttpError(403, 'forbidden', 'Demo accounts cannot be renamed');
    const { displayName } = parseOrThrow(updateProfileSchema, req.body);
    res.json(toMeDTO(await store.users.update(user.id, { displayName })));
  });

  router.get('/admin/ai-usage', async (req, res) => {
    requireModerator(req);
    res.json(await deps.ai.usage());
  });

  return router;
}
