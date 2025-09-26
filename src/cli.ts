#!/usr/bin/env node
import fg from "fast-glob";
import fs from "fs";
import path from "path";
import pc from "picocolors";

import { PACKS, RULES, labelMap } from "./constants";
import { generateRulesFromWebFeatures } from "./rules";
import {
  BASELINE_CONFIG_FILENAME,
  ensureDirFor,
  getAllRules,
  isFeatureSafeForTargets,
  loadTargets,
  loadWebFeatures,
  parseArgs,
  prettyUnsupportedLines,
  printTable,
  renderRulesTable,
  selectRules,
  summarizeTargets,
  timestampSlug,
} from "./utils";

import {
  buildJsonReport,
  getReportTemplate,
  renderMarkdownReport,
} from "./reports";
import type { Finding, Report, UnsupportedItem } from "./types";

(async function main() {
  const started = Date.now();
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));

  // Flags / options
  const only = args.list("--only");
  const exclude = args.list("--exclude");
  const tags = args.list("--tags");
  const pack = args.get("--pack");
  const listRules = args.has("--list-rules");

  // show-rules flag (all | checked) — default to "checked"
  const showRulesRaw = (args.get("--show-rules") || "").toLowerCase();
  const showRulesMode =
    showRulesRaw === "all"
      ? "all"
      : showRulesRaw === "checked"
      ? "checked"
      : args.has("--show-rules")
      ? "all"
      : "checked";

  const emitOne = args.get("--emit-rule");
  const emitAll = args.has("--emit-all-rules");

  const reportKind = (args.get("--report") ?? "").toLowerCase() as
    | ""
    | "json"
    | "md"
    | "html";
  const outPathArg = args.get("--out");
  const saveFlag = args.has("--save");

  // Inputs / targets / features
  const featuresIdx = loadWebFeatures();
  const targets = loadTargets(cwd);

  // Rules (core + inline/custom)
  const ALL_RULES = getAllRules(RULES, cwd);

  /* -----------------------------
     Emit helpers (generate rules)
  ------------------------------*/
  if (emitOne || emitAll) {
    const generated = generateRulesFromWebFeatures(featuresIdx);

    if (emitAll) {
      const outPath = path.resolve(cwd, ".baseline/web-feature-rules.json");
      ensureDirFor(outPath);
      fs.writeFileSync(outPath, JSON.stringify(generated, null, 2) + "\n");
      console.log(
        `✅ Wrote ${generated.length} generated rules → ${path.relative(
          cwd,
          outPath
        )}`
      );
      process.exit(0);
    }

    if (emitOne) {
      const rule = generated.find((r: { id: string }) => r.id === emitOne);
      if (!rule) {
        console.error(
          pc.red(
            `No generated rule found for featureId "${emitOne}". Check the id in web-features.`
          )
        );
        process.exit(2);
      }
      const cfgPath = path.join(cwd, BASELINE_CONFIG_FILENAME);
      const cfg = fs.existsSync(cfgPath)
        ? JSON.parse(fs.readFileSync(cfgPath, "utf8"))
        : {};
      cfg.rules = Array.isArray(cfg.rules) ? cfg.rules : [];
      const idx = cfg.rules.findIndex((r: any) => r.id === rule.id);
      if (idx >= 0) cfg.rules[idx] = rule;
      else cfg.rules.push(rule);
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
      console.log(
        `✅ Injected rule "${emitOne}" into ${BASELINE_CONFIG_FILENAME} (rules[])`
      );
      process.exit(0);
    }
  }

  /* -----------------------------
     Pretty headers / targets
  ------------------------------*/
  console.log(pc.cyan(`Baseline Guard (source: ${targets.source})`));
  const targetRows = summarizeTargets(targets.resolved).map((r) => [
    r.browser,
    r.range,
    String(r.count),
  ]);
  printTable(
    "Targets (summary)",
    ["Browser", "Versions (min–max)", "Count"],
    targetRows
  );

  /* -----------------------------
     Rules selection
  ------------------------------*/
  const selected = selectRules(ALL_RULES, { pack, tags, only, exclude });
  const enabledRules = selectRules(ALL_RULES, { pack, tags, only, exclude });
  const enabledIds = new Set(enabledRules.map((r) => r.id));
  const packLabel = pack && PACKS[pack] ? pack : "all";
  const baseForDisplay = showRulesMode === "checked" ? enabledRules : selected;

  // LIST MODE: show the table *before* scanning (minima-based red only)
  if (listRules) {
    renderRulesTable(
      `Rules (pack: ${packLabel}${
        showRulesMode === "checked" ? ", filtered: checked" : ""
      })`,
      baseForDisplay,
      enabledIds,
      packLabel,
      targets.resolved,
      featuresIdx,
      { evalSafety: isFeatureSafeForTargets } // use minima in list mode
    );
    process.exit(0);
  }

  /* -----------------------------
     Scan files (collect findings)
  ------------------------------*/
  const globs = [
    "**/*.{js,jsx,ts,tsx,css,html}",
    "!node_modules/**",
    "!dist/**",
    "!build/**",
  ];
  const absFiles = await fg(globs, { cwd, absolute: true });
  const filesChecked = absFiles.map((abs) => path.relative(cwd, abs));
  const problems: Finding[] = [];

  for (let i = 0; i < absFiles.length; i++) {
    const abs = absFiles[i];
    const rel = filesChecked[i];
    const ext = (rel.split(".").pop() || "").toLowerCase();
    const text = fs.readFileSync(abs, "utf8");

    for (const r of enabledRules) {
      if (!r.files.includes(ext as any)) continue;
      r.regex.lastIndex = 0; // reset /g
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
            unsupported: (decision as any).unsupported,
          });
        }
      }
    }
  }

  /* -----------------------------
     NOW print rules table with actual error highlights
  ------------------------------*/
  const highlightFeatureIds = new Set(problems.map((p) => p.featureId));
  renderRulesTable(
    `Rules (pack: ${packLabel}${
      showRulesMode === "checked" ? ", filtered: checked" : ""
    })`,
    baseForDisplay,
    enabledIds,
    packLabel,
    targets.resolved,
    featuresIdx,
    {
      highlightFeatureIds,          // red only if real findings existed
      evalSafety: isFeatureSafeForTargets, // harmless here; used only if highlight set missing
    }
  );

  /* -----------------------------
     Output summary
  ------------------------------*/
  console.log(pc.dim(`Scanned ${filesChecked.length} file(s)`));
  if (problems.length === 0) {
    console.log(pc.green("No errors found"));
  } else {
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
      console.log(pc.yellow("Top rules:"));
      for (const [rid, c] of top) console.log(pc.yellow(` - ${rid}: ${c}`));
    }

    for (const p of problems) {
      console.log(
        `${pc.dim(p.file)}:${pc.yellow(p.line + ":" + p.col)} ${pc.red(
          p.msg
        )} [${p.ruleId} → ${p.featureId}]`
      );
      if (p.unsupported?.length) {
        const lines = prettyUnsupportedLines(
          p.unsupported as UnsupportedItem[],
          labelMap
        );
        console.log(pc.dim("  ↳ Failing targets:"));
        for (const line of lines) console.log(pc.dim(`     • ${line}`));
      } else {
        console.log(`  ↳ ${pc.dim(p.reason)}`);
      }
    }
  }

  /* -----------------------------
     Report (optional)
  ------------------------------*/
  const ruleCounts: Record<string, number> = {};
  for (const p of problems)
    ruleCounts[p.ruleId] = (ruleCounts[p.ruleId] || 0) + 1;

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

  const ext = reportKind || (saveFlag ? "md" : "");
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
    else if (ext === "html") contents = getReportTemplate(data);
    else {
      console.error(pc.red(`Unknown report type: ${ext}`));
      process.exitCode = 2;
    }

    if (contents) {
      fs.writeFileSync(outPath, contents, "utf8");
      console.log(pc.green(`📄 Report saved: ${path.relative(cwd, outPath)}`));
    }
  }

  if (targets.mode === "error" && problems.length > 0) process.exitCode = 1;
})();
