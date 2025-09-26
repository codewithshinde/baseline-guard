// utils/reporting.ts
import { formatNumber, parseNumberSpan } from "./shared";
import { UnsupportedItem } from "../types";

/** Group browserslist targets into { [browser]: [versions...] } with unique, sorted versions. */
export function groupTargets(
  browserTargets: string[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const entry of browserTargets) {
    const [browserName, ...versionParts] = entry.split(" ");
    const version = versionParts.join(" ").trim();
    if (!browserName || !version) continue;
    (grouped[browserName] ||= []).push(version);
  }

  for (const browserName in grouped) {
    const versions = grouped[browserName];
    const uniqueSorted = Array.from(new Set(versions)).sort((a, b) =>
      a.localeCompare(b)
    );
    grouped[browserName] = uniqueSorted;
  }

  return grouped;
}

/** Parse a numeric span (alias kept for API compatibility). */
export function parseSpan(token: string): [number, number] {
  return parseNumberSpan(token);
}

/** Pretty number formatting (alias kept for API compatibility). */
export function numFmt(n: number): string {
  return formatNumber(n);
}

/** Summarize a list of version spans into a single min–max range and count. */
export function summarizeTargetsSpan(targets: string[]): {
  range: string;
  count: number;
} {
  if (!targets.length) return { range: "", count: 0 };
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const t of targets) {
    const [a, b] = parseSpan(t);
    lo = Math.min(lo, a);
    hi = Math.max(hi, b);
  }
  return { range: `${numFmt(lo)}–${numFmt(hi)}`, count: targets.length };
}

/** Produce human-readable lines explaining unsupported targets per browser. */
export function prettyUnsupportedLines(
  items: UnsupportedItem[],
  labelMapLocal: Record<string, string>
): string[] {
  const by = new Map<string, { targets: string[]; mins: string[] }>();
  for (const u of items) {
    const g = by.get(u.browser) ?? { targets: [], mins: [] };
    g.targets.push(u.target);
    if (u.min) g.mins.push(u.min);
    by.set(u.browser, g);
  }

  const lines: string[] = [];
  for (const [browser, { targets, mins }] of by) {
    const label = labelMapLocal[browser] ?? browser;
    const { range, count } = summarizeTargetsSpan(targets);
    const minReq = mins.length
      ? mins.reduce((a, b) => (Number(a) > Number(b) ? a : b))
      : undefined;

    if (minReq) {
      lines.push(
        `${label}: requires ≥ ${minReq} (your targets include ${range}, ${count} version${
          count > 1 ? "s" : ""
        })`
      );
    } else {
      lines.push(
        `${label}: unsupported in your targets (${range}, ${count} version${
          count > 1 ? "s" : ""
        }; minimum unknown)`
      );
    }
  }
  return lines;
}
