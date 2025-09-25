import path from "path";
import fs from "fs";

export function escapePipes(s: string) {
  return s.replace(/\|/g, "\\|");
}

export function timestampSlug(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`;
}

export function ensureDirFor(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

export function groupTargets(targets: string[]) {
  const by: Record<string, string[]> = {};
  for (const t of targets) {
    const [name, ...rest] = t.split(" ");
    const ver = rest.join(" ").trim();
    if (!name || !ver) continue;
    (by[name] ||= []).push(ver);
  }

  for (const k of Object.keys(by)) {
    by[k] = Array.from(new Set(by[k])).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0
    );
  }
  return by;
}


