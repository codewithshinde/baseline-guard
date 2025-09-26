import type { Report } from "../types";
import { RULES } from "../constants";
import { labelMap } from "../constants";
import { groupTargets } from "../utils";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderUnsupportedHTML(p: any): string {
  const unsupported = p?.unsupported as
    | { browser: string; target: string; min?: string }[]
    | undefined;

  if (unsupported?.length) {
    return unsupported
      .map(
        (u) =>
          `${esc(u.browser)} ${esc(u.target)}${
            u.min ? ` (&lt; ${esc(u.min)})` : ""
          }`
      )
      .join(", ");
  }
  return esc(p?.reason ?? "—");
}

export const getReportTemplate = (data: Report) => {
  const targetsByBrowser = groupTargets(data.targets);

  // Issues table (adds "Unsupported" column)
  const issueRows =
    data.problems.length === 0
      ? `<tr><td colspan="6" class="muted">No issues found</td></tr>`
      : data.problems
          .map(
            (p) =>
              `<tr>
                <td><code>${esc(p.file)}</code></td>
                <td class="num">${p.line}:${p.col}</td>
                <td><code>${p.ruleId}</code></td>
                <td><code>${p.featureId}</code></td>
                <td>${esc(p.msg)}</td>
                <td class="muted">${renderUnsupportedHTML(p)}</td>
              </tr>`
          )
          .join("");

  // Summary (violations by rule)
  const summaryItems =
    Object.entries(data.ruleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([r, c]) => `<li><code>${esc(r)}</code>: <strong>${c}</strong></li>`)
      .join("") || "<li class='muted'>No violations</li>";

  // Files checked
  const files = data.filesChecked.length
    ? data.filesChecked.map((f) => `<li><code>${esc(f)}</code></li>`).join("")
    : `<li class="muted">None</li>`;

  // Browser Targets (not clubbed)
  const browserTargetsRows =
    Object.keys(targetsByBrowser)
      .sort((a, b) => (a < b ? -1 : 1))
      .map((key) => {
        const label = labelMap[key] ?? key;
        const versions = targetsByBrowser[key].join(", ");
        return `<tr><td>${esc(label)}</td><td><code>${esc(versions)}</code></td></tr>`;
      })
      .join("") || `<tr><td colspan="2" class="muted">No targets</td></tr>`;

  // Web Features Coverage
  const packName = (data as any).packName ?? "all";
  const enabledSet: Set<string> = (data as any).enabledRuleIds
    ? new Set<string>((data as any).enabledRuleIds)
    : new Set<string>(RULES.map((r) => r.id));

  const coverageRows =
    RULES.map((r) => {
      const covered = enabledSet.has(r.id);
      const type = r.tags.includes("css")
        ? "CSS"
        : r.tags.includes("html")
        ? "HTML"
        : r.tags.includes("js")
        ? "JS"
        : r.tags[0]?.toUpperCase() ?? "OTHER";
      return `<tr>
        <td><code>${esc(r.featureId)}</code></td>
        <td><code>${esc(r.id)}</code></td>
        <td><span class="pill ${covered ? "ok" : "warn"}">${
        covered ? "Yes" : "No"
      }</span></td>
        <td>${esc(type)}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="4" class="muted">No rules found.</td></tr>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Baseline Guard Report</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root{
    --bg:#0b1020;
    --card:#121a2e;
    --card-2:#0f1527;
    --muted:#9aa3b2;
    --text:#e7ecf3;
    --ok:#1fbf75;
    --warn:#f59f00;
    --bad:#ef4444;
    --border:#1e2946;
    --pill:#1f2a48;
    --link:#93c5fd;
  }
  *{box-sizing:border-box}
  body{
    margin:0; background:var(--bg); color:var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji";
  }
  a{ color: var(--link); text-decoration: none; }
  a:hover{ text-decoration: underline; }
  .container{ max-width:1140px; margin: 32px auto; padding: 0 20px; }
  header{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom: 24px; }
  .title h1{ margin:0 0 6px; font-size: 28px; letter-spacing:.2px; }
  .meta{ display:grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap:12px; }
  .meta .card{ background:var(--card); border:1px solid var(--border); border-radius:12px; padding:12px 14px; }
  .meta .label{ color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.06em }
  .meta .value{ margin-top:4px; font-weight:600 }
  section{ margin: 24px 0; }
  h2{ font-size: 18px; margin: 0 0 10px; font-weight:700; letter-spacing:.2px; }
  .card{ background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px; }
  .grid{ display:grid; grid-template-columns: 1fr; gap:16px; }
  @media (min-width: 900px){
    .grid-2{ grid-template-columns: 1fr 1fr; }
  }
  table{ border-collapse: separate; border-spacing:0; width:100%; }
  th, td{ padding:10px 12px; vertical-align:top; }
  thead th{ background:var(--card-2); color:#c9d4e5; border-bottom:1px solid var(--border); text-align:left; position:sticky; top:0; }
  tbody td{ border-bottom:1px solid var(--border); }
  tbody tr:nth-child(even) td{ background: rgba(255,255,255,0.02); }
  code{ background:#0c1330; padding:2px 6px; border-radius:8px; border:1px solid #1b2446; }
  .muted{ color: var(--muted); }
  .pill{ display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:700; background:var(--pill); border:1px solid var(--border); }
  .pill.ok{ background: rgba(31,191,117,.12); border-color: rgba(31,191,117,.35); color:#7ae0b1; }
  .pill.warn{ background: rgba(245,159,0,.10); border-color: rgba(245,159,0,.35); color:#ffd48a; }
  .pill.bad{ background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.35); color:#ff9b9b; }
  .kpis{ display:flex; gap:10px; flex-wrap:wrap; }
  .kpis .pill{ background:#0e1630; }
  .num{ text-align:right; }
</style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title">
        <h1>Baseline Guard Report</h1>
        <div class="kpis">
          <span class="pill">Pack: ${(data as any).packName ?? "all"}</span>
          <span class="pill">Files: ${data.fileCount}</span>
          <span class="pill">Duration: ${data.durationMs}ms</span>
          <span class="pill">Mode: ${data.mode}</span>
          <span class="pill">Source: ${esc(data.targetSource)}</span>
        </div>
      </div>
    </header>

    <section class="card">
      <h2>Issues</h2>
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Line:Col</th>
            <th>Rule</th>
            <th>Feature</th>
            <th>Message</th>
            <th>Unsupported (browser target &lt; min)</th>
          </tr>
        </thead>
        <tbody>${issueRows}</tbody>
      </table>
    </section>

    <section class="grid grid-2">
      <div class="card">
        <h2>Browser Targets</h2>
        <table>
          <thead><tr><th>Browser</th><th>Versions</th></tr></thead>
          <tbody>
            ${
              Object.keys(targetsByBrowser).length
                ? Object.keys(targetsByBrowser)
                    .sort((a, b) => (a < b ? -1 : 1))
                    .map((key) => {
                      const label = labelMap[key] ?? key;
                      const versions = targetsByBrowser[key].join(", ");
                      return `<tr><td>${esc(label)}</td><td><code>${esc(versions)}</code></td></tr>`;
                    })
                    .join("")
                : `<tr><td colspan="2" class="muted">No targets</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>Summary</h2>
        <ul>
          ${summaryItems}
        </ul>
      </div>
    </section>

 

    <section class="card">
      <h2>Web Features Coverage <span class="pill">pack: ${esc(String(packName))}</span></h2>
      <table>
        <thead>
          <tr><th>Web Feature</th><th>Rule</th><th>Covered</th><th>Type</th></tr>
        </thead>
        <tbody>
          ${coverageRows}
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>Files Checked</h2>
      <ul>${files}</ul>
    </section>
  </div>
</body>
</html>`;
};
