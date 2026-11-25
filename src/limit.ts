const seen = new Map<string, { n: number; until: number }>();

function entry(key: string, windowMs: number) {
  const now = Date.now();
  let e = seen.get(key);
  if (!e || e.until < now) {
    e = { n: 0, until: now + windowMs };
    seen.set(key, e);
  }
  if (seen.size > 20_000) for (const [k, v] of seen) if (v.until < now) seen.delete(k);
  return e;
}

export function blockedFor(key: string, max: number, windowMs: number): number {
  const e = entry(key, windowMs);
  return e.n >= max ? Math.ceil((e.until - Date.now()) / 1000) : 0;
}

export function countTry(key: string, windowMs: number) {
  entry(key, windowMs).n++;
}

export function forget(key: string) {
  seen.delete(key);
}
