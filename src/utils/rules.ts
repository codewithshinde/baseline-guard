import pc from "picocolors";
import { PACKS } from "../constants";
import type { EvalSafetyFn, Rule, WebFeaturesIndex, WireRule } from "../types";
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

/** Map tags → normalized type for display. */
export function ruleTypeFromTags(tags?: string[]): string {
  if (!tags?.length) return "OTHER";
  if (tags.includes("css")) return "CSS";
  if (tags.includes("html")) return "HTML";
  if (tags.includes("js")) return "JS";
  return (tags[0] ?? "other").toUpperCase();
}

/**
 * Render the rules table with row-level highlighting.
 *
 * Behavior:
 * - If `opts.highlightFeatureIds` is provided (normal run after scan), highlight rows red
 *   when the featureId was actually involved in a finding.
 * - Else (e.g., `--list-rules` pre-scan), and if `evalSafety` is provided,
 *   highlight rows red **only** when minima clearly fail (i.e., evalSafety().unsupported exists).
 *   Unknown/no-minima cases are NOT highlighted.
 */
export function renderRulesTable(
  title: string,
  rules: Rule[],
  enabledIds: Set<string>,
  packLabel: string,
  targetsResolved: string[],
  featuresIdx: WebFeaturesIndex,
  opts?: {
    highlightFeatureIds?: Set<string>;
    evalSafety?: EvalSafetyFn;
  }
) {
  const headers = [
    "Web Feature ID",
    "Rule",
    "Checked",
    "Rule Type",
    "Tags",
    "Pack",
  ];

  // Precompute minima-based red flags when no highlight set provided
  const redByMinima = new Set<string>(); // rule.id
  if (!opts?.highlightFeatureIds && opts?.evalSafety) {
    for (const r of rules) {
      const d = opts.evalSafety(r.featureId, targetsResolved, featuresIdx);
      if (!d.safe && (d as any).unsupported?.length) {
        redByMinima.add(r.id);
      }
    }
  }

  const rowsRaw = rules
    .map((r) => [
      r.featureId || "",
      r.id,
      enabledIds.has(r.id) ? "Yes" : "No",
      ruleTypeFromTags(r.tags as string[] | undefined),
      (r.tags as string[] | undefined)?.join(", ") ?? "",
      packLabel,
    ])
    .sort((a, b) =>
      a[3] === b[3]
        ? String(a[1]).localeCompare(String(b[1]))
        : String(a[3]).localeCompare(String(b[3]))
    );

  // compute widths from uncolored data
  const widths = headers.map((h) => h.length);
  for (const row of rowsRaw)
    row.forEach((c, i) => (widths[i] = Math.max(widths[i], String(c).length)));

  const pad = (s: string, w: number) => s + " ".repeat(w - s.length);
  const bar = (l: string, m: string, r: string, fill = "─") =>
    `${l}${widths.map((w) => fill.repeat(w + 2)).join(m)}${r}`;

  console.log(pc.cyan(title));
  console.log(bar("┌", "┬", "┐"));
  console.log(
    "│ " + headers.map((h, i) => pad(h, widths[i])).join(" │ ") + " │"
  );
  console.log(bar("├", "┼", "┤"));

  for (const row of rowsRaw) {
    const featureId = String(row[0]);
    const ruleId = String(row[1]);

    const line =
      "│ " + row.map((c, i) => pad(String(c), widths[i])).join(" │ ") + " │";

    const isRed =
      (opts?.highlightFeatureIds && opts.highlightFeatureIds.has(featureId)) ||
      (!opts?.highlightFeatureIds && redByMinima.has(ruleId));

    console.log(isRed ? pc.red(line) : line);
  }

  console.log(bar("└", "┴", "┘"));
}
