import { describe, expect, it } from 'vitest';

import { formatDistance, formatPercent, formatUsd, initials, pluralize, timeAgo } from './format';

const NOW = new Date('2026-10-10T12:00:00Z');

describe('format helpers', () => {
  it('formats relative times', () => {
    expect(timeAgo('2026-10-10T11:59:50Z', NOW)).toBe('just now');
    expect(timeAgo('2026-10-10T11:55:00Z', NOW)).toBe('5 minutes ago');
    expect(timeAgo('2026-10-10T09:00:00Z', NOW)).toBe('3 hours ago');
    expect(timeAgo('2026-10-09T12:00:00Z', NOW)).toBe('yesterday');
    expect(timeAgo('2026-09-26T12:00:00Z', NOW)).toBe('2 weeks ago');
  });

  it('formats distances, percentages and money', () => {
    expect(formatDistance(39.4)).toBe('39 m');
    expect(formatDistance(1520)).toBe('1.5 km');
    expect(formatDistance(25_400)).toBe('25 km');
    expect(formatPercent(0.837)).toBe('84%');
    expect(formatUsd(1.5)).toBe('$1.50');
    expect(formatUsd(0.00042)).toBe('$0.0004');
  });

  it('builds initials and plurals', () => {
    expect(initials('Sam (demo moderator)')).toBe('S');
    expect(initials('Priya Kumar')).toBe('PK');
    expect(initials('  ')).toBe('?');
    expect(pluralize(1, 'comment')).toBe('1 comment');
    expect(pluralize(3, 'reply', 'replies')).toBe('3 replies');
  });
});
