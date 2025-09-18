#!/usr/bin/env node
import fs from "fs";
import path from "path";
import fg from "fast-glob";
import pc from "picocolors";

import { loadWebFeatures } from "./data";
import { RULES, PACKS } from "./rules";
import { loadTargets } from "./targets";
import { isFeatureSafeForTargets } from "./check";
import type { Rule, Finding } from "./types";

const args = process.argv.slice(2);
const arg = (k: string) =>
  args.find((a) => a.startsWith(`${k}=`))?.split("=")[1];
const only = (arg("--only") ?? "").split(",").filter(Boolean);
const exclude = (arg("--exclude") ?? "").split(",").filter(Boolean);
const tags = (arg("--tags") ?? "").split(",").filter(Boolean);
const pack = arg("--pack");
const listRules = args.includes("--list-rules");
const watch = args.includes("--watch");
const format = (arg("--format") ?? "pretty") as "pretty" | "json";

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

(async function main() {
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

  if (format === "pretty") {
    console.log(pc.cyan(`Baseline Guard (source: ${targets.source})`));
    console.log(pc.cyan(`Targets: ${targets.resolved.join(", ")}`));
  }

  const enabledRules = selectRules();

  async function runOnce() {
    const globs = [
      "**/*.{js,jsx,ts,tsx,css,html}",
      "!node_modules/**",
      "!dist/**",
      "!build/**",
    ];
    const files = await fg(globs, { cwd, absolute: true });
    const problems: Finding[] = [];

    for (const abs of files) {
      const rel = path.relative(cwd, abs);
      const ext = rel.split(".").pop() as string;
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

    if (format === "json") {
      console.log(JSON.stringify({ targets, problems }, null, 2));
    } else {
      if (problems.length === 0) {
        console.log(pc.green("✔ No Baseline issues found."));
      } else {
        console.log(pc.yellow(`⚠ Found ${problems.length} issue(s):`));
        for (const p of problems) {
          console.log(
            `${pc.dim(p.file)}:${pc.yellow(p.line + ":" + p.col)} ${pc.red(
              p.msg
            )} [${p.ruleId} → ${p.featureId}]\n  ↳ ${pc.dim(p.reason)}`
          );
        }
      }
    }

    if (targets.mode === "error" && problems.length > 0) process.exitCode = 1;
  }

  await runOnce();

  if (watch) {
    console.log(pc.dim("Watching for changes… (Ctrl+C to exit)"));
    fs.watch(cwd, { recursive: true }, async (_e, name) => {
      if (!name || /node_modules|dist|build/.test(name)) return;
      await runOnce();
    });
  }
})();
