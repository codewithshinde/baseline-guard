import { ArgMap } from "../types";

export function parseArgs(argv: string[]): ArgMap {
  const get = (k: string) =>
    argv.find((a) => a.startsWith(`${k}=`))?.split("=")[1];
  const has = (k: string) => argv.includes(k);
  const list = (k: string) =>
    (get(k) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return { get, has, list };
}
