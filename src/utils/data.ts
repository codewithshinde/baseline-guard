import type { WebFeaturesIndex, WebFeature } from "../types";
import { features as wfFeatures } from "web-features";

export function loadWebFeatures(): WebFeaturesIndex {
  const byId = new Map<string, WebFeature>();
  for (const [id, f] of Object.entries(wfFeatures as Record<string, WebFeature>)) {
    byId.set(id, f);
  }
  return { byId, allIds: [...byId.keys()] };
}

