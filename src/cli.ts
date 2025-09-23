#!/usr/bin/env node
import fs from "fs";
import path from "path";
import fg from "fast-glob";
import pc from "picocolors";

import { loadWebFeatures } from "./data";
import { RULES, PACKS } from "./rules";
import { loadTargets } from "./targets";
import { isFeatureSafeForTargets } from "./check";
import type { Rule, Finding, Report, BrowserKey } from "./types";
import {
  buildJsonReport,
  getReportTemplate,
  renderMarkdownReport,
} from "./report";
import { ensureDirFor, timestampSlug } from "./utils";

const args = process.argv.slice(2);
const arg = (k: string) =>
  args.find((a) => a.startsWith(`${k}=`))?.split("=")[1];

const only = (arg("--only") ?? "").split(",").filter(Boolean);
const exclude = (arg("--exclude") ?? "").split(",").filter(Boolean);
const tags = (arg("--tags") ?? "").split(",").filter(Boolean);
const pack = arg("--pack"); // default to "all" later if not provided
const listRules = args.includes("--list-rules");
const watch = args.includes("--watch");

// Output format
const format = (arg("--format") ?? "pretty") as "pretty" | "json";

// Report flags
const listChecked = args.includes("--list-checked");
const reportKind = (arg("--report") ?? "").toLowerCase() as "" | "json" | "md" | "html";
const outPathArg = arg("--out");
const saveFlag = args.includes("--save");

/* ============================
   Targets table utilities
============================ */

const LABELS: Record<string, string> = {
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  safari: "Safari",
  ios_saf: "iOS Safari",
};

