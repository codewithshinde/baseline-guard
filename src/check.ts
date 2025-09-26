import type { WebFeaturesIndex, WebFeature, UnsupportedItem } from "./types";
import { type BLKey, type AgentKey, type MinMap, AGENT_MAP } from "./constants";

/** "16", "16.3", or "16.0-16.3" -> version tuple for comparison */
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
  const sup = f.status?.support as
    | Partial<Record<AgentKey, string>>
    | undefined;
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
 * return structured unsupported entries with min versions.
 */
function findUnsupported(blTargets: string[], mins: MinMap): UnsupportedItem[] {
  const out: UnsupportedItem[] = [];
  for (const t of blTargets) {
    const [nameRaw, ...rest] = t.split(" ");
    const verRaw = rest.join(" ").trim();
    if (!nameRaw || !verRaw) continue;

    const name = nameRaw as BLKey;
    if (!(name in AGENT_MAP)) continue;

    const minStr = mins[name];
    if (!minStr) {
      // No known minimum => mark as unknown support
      out.push({ browser: name, target: verRaw });
      continue;
    }
    if (cmpVersion(verRaw, minStr) < 0) {
      out.push({ browser: name, target: verRaw, min: minStr });
    }
  }
  return out;
}

export function isFeatureSafeForTargets(
  featureId: string,
  blTargets: string[],
  idx: WebFeaturesIndex
): { safe: boolean; reason: string; unsupported?: UnsupportedItem[] } {
  const f = idx.byId.get(featureId);

  if (!f) {
    return { safe: false, reason: `Unknown feature "${featureId}".` };
  }

  // 1) Prefer exact minima if available (most accurate)
  const mins = extractMinimums(f);
  if (mins) {
    const unsupported = findUnsupported(blTargets, mins);
    if (unsupported.length === 0) {
      return {
        safe: true,
        reason: "All targets meet minimum support versions.",
      };
    }
    // Build a helpful reason string too
    const pretty = unsupported
      .map((u) => `${u.browser} ${u.target}${u.min ? ` (< ${u.min})` : ""}`)
      .join(", ");
    return {
      safe: false,
      reason: `Not supported by: ${pretty}`,
      unsupported,
    };
  }

  // 2) If no minima, optionally allow Baseline: high
  const baseline = f.status?.baseline;
  if (baseline === "high") {
    return {
      safe: true,
      reason: "Baseline: high (no per-browser minima found).",
    };
  }

  // 3) Conservative default
  return { safe: false, reason: "No compat minima; conservative fail." };
}
