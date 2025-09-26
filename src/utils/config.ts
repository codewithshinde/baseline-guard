import fs from "fs";
import path from "path";
import type { BaselineConfig, Mode, WireRule } from "../types";

let cache: { cwd: string; cfg: BaselineConfig | null } | null = null;
export const BASELINE_CONFIG_FILENAME = "baseline.config.json";

/** Type guard for Mode ("off" | "warn" | "error"). */
function isMode(x: any): x is Mode {
  return x === "off" || x === "warn" || x === "error";
}

/** Read and lightly validate baseline.config.json with a simple cache per cwd. */
export function readBaselineConfig(cwd: string): BaselineConfig | null {
  if (cache && cache.cwd === cwd) return cache.cfg;

  const p = path.join(cwd, BASELINE_CONFIG_FILENAME);
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
      // malformed JSON: treat as absent
      cfg = null;
    }
  }

  cache = { cwd, cfg };
  return cfg;
}
