import fs from "fs";
import path from "path";
import type { BaselineConfig, Mode, WireRule } from "../types";

let cache: { cwd: string; cfg: BaselineConfig | null } | null = null;

function isMode(x: any): x is Mode {
  return x === "off" || x === "warn" || x === "error";
}

export function readBaselineConfig(cwd: string): BaselineConfig | null {
  if (cache && cache.cwd === cwd) return cache.cfg;

  const p = path.join(cwd, "baseline.config.json");
  let cfg: BaselineConfig | null = null;

  if (fs.existsSync(p)) {
    try {
      const raw = fs.readFileSync(p, "utf8");
      const obj = JSON.parse(raw);

      cfg = {
        targets: Array.isArray(obj.targets) ? obj.targets : undefined,
        mode: isMode(obj.mode) ? obj.mode : undefined,
        rules: Array.isArray(obj.rules) ? (obj.rules as WireRule[]) : undefined,
      };
    } catch {
      cfg = null; // malformed JSON: treat as absent
    }
  }

  cache = { cwd, cfg };
  return cfg;
}
