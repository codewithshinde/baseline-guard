import type { Rule, WireRule } from "../types";
import { readBaselineConfig } from "./config";

export function loadInlineRulesFromConfig(cwd: string): Rule[] {
  const cfg = readBaselineConfig(cwd);
  const wire = cfg?.rules;
  if (!wire?.length) return [];

  const out: Rule[] = [];
  for (const r of wire as WireRule[]) {
    try {
      const flags = r.flags && r.flags.includes("g") ? r.flags : (r.flags ? r.flags + "g" : "g");
      const regex = new RegExp(r.pattern, flags);
      out.push({
        id: r.id,
        featureId: r.featureId,
        files: r.files,
        regex,
        message: r.message,
        tags: r.tags,
        docs: r.docs,
      });
    } catch (e: any) {
      console.error(`Invalid regex for rule "${r?.id ?? "<unknown>"}": ${e?.message ?? e}`);
    }
  }
  return out;
}

/** Merge core + inline; inline overrides core on id collision. */
export function mergeRules(core: Rule[], extras: Rule[]): Rule[] {
  const map = new Map(core.map((r) => [r.id, r]));
  for (const r of extras) map.set(r.id, r);
  return [...map.values()];
}

/** Convenience helper used by CLI. */
export function getAllRules(core: Rule[], cwd: string): Rule[] {
  const inline = loadInlineRulesFromConfig(cwd);
  return mergeRules(core, inline);
}
