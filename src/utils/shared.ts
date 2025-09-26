import { labelMap } from "../constants";
import { UnsupportedItem } from "../types";
import { prettyUnsupportedLines } from "./reporting";

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

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderUnsupportedHTML(p: any): string {
  const unsupported = p?.unsupported as
    | { browser: string; target: string; min?: string }[]
    | undefined;

  if (unsupported?.length) {
    const lines = prettyUnsupportedLines(
      unsupported as UnsupportedItem[],
      labelMap
    );
    // bullet list for readability
    return `<ul class="compact">${lines
      .map((l) => `<li>${esc(l)}</li>`)
      .join("")}</ul>`;
  }
  return esc(p?.reason ?? "—");
}
