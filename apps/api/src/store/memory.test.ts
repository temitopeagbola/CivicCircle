import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor } from './cursor';
import { storeContract } from './contract';
import { createMemoryStore } from './memory';

storeContract('memory', () => createMemoryStore());

describe('cursor encoding', () => {
  it('round-trips and rejects tampered cursors', () => {
    const cursor = { createdAt: '2026-09-01T10:00:00.000Z', id: 'abc', upvoteCount: 3 };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
    expect(decodeCursor(undefined)).toBeUndefined();
    expect(() => decodeCursor('not-a-cursor')).toThrow('Invalid pagination cursor');
    expect(() => decodeCursor(Buffer.from('{"id":1}').toString('base64url'))).toThrow();
  });
});
