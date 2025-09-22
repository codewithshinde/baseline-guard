import type { Report } from "../types";

export function buildJsonReport(data: Report): string {
  return JSON.stringify(data, null, 2);
}
