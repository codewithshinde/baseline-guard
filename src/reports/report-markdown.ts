import { labelMap } from "../constants";
import { RULES } from "../constants/rules";
import type { Report } from "../types";
import {
  escapePipes,
  groupTargets,
  renderUnsupportedHTML,
  ruleTypeFromTags,
} from "../utils";

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
    Object.entries(data.ruleCounts || {})
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => `- \`${rule}\`: **${count}**`)
      .join("\n") || "_No violations_";

  // Browser targets table (grouped)
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

  // Coverage (matches CLI columns)
  const enabledSet: Set<string> = (data as any).enabledRuleIds
    ? new Set<string>((data as any).enabledRuleIds)
    : new Set<string>(RULES.map((r) => r.id));
  const packName = (data as any).packName ?? "all";
  const showRulesMode: "checked" | "all" =
    ((data as any).showRulesMode as any) ?? "checked";

  const rulesForDisplay =
    showRulesMode === "checked"
      ? RULES.filter((r) => enabledSet.has(r.id))
      : RULES;

  const coverageTable = [
    `| Web Feature ID | Rule | Checked | Rule Type | Tags | Pack |`,
    `|----------------|------|---------|-----------|------|------|`,
    ...rulesForDisplay.map((r) => {
      const checked = enabledSet.has(r.id) ? "Yes" : "No";
      const type = ruleTypeFromTags(r.tags as string[] | undefined);
      const tags = (r.tags as string[] | undefined)?.join(", ") ?? "";
      return `| \`${r.featureId}\` | \`${
        r.id
      }\` | ${checked} | ${type} | ${escapePipes(tags)} | ${packName} |`;
    }),
  ].join("\n");

  // Issues table (now concise "Unsupported" column)
  const problems =
    data.problems.length === 0
      ? "_No issues found_"
      : [
          "| File | Line:Col | Rule → Feature | Message | Unsupported (browser target < min) |",
          "|------|---------:|----------------|---------|------------------------------------|",
          ...data.problems.map(
            (p) =>
              `| \`${p.file}\` | ${p.line}:${p.col} | \`${p.ruleId}\` → \`${
                p.featureId
              }\` | ${escapePipes(p.msg)} | ${escapePipes(
                renderUnsupportedHTML(p)
              )} |`
          ),
        ].join("\n");

  const files =
    data.filesChecked.length === 0
      ? "_None_"
      : data.filesChecked.map((f) => `- \`${f}\``).join("\n");

  return (
    header +
    `## Browser Targets\n\n${targetsTable}\n\n` +
    `## Web Features Coverage (pack: ${packName}${
      showRulesMode === "checked" ? ", filtered: checked" : ""
    })\n\n${coverageTable}\n\n` +
    `## Summary (Violations by Rule)\n\n${totals}\n\n` +
    `## Issues\n\n${problems}\n\n` +
    `## Files Checked\n\n${files}\n`
  );
}
