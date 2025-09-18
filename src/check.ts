import type { WebFeaturesIndex, WebFeature } from "./types";

const WF_FROM_BL: Record<
  string,
  keyof NonNullable<NonNullable<WebFeature["status"]>["support"]>
> = {
  chrome: "chrome",
  edge: "edge",
  firefox: "firefox",
  safari: "safari",
  ios_saf: "safari_ios",
};

type MinMap = Partial<Record<keyof typeof WF_FROM_BL, number>>;

export function isFeatureSafeForTargets(
  featureId: string,
  blTargets: string[],
  idx: WebFeaturesIndex
): { safe: boolean; reason: string } {
  const f = idx.byId.get(featureId);
  if (!f)
    return { safe: true, reason: `Unknown feature "${featureId}" (skipping).` };

  // 1) Prefer exact minima if available (most accurate)
  const mins = extractMinimums(f);
  if (mins) {
    const unsupported = findUnsupported(blTargets, mins);
    if (unsupported.length === 0) {
      return { safe: true, reason: "Meets minimum versions for all targets." };
    }
    return {
      safe: false,
      reason: `Not supported by: ${unsupported.join(", ")}`,
    };
  }

  // 2) Fall back to Baseline flag if minima are missing
  const baseline = f.status?.baseline;
  if (baseline === "high" || baseline === "low") {
    return { safe: true, reason: `Feature is Baseline (${baseline}).` };
  }

  // 3) Conservative default
  return { safe: false, reason: "Not Baseline and no support data available." };
}

function extractMinimums(f: WebFeature): MinMap | null {
  const sup = f.status?.support;
  if (!sup) return null;

  const parse = (v: string | undefined) => {
    if (!v) return undefined;
    const first = v.split("-")[0]; // handle ranges like "17.1-17.4"
    const num = parseFloat(first);
    return Number.isFinite(num) ? num : undefined;
  };

  return {
    chrome: parse(sup.chrome),
    edge: parse(sup.edge),
    firefox: parse(sup.firefox),
    safari: parse(sup.safari),
    ios_saf: parse(sup.safari_ios),
  };
}

function findUnsupported(blTargets: string[], mins: MinMap): string[] {
  const out: string[] = [];
  for (const t of blTargets) {
    const [name, verRaw] = t.split(" ");
    const ver = parseFloat((verRaw ?? "").split("-")[0]);
    const key = WF_FROM_BL[name];
    const min = key ? mins[name as keyof typeof WF_FROM_BL] : undefined;
    if (typeof min === "number" && Number.isFinite(ver) && ver < min) {
      out.push(`${name} ${verRaw}`);
    }
  }
  return out;
}
