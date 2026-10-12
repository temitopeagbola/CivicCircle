/**
 * Tracks whether the API looks asleep. Render's free tier spins services down when idle and
 * the first request can take 30–60 s, so when a request is slow *and* we have not heard from
 * the server yet this session, the UI shows a "waking the server" banner instead of a spinner
 * that looks broken.
 */
export interface ApiStatusState {
  inFlight: number;
  /** A request has been pending longer than `slowMs` and the server has not answered yet. */
  waking: boolean;
  /** The server has answered at least once this session. */
  awake: boolean;
}

type Timer = ReturnType<typeof setTimeout>;

export function createApiStatusStore(
  slowMs = 2_500,
  schedule: (fn: () => void, ms: number) => Timer = setTimeout,
  cancel: (t: Timer) => void = clearTimeout,
) {
  let state: ApiStatusState = { inFlight: 0, waking: false, awake: false };
  const listeners = new Set<() => void>();
  const timers = new Map<number, Timer>();
  let nextId = 0;

  const set = (patch: Partial<ApiStatusState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Call when a request starts; returns a handle for `end`. */
    start(): number {
      const id = ++nextId;
      if (!state.awake) {
        timers.set(
          id,
          schedule(() => {
            if (!state.awake) set({ waking: true });
          }, slowMs),
        );
      }
      set({ inFlight: state.inFlight + 1 });
      return id;
    },
    /** `answered` = the server sent an HTTP response (a 4xx still means it is awake). */
    end(id: number, answered: boolean) {
      const timer = timers.get(id);
      if (timer !== undefined) cancel(timer);
      timers.delete(id);
      const inFlight = Math.max(0, state.inFlight - 1);
      if (answered) set({ inFlight, awake: true, waking: false });
      else set({ inFlight, waking: inFlight > 0 && state.waking });
    },
  };
}

export const apiStatus = createApiStatusStore();
