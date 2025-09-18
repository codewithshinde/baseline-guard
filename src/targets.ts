import * as fs from "fs";
import * as path from "path";
import browserslist from "browserslist";
import type { ResolvedTargets, Mode } from "./types";

export function loadTargets(cwd: string): ResolvedTargets {
  const fallback = [
    "chrome >= 114",
    "edge >= 114",
    "firefox >= 115",
    "safari >= 17",
    "ios_saf >= 17",
  ];
  const defaultMode: Mode = "warn";

  const baselinePath = path.join(cwd, "baseline.config.json");
  if (fs.existsSync(baselinePath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
      const q =
        Array.isArray(cfg.targets) && cfg.targets.length
          ? cfg.targets
          : fallback;
      return {
        source: "baseline.config.json",
        query: q,
        resolved: browserslist(q, { path: cwd }),
        mode: cfg.mode ?? defaultMode,
      };
    } catch {}
  }

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
      const resolved = browserslist(undefined, { path: cwd });
      if (resolved?.length)
        return {
          source: "browserslist",
          query: ["<browserslist>"],
          resolved,
          mode: defaultMode,
        };
    } catch {}
  }

  try {
    const resolved = browserslist(undefined, { path: cwd });
    if (resolved?.length)
      return {
        source: "browserslist",
        query: ["<browserslist>"],
        resolved,
        mode: defaultMode,
      };
  } catch {}

  return {
    source: "fallback",
    query: fallback,
    resolved: browserslist(fallback, { path: cwd }),
    mode: defaultMode,
  };
}
