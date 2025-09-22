import type { Report } from "../types";
import { escapePipes } from "../utils";

export function buildJsonReport(data: Report): string {
  return JSON.stringify(data, null, 2);
}

export function renderMarkdownReport(data: Report): string {
  const header =
    `# Baseline Guard Report\n\n` +
    `**Generated:** ${data.generatedAt}\n\n` +
    `**Targets:** ${data.targets.join(", ")}  \n` +
    `**Source:** ${data.targetSource}  \n` +
    `**Mode:** ${data.mode}  \n` +
    `**Files checked:** ${data.fileCount}  \n` +
    `**Duration:** ${data.durationMs} ms\n\n`;

  const totals =
    Object.entries(data.ruleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => `- \`${rule}\`: **${count}**`)
      .join("\n") || "_No violations_";

  const problems =
    data.problems.length === 0
      ? "_No issues found_"
      : [
          "| File | Line:Col | Rule → Feature | Message | Reason |",
          "|------|---------:|----------------|---------|--------|",
          ...data.problems.map(
            (p) =>
              `| ${p.file} | ${p.line}:${p.col} | \`${p.ruleId}\` → \`${
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
    `## Summary\n\n${totals}\n\n` +
    `## Issues\n\n${problems}\n\n` +
    `## Files Checked\n\n${files}\n`
  );
}
