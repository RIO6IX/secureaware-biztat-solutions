// Small in-memory sliding-window limiter, keyed per user and action. The app runs as a
// single process, so memory is enough; a multi-instance deployment would need a shared store.
export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map();
  return function allow(key, now = Date.now()) {
    const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - recent[0])) / 1000) };
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 10_000) hits.delete(hits.keys().next().value);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}
