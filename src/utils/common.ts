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
