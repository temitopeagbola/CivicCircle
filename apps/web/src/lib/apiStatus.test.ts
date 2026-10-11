import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiStatusStore } from './apiStatus';

describe('api status (waking banner)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows "waking" only when the first request is slow', () => {
    const store = createApiStatusStore(2_500);
    const id = store.start();
    vi.advanceTimersByTime(2_000);
    expect(store.getState().waking).toBe(false);
    vi.advanceTimersByTime(600);
    expect(store.getState()).toEqual({ inFlight: 1, waking: true, awake: false });
    store.end(id, true);
    expect(store.getState()).toEqual({ inFlight: 0, waking: false, awake: true });
  });

  it('never shows "waking" once the server has answered', () => {
    const store = createApiStatusStore(2_500);
    store.end(store.start(), true);
    store.start();
    vi.advanceTimersByTime(10_000);
    expect(store.getState().waking).toBe(false);
  });

  it('does not flash for fast responses', () => {
    const store = createApiStatusStore(2_500);
    const seen: boolean[] = [];
    store.subscribe(() => seen.push(store.getState().waking));
    store.end(store.start(), true);
    vi.advanceTimersByTime(5_000);
    expect(seen).not.toContain(true);
  });

  it('clears "waking" when the last request fails without an answer', () => {
    const store = createApiStatusStore(1_000);
    const a = store.start();
    const b = store.start();
    vi.advanceTimersByTime(1_500);
    store.end(a, false);
    expect(store.getState().waking).toBe(true);
    store.end(b, false);
    expect(store.getState()).toMatchObject({ inFlight: 0, waking: false, awake: false });
  });
});
