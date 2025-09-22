#!/usr/bin/env node
import fs from "fs";
import path from "path";
import fg from "fast-glob";
import pc from "picocolors";

import { loadWebFeatures } from "./data";
import { RULES, PACKS } from "./rules";
import { loadTargets } from "./targets";
import { isFeatureSafeForTargets } from "./check";
import type { Rule, Finding, Report } from "./types";
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
const pack = arg("--pack");
const listRules = args.includes("--list-rules");
const watch = args.includes("--watch");

// Console output format
const format = (arg("--format") ?? "pretty") as "pretty" | "json";

// New report flags
const listChecked = args.includes("--list-checked");
const reportKind = (arg("--report") ?? "").toLowerCase() as
  | ""
  | "json"
  | "md"
  | "html";
const outPathArg = arg("--out");
const saveFlag = args.includes("--save");

function selectRules(): Rule[] {
  let selected = RULES;
  if (pack && PACKS[pack]) {
    const ids = new Set(PACKS[pack]);
    selected = selected.filter((r) => ids.has(r.id));
  }
  if (tags.length) {
    selected = selected.filter((r) =>
      tags.some((t) => r.tags.includes(t as any))
    );
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

function renderHtmlReport(data: Report): string {
  return getReportTemplate(data);
}


(async function main() {
  const started = Date.now();
  const cwd = process.cwd();
  const featuresIdx = loadWebFeatures();
  const targets = loadTargets(cwd);

  if (listRules) {
    console.log("Available rules:");
    for (const r of RULES) {
      console.log(
        `- ${r.id} [${r.tags.join(", ")}] → ${r.featureId}${
          r.docs ? " (" + r.docs + ")" : ""
        }`
      );
    }
    process.exit(0);
  }

  // Console header
  if (format === "pretty") {
    console.log(pc.cyan(`Baseline Guard (source: ${targets.source})`));
    console.log(pc.cyan(`Targets: ${targets.resolved.join(", ")}`));
  }

  const enabledRules = selectRules();

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
      let m: RegExpExecArray | null;
      while ((m = r.regex.exec(text))) {
        const before = text.slice(0, m.index);
        const line = before.split(/\r?\n/).length;
        const col = m.index - before.lastIndexOf("\n");

        const decision = isFeatureSafeForTargets(
          r.featureId,
          targets.resolved,
          featuresIdx
        );
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
    if (listChecked) {
      for (const f of filesChecked) console.log(pc.dim(` - ${f}`));
    }

    if (problems.length === 0) {
      console.log(pc.green("✔ No Baseline issues found."));
    } else {
      // Group counts by rule
      const counts: Record<string, number> = {};
      for (const p of problems) counts[p.ruleId] = (counts[p.ruleId] || 0) + 1;
      const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      console.log(
        pc.yellow(
          `⚠ Found ${problems.length} issue(s) across ${
            Object.keys(counts).length
          } rule(s).`
        )
      );
      if (top.length) {
        console.log(pc.yellow(`Top rules:`));
        for (const [rid, c] of top) console.log(pc.yellow(` - ${rid}: ${c}`));
      }
      for (const p of problems) {
        console.log(
          `${pc.dim(p.file)}:${pc.yellow(p.line + ":" + p.col)} ${pc.red(
            p.msg
          )} [${p.ruleId} → ${p.featureId}]\n  ↳ ${pc.dim(p.reason)}`
        );
      }
    }
  }

  // Build report object
  const ruleCounts: Record<string, number> = {};
  for (const p of problems)
    ruleCounts[p.ruleId] = (ruleCounts[p.ruleId] || 0) + 1;

  const data: Report = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    packageVersion: undefined, // optionally inject from package.json
    cwd,
    targetSource: targets.source,
    targets: targets.resolved,
    mode: targets.mode,
    filesChecked,
    fileCount: filesChecked.length,
    ruleCounts,
    problems,
  };

  // Decide if we need to save a report
  const ext = reportKind || (saveFlag ? "md" : ""); // default to md if --save given without --report
  if (ext) {
    const defaultPath = path.join(
      cwd,
      `.baseline/baseline-report-${timestampSlug()}.${ext}`
    );
    const outPath = outPathArg ? path.resolve(cwd, outPathArg) : defaultPath;

    ensureDirFor(outPath);

    let contents = "";
    if (ext === "json") contents = buildJsonReport(data);
    else if (ext === "md") contents = renderMarkdownReport(data);
    else if (ext === "html") contents = renderHtmlReport(data);
    else {
      console.error(pc.red(`Unknown report type: ${ext}`));
      process.exitCode = 2;
    }

    if (contents) {
      fs.writeFileSync(outPath, contents, "utf8");
      if (format === "pretty")
        console.log(
          pc.green(`📄 Report saved: ${path.relative(cwd, outPath)}`)
        );
    }
  }

  // Exit code for CI (unchanged behavior)
  if (targets.mode === "error" && problems.length > 0) process.exitCode = 1;
})();
