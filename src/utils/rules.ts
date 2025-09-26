// utils/rules.ts
import { PACKS } from "../constants";
import type { Rule, WireRule } from "../types";
import { readBaselineConfig } from "./config";

/** Keep only valid JS regex flags, preserve order, dedupe, and ensure 'g'. */
function normalizeFlags(flags?: string): string {
  if (!flags) return "g";
  const valid = new Set(Array.from("gimsuydv")); // includes d (hasIndices) + v (Unicode sets)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of flags) {
    if (!valid.has(ch)) continue;
    if (!seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  if (!seen.has("g")) out.push("g");
  return out.join("");
}

/** Compile a WireRule (from JSON) into a runtime Rule. Returns null on error. */
function compileWireRule(r: WireRule): Rule | null {
  try {
    const flags = normalizeFlags(r.flags);
    const regex = new RegExp(r.pattern, flags);
    return {
      id: r.id,
      featureId: r.featureId,
      files: r.files,
      regex,
      message: r.message,
      tags: r.tags,
      docs: r.docs,
    };
  } catch (e: any) {
    console.error(
      `Invalid regex for rule "${r?.id ?? "<unknown>"}": ${e?.message ?? e}`
    );
    return null;
  }
}

/** Load inline rules from baseline.config.json (if present) and compile them. */
export function loadInlineRulesFromConfig(cwd: string): Rule[] {
  const cfg = readBaselineConfig(cwd);
  const wire = cfg?.rules;
  if (!wire?.length) return [];
  const out: Rule[] = [];
  for (const r of wire as WireRule[]) {
    const compiled = compileWireRule(r);
    if (compiled) out.push(compiled);
  }
  return out;
}

/** Merge core + inline; inline overrides core on id collision. */
export function mergeRules(core: Rule[], extras: Rule[]): Rule[] {
  const map = new Map(core.map((r) => [r.id, r]));
  for (const r of extras) map.set(r.id, r);
  return [...map.values()];
}

/** Convenience helper used by CLI to get merged rules. */
export function getAllRules(core: Rule[], cwd: string): Rule[] {
  const inline = loadInlineRulesFromConfig(cwd);
  return mergeRules(core, inline);
}

export function selectRules(
  allRules: Rule[],
  {
    pack,
    tags,
    only,
    exclude,
  }: { pack?: string; tags: string[]; only: string[]; exclude: string[] }
): Rule[] {
  // 1) base selection: pack or ALL
  let selected =
    pack && PACKS[pack]
      ? allRules.filter((r) => new Set(PACKS[pack]).has(r.id))
      : allRules.slice();

  // 2) refine by tags / only / exclude (if provided)
  if (tags.length)
    selected = selected.filter((r) =>
      tags.some((t) => (r.tags as string[]).includes(t))
    );
  if (only.length) {
    const set = new Set(only);
    selected = selected.filter((r) => set.has(r.id));
  }
  if (exclude.length) {
    const set = new Set(exclude);
    selected = selected.filter((r) => !set.has(r.id));
  }
  return selected;
}
