import type { NextFunction, Request, Response } from 'express';

import type { AuthService } from '../auth/firebase';
import { forbidden, unauthorized } from '../errors';
import type { Store, UserRecord } from '../store/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

/**
 * Optional authentication: attaches `req.user` when a valid Firebase ID token is present.
 * A present-but-invalid token is a 401 (the client should refresh), not an anonymous request.
 */
export function authenticate(auth: AuthService, store: Store) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.get('authorization');
    if (!header) return next();
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) throw unauthorized('Malformed Authorization header');

    let token;
    try {
      token = await auth.verifyIdToken(match[1]!);
    } catch {
      throw unauthorized('Your session has expired. Please sign in again.');
    }
    req.user = await store.users.ensure({
      id: token.uid,
      displayName: token.name ?? token.email?.split('@')[0] ?? 'Resident',
      role: 'resident',
      email: token.email,
      isDemo: false,
    });
    next();
  };
}

export function requireUser(req: Request): UserRecord {
  if (!req.user) throw unauthorized();
  return req.user;
}

export function requireModerator(req: Request): UserRecord {
  const user = requireUser(req);
  if (user.role !== 'moderator') throw forbidden('Only moderators can do that');
  return user;
}
