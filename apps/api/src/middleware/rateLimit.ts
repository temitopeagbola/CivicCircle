import type { Request, Response } from 'express';
import { rateLimit, type Options } from 'express-rate-limit';

import type { ApiErrorBody } from '@civiccircle/shared';

import type { Config } from '../config';

function limiter(windowMs: number, limit: number, what: string, skip?: Options['skip']) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Group IPv6 clients by /56 so one host can't rotate through its whole allocation.
    ipv6Subnet: 56,
    skip,
    handler: (_req: Request, res: Response) => {
      const body: ApiErrorBody = {
        error: {
          code: 'rate_limited',
          message: `Too many ${what} from this network. Please try again in a few minutes.`,
        },
      };
      res.status(429).json(body);
    },
  });
}

/** Per-IP limits. In-memory store: correct for the single Render instance this runs on. */
export function createRateLimiters(config: Config['rateLimits']) {
  return {
    global: limiter(15 * 60_000, config.globalPer15m, 'requests', (req) => req.path === '/health'),
    reports: limiter(60 * 60_000, config.reportsPerHour, 'new reports'),
    comments: limiter(10 * 60_000, config.commentsPer10m, 'comments'),
    demo: limiter(15 * 60_000, config.demoPer15m, 'demo sign-ins'),
  };
}
