/** Replace en dash with ASCII dash to normalize ranges. */
export function normalizeDash(token: string): string {
  return token.replace(/–/g, "-");
}

/** Parse a version span like "16", "16-16.3" into [lo, hi] numbers. */
export function parseNumberSpan(token: string): [number, number] {
  const t = normalizeDash(token);
  const [a, b] = t.split("-");
  const lo = Number.parseFloat(a);
  const hi = b ? Number.parseFloat(b) : lo;
  return [lo, hi];
}

/** Format a number with up to 2 decimals, trimming trailing zeros. */
export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}
