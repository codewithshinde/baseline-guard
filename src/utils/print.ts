import pc from "picocolors";

export function printTable(
  title: string,
  headers: string[],
  rows: (string | number)[][]
) {
  if (!rows.length) return;

  // compute column widths
  const widths = headers.map((h) => h.length);
  for (const r of rows)
    r.forEach((c, i) => (widths[i] = Math.max(widths[i], String(c).length)));

  const pad = (s: string, w: number) => s + " ".repeat(w - s.length);
  const bar = (l: string, m: string, r: string, fill = "─") =>
    `${l}${widths.map((w) => fill.repeat(w + 2)).join(m)}${r}`;

  console.log(pc.cyan(title));
  console.log(bar("┌", "┬", "┐"));
  console.log(
    "│ " + headers.map((h, i) => pad(h, widths[i])).join(" │ ") + " │"
  );
  console.log(bar("├", "┼", "┤"));
  for (const row of rows) {
    console.log(
      "│ " + row.map((c, i) => pad(String(c), widths[i])).join(" │ ") + " │"
    );
  }
  console.log(bar("└", "┴", "┘"));
}
