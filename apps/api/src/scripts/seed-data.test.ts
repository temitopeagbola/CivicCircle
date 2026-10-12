import { describe, expect, it } from 'vitest';

import { classifyText } from '../ai/mock';
import { SEED_REPORTS, SEED_USERS } from './seed-data';

describe('seed data', () => {
  it.each(SEED_REPORTS.map((r) => [r.id, r] as const))(
    '%s is classified as its expected category',
    (_id, report) => {
      expect(classifyText(`${report.description}. ${report.address}`).category).toBe(
        report.expectedCategory,
      );
    },
  );

  it('only references known users', () => {
    const ids = new Set(SEED_USERS.map((u) => u.id));
    for (const r of SEED_REPORTS) {
      expect(ids).toContain(r.author);
      for (const c of r.comments ?? []) expect(ids).toContain(c.author);
    }
  });
});
