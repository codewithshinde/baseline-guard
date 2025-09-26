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

## 2) Install (pick one)

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
    "baseline:check": "baseline-guard --format=pretty",
    "baseline:watch": "baseline-guard --watch --pack=core --tags=popular"
  }
}
```

3. Run it:

```bash
npm run baseline:check
# or watch mode during dev
npm run baseline:watch
```

You’ll get a summary of targets, what rules ran, files scanned, and any issues.

---

## 4) What it does

* Scans **JS / TS / TSX / CSS / HTML** files in your repo.
* Detects modern features (e.g., `:has()`, container queries, WebGPU, RegExp lookbehind).
* Checks each feature against:

  * **Baseline** status (from `web-features`), and/or
  * **Minimum browser versions** vs your **targets**.
* Prints results to the console and can save a **Markdown**, **HTML**, or **JSON** report.
* Reports now include **exact browsers/versions that fail** (e.g., `Safari 16.3 (< 17.0)`).

---

## 5) CLI: commands and examples

```
baseline-guard [--watch] [--format=pretty|json]
               [--list-rules]
               [--pack=core|popular|risky|experimental|all]
               [--tags=css,js,html,popular,bug-prone,experimental]
               [--only=ruleA,ruleB] [--exclude=ruleC,ruleD]
               [--report=md|html|json] [--out=path] [--save]
```

> **Defaults**
> • Output: `--format=pretty`
> • Pack: `--pack=all` (when not provided)

**Common examples**

```bash
# Show available rules (now filterable!)
baseline-guard --list-rules --tags=css
baseline-guard --list-rules --pack=popular
baseline-guard --list-rules --only=css-has,js-regexp-lookbehind

# Core CSS checks
baseline-guard --pack=core --tags=css

# Only :has() and container queries
baseline-guard --only=css-has,css-container-queries

# Everything except WebGPU
baseline-guard --pack=all --exclude=webgpu

# Save a Markdown report to the default folder (.baseline/)
baseline-guard --report=md --save

# Save an HTML report to a custom path
baseline-guard --report=html --out .baseline/report.html
```

**Flags (what they mean)**

* `--watch` — Re-run on file changes (good for local dev).
* `--format=pretty|json` — Pretty console logs (default) or JSON (for CI/automation).
* `--list-rules` — Print rules, and **respects** filters like `--tags`, `--pack`, and `--only`.
* `--pack` — Rule presets: `core`, `popular`, `risky`, `experimental`, `all` (default is `all`).
* `--tags` — Filter by tags (e.g., `css,js,html,popular,bug-prone,experimental`).
* `--only` / `--exclude` — Fine-grain rule selection by ID.
* `--report=md|html|json` + `--out` + `--save` — Create and save a report. Without `--out`, files go to `.baseline/` with a timestamp.

**Exit codes (for CI)**

* `0` = no violations, or `mode` is `"warn"`.
* `1` = violations exist **and** `mode` is `"error"`.

---

## 6) Targets: where they come from (priority)

1. `baseline.config.json` → `targets` and `mode`
2. `package.json > baseline.targets` (optional)
3. **Browserslist** (`package.json` or `.browserslistrc`)
4. Fallback: Chrome/Edge 114, Firefox 115, Safari/iOS 17

---

## 7) Adding your own rules (inline, no extra files)

Add rules directly inside **`baseline.config.json`** under a `rules` array.
Because JSON can’t store actual regex objects, provide a **`pattern`** string and optional **`flags`** (the CLI compiles them to a `RegExp`).

**Example: add 2 inline rules**

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

**Notes:**

* `id` must be unique. If it matches a built-in rule ID, **your inline rule overrides** the built-in.
* `featureId` must be a valid **web-features** ID (e.g., `css-selector-has`, `webgpu`, `js-regexp-lookbehind`).
  Baseline Guard uses that ID to check Baseline/minimum browser versions.
* Use `"flags": "g"` so a rule can match multiple times per file.
* Escape backslashes in JSON: `\\`.

---

## 8) Output & reports (includes “which browser failed”)

**Console (pretty mode)** shows a target summary table, enabled rules, and issues.
**Markdown/HTML** reports include:

* **Browser Targets** (non-clubbed): every browser + the exact versions in your targets.
* **Web Features Coverage**: which `web-features` are covered by the active rules.
* **Issues**: includes **Unsupported (browser target < min)**, e.g.:

  ```
  Safari 16.3 (< 17.0), iOS Safari 16.3 (< 17.0)
  ```

**JSON** report adds structured data per finding:

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
# Save Markdown to .baseline/baseline-report-<timestamp>.md
baseline-guard --report=md --save

# Save HTML to custom location
baseline-guard --report=html --out .baseline/report.html

# Machine-readable JSON
baseline-guard --format=json > baseline-report.json
```

---

## 9) Where to use it

* **Local dev**: `baseline:watch` alongside your Vite/Next dev server.
* **Pre-commit**: block commits that introduce unsupported features.

  ```bash
  npx husky init
  echo 'npm run baseline:check' > .husky/pre-commit
  ```
* **CI**: fail when violations exist and `mode` is `"error"`.

  ```yaml
  - name: Baseline check
    run: baseline-guard --format=json --report=md --save
  ```
* **PR reviews**: upload the Markdown/HTML report as an artifact.
* **Monorepos**: each app can keep its own `baseline.config.json` (or share Browserslist).

---

## 10) Sample output (pretty mode)

```
Baseline Guard (source: baseline.config.json)
Targets (summary)
┌────────────┬────────────────────┬───────┐
│ Browser    │ Versions (min–max) │ Count │
├────────────┼────────────────────┼───────┤
│ Chrome     │ 114–140            │ 27    │
│ Edge       │ 114–140            │ 27    │
│ Firefox    │ 115–142            │ 28    │
│ Safari     │ 16–16.3            │ 4     │
│ iOS Safari │ 16–16.3            │ 4     │
└────────────┴────────────────────┴───────┘
Rules (pack: all)
┌───────────────────────────┬─────────┬───────────┐
│ Rule                      │ Checked │ Rule Type │
├───────────────────────────┼─────────┼───────────┤
│ css-has                   │ Yes     │ CSS       │
│ js-regexp-lookbehind      │ Yes     │ JS        │
│ webgpu                    │ Yes     │ JS        │
… (more)
Scanned 128 file(s)
⚠ Found 1 issue(s)
src/components/PriceDisplay.tsx:12:10 RegExp lookbehind may not be supported by your targets. [js-regexp-lookbehind → js-regexp-lookbehind]
  ↳ Unsupported: safari 16.3 (< 17.0), ios_saf 16.3 (< 17.0)
```

---

## Tips & troubleshooting

* **Expecting an issue but not seeing it?**
  Ensure your `targets` include the affected versions (e.g., `safari 16.0-16.3` to test lookbehind problems).
* **“Unknown feature”**
  Update `web-features` or verify the `featureId` in your rule.
* **Performance**
  The scanner ignores `node_modules`, `dist`, `build` by default.
* **False positives**
  Rules use regex heuristics. Override or refine with your own inline rules.

---

## License

MIT © codewithshinde

---
