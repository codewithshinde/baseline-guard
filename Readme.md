# Baseline Guard by Karthik Shinde

Checks your code for web features that might not be safely supported in your target browsers.
Uses the official [`web-features`](https://www.npmjs.com/package/web-features) data + your Browserslist or `baseline.config.json`.

[![npm version](https://img.shields.io/npm/v/baseline-guard.svg)](https://www.npmjs.com/package/baseline-guard)
![node](https://img.shields.io/badge/node-%3E=18-brightgreen)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Author:** codewithshinde
**npm:** [https://www.npmjs.com/package/baseline-guard](https://www.npmjs.com/package/baseline-guard)
**GitHub:** [https://github.com/codewithshinde/baseline-guard](https://github.com/codewithshinde/baseline-guard)

---

## 1) Why use it?

Device power ≠ browser support. A feature like `:has()` or RegExp **lookbehind** can work on your machine but fail on Safari/iOS your users run.
**Baseline Guard** answers: **“Is this feature safe for the browsers we support?”**

---

## 2) Install

```bash
npm i -D baseline-guard
# or
yarn add -D baseline-guard
# or
pnpm add -D baseline-guard
```

> Requires **Node 18+**.

---

## 3) Quick start

1. Create **`baseline.config.json`** at your project root:

```json
{
  "targets": ["chrome >= 114", "edge >= 114", "firefox >= 115", "safari >= 17", "ios_saf >= 17"],
  "mode": "warn"
}
```

> If you already have **Browserslist** (in `package.json` or `.browserslistrc`), you can omit `targets`.

2. Add scripts:

```json
{
  "scripts": {
    "baseline:check": "baseline-guard",
    "baseline:report:md": "baseline-guard --report=md --save",
    "baseline:report:html": "baseline-guard --report=html --save",
    "baseline:report:json": "baseline-guard --report=json --save"
  }
}
```

3. Run it:

```bash
npm run baseline:check
```

You’ll get a summary of targets, a rules table, files scanned, and any issues.

---

## 4) What it does

* Scans **JS / TS / TSX / CSS / HTML** files in your repo.
* Detects modern features (e.g., `:has()`, container queries, WebGPU, RegExp lookbehind).
* Checks each feature against:

  * **Minimum browser versions** from `web-features` (per-browser minima), and
  * Your **targets** (Browserslist or `baseline.config.json`).
* Prints results to the console and can save **Markdown**, **HTML**, or **JSON** reports.
* Reports show a **compact per-browser summary** of failing targets (e.g., `Safari: requires ≥ 17 (your targets include 16–16.3, 4 versions)`).

---

## 5) CLI: flags & examples

```
baseline-guard
  [--list-rules]
  [--show-rules | --show-rules=all | --show-rules=checked]
  [--pack=core|popular|risky|experimental|all]
  [--tags=css,js,html,popular,bug-prone,experimental]
  [--only=ruleA,ruleB] [--exclude=ruleC,ruleD]
  [--emit-all-rules] [--emit-rule=<web-feature-id>]
  [--report=md|html|json] [--out=path] [--save]
```

### Defaults

* **Rules table view:** `--show-rules=checked` (only enabled rules).
  Use `--show-rules` or `--show-rules=all` to see **all** rules.
* **Pack:** `all` (when not provided).

### Rules table (console & reports)

Columns: **Web Feature ID | Rule | Checked | Rule Type | Tags | Pack**
Rows render **red** when that feature actually produced findings in the scan.
`--list-rules` prints **the same table** (no scan; uses minima-only logic for highlight).

### Common examples

```bash
# Show rules (table). Default filters to 'checked' rules:
baseline-guard --list-rules

# Show all rules in the table:
baseline-guard --list-rules --show-rules=all

# Filter by tags or pack:
baseline-guard --list-rules --tags=css
baseline-guard --list-rules --pack=popular

# Run with only a subset of rules (IDs), or exclude some:
baseline-guard --only=css-has,css-container-queries
baseline-guard --exclude=webgpu

# Save a Markdown/HTML/JSON report (to .baseline/ with timestamp):
baseline-guard --report=md --save
baseline-guard --report=html --save
baseline-guard --report=json --save

# Save to a custom path:
baseline-guard --report=html --out .baseline/report.html
```

### Emit helpers (generate rules from web-features)

```bash
# Generate all web-feature-based rules to .baseline/web-feature-rules.json
baseline-guard --emit-all-rules

# Inject a single generated rule into baseline.config.json (rules[])
baseline-guard --emit-rule=css-selector-has
```

### Exit codes (for CI)

* `0` = no violations, or `mode` is `"warn"`.
* `1` = violations exist **and** `mode` is `"error"`.

---

## 6) Targets: where they come from (priority)

1. `baseline.config.json` → `targets` and `mode`
2. `package.json > baseline.targets` (optional)
3. **Browserslist** (`package.json` or `.browserslistrc`)
4. Fallback preset: Chrome/Edge 114, Firefox 115, Safari/iOS 17

---

## 7) Adding your own rules (inline, no extra files)

Add rules directly inside **`baseline.config.json`** under a `rules` array.
Because JSON can’t store `RegExp`, provide a **`pattern`** string and optional **`flags`**; the CLI compiles them.

```json
{
  "targets": ["chrome >= 114", "edge >= 114", "firefox >= 115", "safari >= 17", "ios_saf >= 17"],
  "mode": "warn",
  "rules": [
    {
      "id": "js-regexp-unicode-sets",
      "featureId": "js-regexp-unicode-sets",
      "files": ["js", "ts", "tsx"],
      "pattern": "/[^/]*\\\\p\\{[^}]+\\}[^/]*\\/v",
      "flags": "g",
      "message": "RegExp Unicode sets (flag v) may not be supported by your targets.",
      "tags": ["js", "experimental"]
    },
    {
      "id": "css-custom-prop-register",
      "featureId": "css-properties-and-values",
      "files": ["css"],
      "pattern": "@property\\s+--",
      "flags": "g",
      "message": "CSS Properties & Values API (@property) may not be in your baseline.",
      "tags": ["css", "experimental"]
    }
  ]
}
```

**Notes**

* `id` must be unique. If it matches a built-in rule ID, **your inline rule overrides** it.
* `featureId` must be a valid **web-features** ID (e.g., `css-selector-has`, `webgpu`, `js-regexp-lookbehind`).
* Include `"flags": "g"` so the rule can match multiple times per file.
* Escape backslashes in JSON: `\\`.

---

## 8) Output & reports

**Console:** target summary, rules table (with red rows for actual findings), issues.
**Markdown/HTML reports:**

* **Browser Targets**: every browser + the exact versions in your targets.
* **Web Features Coverage**: same columns as CLI rules table.
* **Issues**: compact **Unsupported (browser target < min)** per browser, e.g.:

  ```
  Safari: requires ≥ 17.0 (your targets include 16–16.3, 4 versions)
  iOS Safari: requires ≥ 17.0 (your targets include 16–16.3, 4 versions)
  ```

**JSON** report includes structured data per finding:

```json
{
  "file": "src/components/PriceDisplay.tsx",
  "line": 12,
  "col": 10,
  "ruleId": "js-regexp-lookbehind",
  "featureId": "js-regexp-lookbehind",
  "msg": "RegExp lookbehind may not be supported by your targets.",
  "unsupported": [
    { "browser": "safari", "target": "16.3", "min": "17.0" },
    { "browser": "ios_saf", "target": "16.3", "min": "17.0" }
  ]
}
```

Create reports:

```bash
# Save Markdown/HTML/JSON to .baseline/baseline-report-<timestamp>.<ext>
baseline-guard --report=md --save
baseline-guard --report=html --save
baseline-guard --report=json --save

# Custom path
baseline-guard --report=html --out .baseline/report.html
```

---

## 9) Where to use it

* **Local dev:** run `baseline:check` to spot problems early.
* **Pre-commit:** block commits that introduce unsupported features.

  ```bash
  npx husky init
  echo 'npm run baseline:check' > .husky/pre-commit
  ```
* **CI:** fail when violations exist and `mode` is `"error"`.

  ```yaml
  - name: Baseline check
    run: baseline-guard --report=md --save
  ```
* **PR reviews:** upload the Markdown/HTML report as an artifact.
* **Monorepos:** each app can keep its own `baseline.config.json` (or share Browserslist).

---

## 10) Sample output (console)

```
Baseline Guard (source: baseline.config.json)
Targets (summary)
┌────────────┬────────────────────┬───────┐
│ Browser    │ Versions (min–max) │ Count │
├────────────┼────────────────────┼───────┤
│ Chrome     │ 114–140            │ 27    │
│ Edge       │ 114–140            │ 27    │
│ Firefox    │ 115–143            │ 29    │
│ Safari     │ 17–26              │ 14    │
│ iOS Safari │ 17–26              │ 14    │
└────────────┴────────────────────┴───────┘
Rules (pack: all, filtered: checked)
┌────────────────────────────────┬───────────────────────────┬─────────┬───────────┬──────────────────────────────┬──────┐
│ Web Feature ID                 │ Rule                      │ Checked │ Rule Type │ Tags                         │ Pack │
├────────────────────────────────┼───────────────────────────┼─────────┼───────────┼──────────────────────────────┼──────┤
│ css-selector-has               │ css-has                   │ Yes     │ CSS       │ css, popular, bug-prone      │ all  │
│ css-container-queries          │ css-container-queries     │ Yes     │ CSS       │ css, popular                  │ all  │
… (more)
Scanned 128 file(s)
⚠ Found 1 issue(s)
src/components/PriceDisplay.tsx:12:10 RegExp lookbehind may not be supported by your targets. [js-regexp-lookbehind → js-regexp-lookbehind]
  ↳ Safari: requires ≥ 17.0 (your targets include 16–16.3, 4 versions)
    iOS Safari: requires ≥ 17.0 (your targets include 16–16.3, 4 versions)
```

---

## Tips & troubleshooting

* **“Unknown feature”** in an issue: update `web-features` or verify the `featureId` in your rule.
* **Expecting an issue but not seeing it?** Ensure your `targets` include the affected versions you want to test.
* **Performance:** the scanner ignores `node_modules`, `dist`, `build` by default.
* **False positives:** rules use regex heuristics—override or refine with inline rules.

---

## License

MIT © codewithshinde
