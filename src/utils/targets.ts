import * as fs from "fs";
import * as path from "path";
import browserslist from "browserslist";
import type { ResolvedTargets, Mode, BrowserKey } from "../types";
import { BASELINE_CONFIG_FILENAME, readBaselineConfig } from "./config";
import { fallback, labelMap, preferredBrowsers } from "../constants";
import { parseNumberSpan, formatNumber } from "./shared";

/** Resolve project "targets" from config/package/browserslist with a clear source label. */
export function loadTargets(cwd: string): ResolvedTargets {
  const defaultMode: Mode = "warn";

  // 1) baseline.config.json
  const cfg = readBaselineConfig(cwd);
  if (cfg?.targets?.length) {
    return {
      source: BASELINE_CONFIG_FILENAME,
      query: cfg.targets,
      resolved: browserslist(cfg.targets, { path: cwd }),
      mode: cfg.mode ?? defaultMode,
    };
  }

  // 2) package.json:baseline.targets
  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg?.baseline?.targets) {
        const q = pkg.baseline.targets as string[];
        return {
          source: "package.json:baseline",
          query: q,
          resolved: browserslist(q, { path: cwd }),
          mode: pkg.baseline.mode ?? defaultMode,
        };
      }

      // 3) Browserslist config (package.json/.browserslistrc)
      const resolved = browserslist(undefined, { path: cwd });
      if (resolved?.length) {
        return {
          source: "browserslist",
          query: ["<browsersl ist>"],
          resolved,
          mode: defaultMode,
        };
      }
    } catch {
      // ignore malformed package.json and fall through
    }
  }

  // 4) Fallback preset
  return {
    source: "fallback",
    query: fallback,
    resolved: browserslist(fallback, { path: cwd }),
    mode: defaultMode,
  };
}

/** Format a number nicely for display (up to 2 decimals). */
export function formatNum(n: number): string {
  return formatNumber(n);
}

/** Parse a numeric range token like "16" or "16-16.3" → [lo, hi]. */
export function parseRangeNumber(token: string): [number, number] {
  return parseNumberSpan(token);
}

/** Summarize a browserslist array into per-browser min/max/count rows. */
export function summarizeTargets(resolved: string[]) {
  const groups = new Map<
    BrowserKey,
    { min: number; max: number; count: number }
  >();

  for (const entry of resolved) {
    const [name, verRaw = ""] = entry.split(" ");
    if (!name || !verRaw) continue;
    const [lo, hi] = parseRangeNumber(verRaw);
    const g = groups.get(name as BrowserKey) ?? { min: lo, max: hi, count: 0 };
    g.min = Math.min(g.min, lo);
    g.max = Math.max(g.max, hi);
    g.count += 1;
    groups.set(name as BrowserKey, g);
  }

  const others = [...groups.keys()]
    .filter((k) => !preferredBrowsers.includes(k))
    .sort();

  const ordered = [
    ...preferredBrowsers.filter((k) => groups.has(k)),
    ...others,
  ];

  const rows = ordered.map((key) => {
    const g = groups.get(key)!;
    const label = labelMap[key] ?? key;
    const range = `${formatNum(g.min)}–${formatNum(g.max)}`;
    return { browser: label, range, count: g.count };
  });

  return rows;
}
