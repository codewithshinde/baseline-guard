import fs from "fs";
import type { WebFeaturesIndex, WebFeature } from "./types";

export function loadWebFeatures(): WebFeaturesIndex {
  const jsonPath = require.resolve("web-features/data/features.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(raw);
  const list: WebFeature[] = Array.isArray(parsed)
    ? parsed
    : parsed.features ?? [];
  const byId = new Map<string, WebFeature>();
  for (const f of list) byId.set(f.id, f);
  return { byId, all: list };
}
