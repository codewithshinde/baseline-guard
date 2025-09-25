import type { Report } from "../types";
import { escapePipes, groupTargets } from "../utils";
import { RULES } from "../constants/rules";
import { labelMap } from "../constants";

export function renderMarkdownReport(data: Report): string {
  const targetsBy: Record<string, string[]> = groupTargets(data.targets);

  const header =
    `# Baseline Guard Report\n\n` +
    `**Generated:** ${data.generatedAt}\n\n` +
    `**Source:** ${data.targetSource}  \n` +
    `**Mode:** ${data.mode}  \n` +
    `**Files checked:** ${data.fileCount}  \n` +
    `**Duration:** ${data.durationMs} ms\n\n`;

  // Violations by rule
  const totals =
    Object.entries(data.ruleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => `- \`${rule}\`: **${count}**`)
      .join("\n") || "_No violations_";

  // Browser targets table (not clubbed)
  const targetsTable =
    [
      `| Browser | Versions |`,
      `|---------|----------|`,
      ...Object.keys(targetsBy)
        .sort((a, b) => (a < b ? -1 : 1))
        .map(
          (k) =>
            `| ${labelMap[k] ?? k} | \`${escapePipes(
              targetsBy[k].join(", ")
            )}\` |`
        ),
    ].join("\n") || "_No targets_";

  // Web Features Coverage
  const enabledSet: Set<string> = (data as any).enabledRuleIds
    ? new Set<string>((data as any).enabledRuleIds)
    : new Set<string>(RULES.map((r) => r.id));
  const packName = (data as any).packName ?? "all";

  const coverageTable = [
    `| Web Feature | Rule | Covered |`,
    `|-------------|------|---------|`,
    ...RULES.map(
      (r) =>
        `| \`${r.featureId}\` | \`${r.id}\` | ${
          enabledSet.has(r.id) ? "Yes" : "No"
        } |`
    ),
  ].join("\n");

  // Issues table
  const problems =
    data.problems.length === 0
      ? "_No issues found_"
      : [
          "| File | Line:Col | Rule → Feature | Message | Reason |",
          "|------|---------:|----------------|---------|--------|",
          ...data.problems.map(
            (p) =>
              `| \`${p.file}\` | ${p.line}:${p.col} | \`${p.ruleId}\` → \`${
                p.featureId
              }\` | ${escapePipes(p.msg)} | ${escapePipes(p.reason)} |`
          ),
        ].join("\n");

  const files =
    data.filesChecked.length === 0
      ? "_None_"
      : data.filesChecked.map((f) => `- \`${f}\``).join("\n");

  return (
    header +
    `## Browser Targets\n\n${targetsTable}\n\n` +
    `## Web Features Coverage (pack: ${packName})\n\n${coverageTable}\n\n` +
    `## Summary (Violations by Rule)\n\n${totals}\n\n` +
    `## Issues\n\n${problems}\n\n` +
    `## Files Checked\n\n${files}\n`
  );
}
