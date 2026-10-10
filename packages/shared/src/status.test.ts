import { describe, expect, it } from 'vitest';

import { STATUSES } from './constants';
import { createReportSchema, listReportsQuerySchema, updateStatusSchema } from './schemas';
import { canTransition, isActiveStatus, nextStatuses } from './status';

describe('status workflow', () => {
  it('never allows a no-op transition', () => {
    for (const s of STATUSES) expect(canTransition(s, s)).toBe(false);
  });

  it('only lets closed reports be reopened', () => {
    expect(nextStatuses('resolved')).toEqual(['open']);
    expect(nextStatuses('duplicate')).toEqual(['open']);
    expect(canTransition('resolved', 'in_progress')).toBe(false);
  });

  it('treats resolved and duplicate as inactive', () => {
    expect(STATUSES.filter(isActiveStatus)).toEqual(['open', 'acknowledged', 'in_progress']);
  });
});

describe('schemas', () => {
  it('coerces multipart strings and trims text', () => {
    const parsed = createReportSchema.parse({
      description: '  Deep pothole by the bus stop  ',
      lat: '51.5',
      lng: '-0.09',
      address: '  ',
    });
    expect(parsed).toEqual({ description: 'Deep pothole by the bus stop', lat: 51.5, lng: -0.09 });
  });

  it('rejects out-of-range coordinates and short descriptions', () => {
    const result = createReportSchema.safeParse({ description: 'hole', lat: 91, lng: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(['description', 'lat']);
  });

  it('applies list defaults', () => {
    expect(listReportsQuerySchema.parse({})).toEqual({ sort: 'new', limit: 20, mine: false });
  });

  it('drops empty status notes', () => {
    expect(updateStatusSchema.parse({ status: 'resolved', note: ' ' })).toEqual({
      status: 'resolved',
    });
  });
});
