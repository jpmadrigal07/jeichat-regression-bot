export const REVIEW_DELAY_MS = 15_000;

export function createReviewDebouncer(options = {}) {
  const delayMs = options.delayMs ?? REVIEW_DELAY_MS;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  const timers = new Map();

  return {
    schedule(ticketId, run) {
      const existing = timers.get(ticketId);
      if (existing !== undefined) clearTimeoutFn(existing);
      const handle = setTimeoutFn(() => {
        timers.delete(ticketId);
        run();
      }, delayMs);
      timers.set(ticketId, handle);
    },
    cancel(ticketId) {
      const existing = timers.get(ticketId);
      if (existing === undefined) return;
      clearTimeoutFn(existing);
      timers.delete(ticketId);
    },
    has(ticketId) {
      return timers.has(ticketId);
    },
  };
}
