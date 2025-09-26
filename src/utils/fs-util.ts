// utils/fs-util.ts
import path from "path";
import fs from "fs";

/** Escape pipe characters for Markdown tables. */
export const escapePipes = (s: string) => s.replace(/\|/g, "\\|");

/** Create a sortable timestamp slug like "2025-09-26-13 - 07". */
export function timestampSlug(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(
    d.getHours()
  )} - ${pad(d.getMinutes())}`;
}

/** Ensure directory exists for a file path (mkdir -p). */
export function ensureDirFor(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
