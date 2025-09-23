import type { WebFeaturesIndex, WebFeature } from "./types";

/** Browserslist keys -> web-features agent keys */
type BLKey = "chrome" | "edge" | "firefox" | "safari" | "ios_saf";
type AgentKey = "chrome" | "edge" | "firefox" | "safari" | "safari_ios";

const AGENT_MAP: Record<BLKey, AgentKey> = {
  chrome: "chrome",
  edge: "edge",
  firefox: "firefox",
  safari: "safari",
  ios_saf: "safari_ios",
};

type MinMap = Partial<Record<BLKey, string>>;

/** Parse "16", "16.3", or "16.0-16.3" into a comparable tuple. */
function parseVersionTuple(input: string): number[] {
  const token = input.includes("-") ? input.split("-")[1] : input;
  const cleaned = token.replace(/[^\d.]/g, "");
  return cleaned.split(".").map((n) => Number(n || 0));
}

/** Compare version strings like "16.3" < "16.4" */
function cmpVersion(a: string, b: string): number {
  const A = parseVersionTuple(a);
  const B = parseVersionTuple(b);
  const L = Math.max(A.length, B.length);
  for (let i = 0; i < L; i++) {
    const ai = A[i] ?? 0;
    const bi = B[i] ?? 0;
    if (ai < bi) return -1;
    if (ai > bi) return 1;
  }
  return 0;
}

/** Pull per-browser minimum support versions from web-features. */
function extractMinimums(f: WebFeature): MinMap | null {
  const sup = f.status?.support as Partial<Record<AgentKey, string>> | undefined;
  if (!sup) return null;

  const pick = (k: AgentKey): string | undefined => sup?.[k];

  const out: MinMap = {
    chrome: pick("chrome"),
    edge: pick("edge"),
    firefox: pick("firefox"),
    safari: pick("safari"),
    ios_saf: pick("safari_ios"),
  };
  return out;
}

/**
 * Given Browserslist-resolved targets like ["safari 16.0","safari 16.3","ios_saf 16.1", ...]
 * determine which are below the minima.
 */
function findUnsupported(blTargets: string[], mins: MinMap): string[] {
  const out: string[] = [];
  for (const t of blTargets) {
    const [nameRaw, ...rest] = t.split(" ");
    const verRaw = rest.join(" ").trim();
    if (!nameRaw || !verRaw) continue;

    // Only check keys we know how to map
    if (!(nameRaw as BLKey in AGENT_MAP)) continue;
    const name = nameRaw as BLKey;

    const minStr = mins[name];
    if (!minStr) {
      out.push(`${name} ${verRaw} (unknown support)`);
      continue;
    }
    if (cmpVersion(verRaw, minStr) < 0) {
      out.push(`${name} ${verRaw} (< ${minStr})`);
    }
  }
  return out;
}

export function isFeatureSafeForTargets(
  featureId: string,
  blTargets: string[],
  idx: WebFeaturesIndex
): { safe: boolean; reason: string } {
  const f = idx.byId.get(featureId);

  if (!f) {
    return { safe: false, reason: `Unknown feature "${featureId}".` };
  }

  // 1) Prefer exact minima if available (most accurate)
  const mins = extractMinimums(f);
  if (mins) {
    const unsupported = findUnsupported(blTargets, mins);
    if (unsupported.length === 0) {
      return { safe: true, reason: "All targets meet minimum support versions." };
    }
    return { safe: false, reason: `Not supported by: ${unsupported.join(", ")}` };
  }

  // 2) If no minima, optionally allow Baseline: high
  const baseline = f.status?.baseline;
  if (baseline === "high") {
    return { safe: true, reason: "Baseline: high (no per-browser minima found)." };
  }

  // 3) Conservative default
  return { safe: false, reason: "No compat minima; conservative fail." };
}
