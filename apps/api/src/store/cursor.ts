import { z } from 'zod';

import { badRequest } from '../errors';
import type { Cursor } from './types';

const cursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.string().min(1).max(128),
  upvoteCount: z.number().int().nonnegative().optional(),
});

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(raw: string | undefined): Cursor | undefined {
  if (!raw) return undefined;
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
  } catch {
    throw badRequest('Invalid pagination cursor');
  }
}