function parseRangeNumber(token: string): [number, number] {
  const t = token.replace("–", "-");
  const [a, b] = t.split("-");
  const lo = Number.parseFloat(a);
  const hi = b ? Number.parseFloat(b) : lo;
  return [lo, hi];
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

function summarizeTargets(resolved: string[]) {
  const groups = new Map<BrowserKey, { min: number; max: number; count: number }>();

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

  const preferred: BrowserKey[] = ["chrome", "edge", "firefox", "safari", "ios_saf"];
  const others = [...groups.keys()].filter((k) => !preferred.includes(k)).sort();
  const ordered = [...preferred.filter((k) => groups.has(k)), ...others];

  const rows = ordered.map((key) => {
    const g = groups.get(key)!;
    const label = LABELS[key] ?? key;
    const range = `${formatNum(g.min)}–${formatNum(g.max)}`;
    return { browser: label, range, count: g.count };
  });

  return rows;
}

function printTargetsTable(resolved: string[]) {
  const rows = summarizeTargets(resolved);
  if (rows.length === 0) return;

  const headers = ["Browser", "Versions (min–max)", "Count"];
  const data = rows.map((r) => [r.browser, r.range, String(r.count)]);
  const widths = [0, 0, 0];
  for (let i = 0; i < headers.length; i++) widths[i] = headers[i].length;
  for (const row of data) for (let i = 0; i < row.length; i++) widths[i] = Math.max(widths[i], row[i].length);

  const pad = (s: string, w: number) => s + " ".repeat(w - s.length);
  const border = `┌${"─".repeat(widths[0] + 2)}┬${"─".repeat(widths[1] + 2)}┬${"─".repeat(widths[2] + 2)}┐`;
  const mid    = `├${"─".repeat(widths[0] + 2)}┼${"─".repeat(widths[1] + 2)}┼${"─".repeat(widths[2] + 2)}┤`;
  const end    = `└${"─".repeat(widths[0] + 2)}┴${"─".repeat(widths[1] + 2)}┴${"─".repeat(widths[2] + 2)}┘`;

  console.log(pc.cyan("Targets (summary)"));
  console.log(border);
  console.log(`│ ${pad(headers[0], widths[0])} │ ${pad(headers[1], widths[1])} │ ${pad(headers[2], widths[2])} │`);
  console.log(mid);
  for (const [b, r, c] of data) console.log(`│ ${pad(b, widths[0])} │ ${pad(r, widths[1])} │ ${pad(c, widths[2])} │`);
  console.log(end);
}

/* ============================
   Rules table utilities
============================ */

function ruleTypeFromTags(tags: string[]): string {
  if (tags.includes("css")) return "CSS";
  if (tags.includes("html")) return "HTML";
  if (tags.includes("js")) return "JS";
  return (tags[0]?.toUpperCase() ?? "OTHER");
}

function printRulesTable(allRules: Rule[], enabledIds: Set<string>, packName: string) {
  const headers = ["Rule", "Checked", "Rule Type"];
  const rows = allRules.map((r) => [r.id, enabledIds.has(r.id) ? "Yes" : "No", ruleTypeFromTags(r.tags as any)]);
  rows.sort((a, b) => (a[2] === b[2] ? a[0].localeCompare(b[0]) : a[2].localeCompare(b[2])));

  const widths = headers.map((h) => h.length);
  for (const row of rows) row.forEach((cell, i) => (widths[i] = Math.max(widths[i], cell.length)));

  const pad = (s: string, w: number) => s + " ".repeat(w - s.length);
  const border = `┌${"─".repeat(widths[0] + 2)}┬${"─".repeat(widths[1] + 2)}┬${"─".repeat(widths[2] + 2)}┐`;
  const mid    = `├${"─".repeat(widths[0] + 2)}┼${"─".repeat(widths[1] + 2)}┼${"─".repeat(widths[2] + 2)}┤`;
  const end    = `└${"─".repeat(widths[0] + 2)}┴${"─".repeat(widths[1] + 2)}┴${"─".repeat(widths[2] + 2)}┘`;

  console.log(pc.cyan(`Rules (pack: ${packName || "all"})`));
  console.log(border);
  console.log(`│ ${pad(headers[0], widths[0])} │ ${pad(headers[1], widths[1])} │ ${pad(headers[2], widths[2])} │`);
  console.log(mid);
  for (const row of rows) console.log(`│ ${pad(row[0], widths[0])} │ ${pad(row[1], widths[1])} │ ${pad(row[2], widths[2])} │`);
  console.log(end);
}

/* ============================
   Rule selection (default pack=all)
============================ */

function selectRules(): Rule[] {
  const packName = pack ?? "all";

  // Base set = pack (if exists) else ALL rules
  const baseIds = PACKS[packName] ? new Set(PACKS[packName]) : new Set(RULES.map((r) => r.id));
  let selected = RULES.filter((r) => baseIds.has(r.id));

  if (tags.length) {
    selected = selected.filter((r) => tags.some((t) => (r.tags as any).includes(t)));
  }
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

/* ============================
   MAIN
============================ */

(async function main() {
  const started = Date.now();
  const cwd = process.cwd();
  const featuresIdx = loadWebFeatures();
  const targets = loadTargets(cwd);

  if (listRules) {
    console.log("Available rules:");
    for (const r of RULES) {
      console.log(`- ${r.id} [${r.tags.join(", ")}] → ${r.featureId}${r.docs ? " (" + r.docs + ")" : ""}`);
    }
    process.exit(0);
  }

  if (format === "pretty") {
    console.log(pc.cyan(`Baseline Guard (source: ${targets.source})`));
    printTargetsTable(targets.resolved);
  }

  const enabledRules = selectRules();

  if (format === "pretty") {
    const enabledIds = new Set(enabledRules.map((r) => r.id));
    printRulesTable(RULES, enabledIds, pack ?? "all");
  }

  // Scan
  const globs = [
    "**/*.{js,jsx,ts,tsx,css,html}",
    "!node_modules/**",
    "!dist/**",
    "!build/**",
  ];
  const absFiles = await fg(globs, { cwd, absolute: true });
  const filesChecked = absFiles.map((abs) => path.relative(cwd, abs));
  const problems: Finding[] = [];

  for (const [i, abs] of absFiles.entries()) {
    const rel = filesChecked[i];
    const ext = (rel.split(".").pop() || "").toLowerCase();
    const text = fs.readFileSync(abs, "utf8");

    for (const r of enabledRules) {
      if (!r.files.includes(ext as any)) continue;

      // Reset stateful /g regex per file
      r.regex.lastIndex = 0;

      let m: RegExpExecArray | null;
      while ((m = r.regex.exec(text))) {
        const before = text.slice(0, m.index);
        const line = before.split(/\r?\n/).length;
        const col = m.index - before.lastIndexOf("\n");

        const decision = isFeatureSafeForTargets(r.featureId, targets.resolved, featuresIdx);
        if (!decision.safe) {
          problems.push({
            file: rel,
            line,
            col,
            ruleId: r.id,
            featureId: r.featureId,
            msg: r.message,
            reason: decision.reason,
          });
        }
      }
    }
  }

  // Console output
  if (format === "json") {
    console.log(JSON.stringify({ targets, filesChecked, problems }, null, 2));
  } else {
    console.log(pc.dim(`Scanned ${filesChecked.length} file(s)`));
    if (listChecked) for (const f of filesChecked) console.log(pc.dim(` - ${f}`));

    if (problems.length === 0) {
      console.log(pc.green("No errors found"));
    } else {
      const counts: Record<string, number> = {};
      for (const p of problems) counts[p.ruleId] = (counts[p.ruleId] || 0) + 1;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

      console.log(pc.yellow(`⚠ Found ${problems.length} issue(s) across ${Object.keys(counts).length} rule(s).`));
      if (top.length) {
        console.log(pc.yellow(`Top rules:`));
        for (const [rid, c] of top) console.log(pc.yellow(` - ${rid}: ${c}`));
      }
      for (const p of problems) {
        console.log(
          `${pc.dim(p.file)}:${pc.yellow(p.line + ":" + p.col)} ${pc.red(p.msg)} ` +
            `[${p.ruleId} → ${p.featureId}]\n  ↳ ${pc.dim(p.reason)}`
        );
      }
    }
  }

  // Build report object
  const ruleCounts: Record<string, number> = {};
  for (const p of problems) ruleCounts[p.ruleId] = (ruleCounts[p.ruleId] || 0) + 1;

  const data: Report = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    packageVersion: undefined,
    cwd,
    targetSource: targets.source,
    targets: targets.resolved,
    mode: targets.mode,
    filesChecked,
    fileCount: filesChecked.length,
    ruleCounts,
    problems,
  };

  // Save report if requested
  const ext = reportKind || (saveFlag ? "md" : "");
  if (ext) {
    const defaultPath = path.join(cwd, `.baseline/baseline-report-${timestampSlug()}.${ext}`);
    const outPath = outPathArg ? path.resolve(cwd, outPathArg) : defaultPath;

    ensureDirFor(outPath);

    let contents = "";
    if (ext === "json") contents = buildJsonReport(data);
    else if (ext === "md") contents = renderMarkdownReport(data);
    else if (ext === "html") contents = getReportTemplate(data);
    else {
      console.error(pc.red(`Unknown report type: ${ext}`));
      process.exitCode = 2;
    }

    if (contents) {
      fs.writeFileSync(outPath, contents, "utf8");
      if (format === "pretty") console.log(pc.green(`📄 Report saved: ${path.relative(cwd, outPath)}`));
    }
  }

  // CI exit code policy
  if (targets.mode === "error" && problems.length > 0) process.exitCode = 1;
})();
