import * as fs from "fs";
import * as path from "path";
import browserslist from "browserslist";
import type { ResolvedTargets, Mode } from "./types";
import { readBaselineConfig } from "./utils/config";

export function loadTargets(cwd: string): ResolvedTargets {
  const fallback = [
    "chrome >= 114",
    "edge >= 114",
    "firefox >= 115",
    "safari >= 17",
    "ios_saf >= 17",
  ];
  const defaultMode: Mode = "warn";

  // 1) baseline.config.json (single source of truth)
  const cfg = readBaselineConfig(cwd);
  if (cfg?.targets?.length) {
    return {
      source: "baseline.config.json",
      query: cfg.targets,
      resolved: browserslist(cfg.targets, { path: cwd }),
      mode: cfg.mode ?? defaultMode,
    };
  }

  // 2) package.json:baseline.targets
  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg?.baseline?.targets) {
        const q = pkg.baseline.targets as string[];
        return {
          source: "package.json:baseline",
          query: q,
          resolved: browserslist(q, { path: cwd }),
          mode: pkg.baseline.mode ?? defaultMode,
        };
      }
      
      // 3) Browserslist config (package.json/.browserslistrc)
      const resolved = browserslist(undefined, { path: cwd });
      if (resolved?.length) {
        return {
          source: "browserslist",
          query: ["<browserslist>"],
          resolved,
          mode: defaultMode,
        };
      }
    } catch {}
  }

  // 4) Fallback preset
  return {
    source: "fallback",
    query: fallback,
    resolved: browserslist(fallback, { path: cwd }),
    mode: defaultMode,
  };
}
