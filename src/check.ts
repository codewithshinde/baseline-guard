import type { WebFeaturesIndex, WebFeature, Minimums } from "./types";

export function isFeatureSafeForTargets(
  featureId: string,
  targets: string[],
  idx: WebFeaturesIndex
): { safe: boolean; reason: string } {
  const f = idx.byId.get(featureId);
  if (!f) return { safe: true, reason: `Unknown feature "${featureId}".` };

  if (f.status?.baseline === "high") {
    return { safe: true, reason: "Feature is in Baseline (high)." };
  }

  const mins = normalizeMinimums(f);
  if (mins) {
    const unsupported = findUnsupportedTargets(targets, mins);
    if (unsupported.length === 0) {
      return { safe: true, reason: "Meets minimum versions for all targets." };
    }
    return {
      safe: false,
      reason: `Not supported by: ${unsupported.join(", ")}`,
    };
  }

  return { safe: false, reason: "Not in Baseline and no compat info." };
}

function normalizeMinimums(f: WebFeature): Minimums | null {
  const compat = f.compat?.support;
  if (!compat) return null;
  const parse = (v: string | number | undefined) => {
    if (v == null) return undefined;
    const s = String(v).split("-")[0];
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    chrome: parse(compat["chrome"]),
    edge: parse(compat["edge"]),
    firefox: parse(compat["firefox"]),
    safari: parse(compat["safari"]),
    ios_saf: parse(compat["ios_saf"]),
  };
}

function findUnsupportedTargets(resolved: string[], mins: Minimums): string[] {
  const out: string[] = [];
  for (const t of resolved) {
    const [name, verRaw] = t.split(" ");
    const ver = parseFloat((verRaw ?? "").split("-")[0]);
    const min = (mins as any)[name];
    if (typeof min === "number" && ver < min) {
      out.push(`${name} ${verRaw}`);
    }
  }
  return out;
}
