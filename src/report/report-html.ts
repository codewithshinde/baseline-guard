import type { Report } from "../types";

export const getReportTemplate = (data: Report) => {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows =
    data.problems.length === 0
      ? `<tr><td colspan="5">No issues found</td></tr>`
      : data.problems
          .map(
            (p) =>
              `<tr>
                    <td>${escape(p.file)}</td>
                    <td style="text-align:right">${p.line}:${p.col}</td>
                    <td><code>${p.ruleId}</code> → <code>${
                p.featureId
              }</code></td>
                    <td>${escape(p.msg)}</td>
                    <td>${escape(p.reason)}</td>
                  </tr>`
          )
          .join("");

  const summaryItems =
    Object.entries(data.ruleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([r, c]) => `<li><code>${r}</code>: <strong>${c}</strong></li>`)
      .join("") || "<li>No violations</li>";

  const files = data.filesChecked
    .map((f) => `<li><code>${escape(f)}</code></li>`)
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Baseline Guard Report</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Roboto, Arial; margin: 24px; }
  h1,h2 { margin: 0.5rem 0; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
  th { background: #f9fafb; }
  code { background: #f3f4f6; padding: 1px 4px; border-radius: 4px; }
  .meta { color: #555; margin-bottom: 12px; }
</style>
</head>
<body>
  <h1>Baseline Guard Report</h1>
  <div class="meta">
    <div><strong>Generated:</strong> ${data.generatedAt}</div>
    <div><strong>Targets:</strong> ${escape(data.targets.join(", "))}</div>
    <div><strong>Source:</strong> ${escape(data.targetSource)}</div>
    <div><strong>Mode:</strong> ${data.mode}</div>
    <div><strong>Files checked:</strong> ${data.fileCount}</div>
    <div><strong>Duration:</strong> ${data.durationMs} ms</div>
  </div>

  <h2>Summary</h2>
  <ul>${summaryItems}</ul>

  <h2>Issues</h2>
  <table>
    <thead>
      <tr><th>File</th><th>Line:Col</th><th>Rule → Feature</th><th>Message</th><th>Reason</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <h2>Files Checked</h2>
  <ul>${files}</ul>
</body>
</html>`;
};
