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

Device power ≠ browser support. A feature like `:has()` or RegExp lookbehind can work on your laptop but fail on Safari/iOS your users run.
Baseline Guard answers: **“Is this feature safe for the browsers we support?”**

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

1. Create `baseline.config.json` in your project root:

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
* Prints the result to the console. Can also save a **Markdown**, **HTML**, or **JSON** report.

---

## 5) CLI: commands and examples

```
baseline-guard [--watch] [--format=pretty|json]
               [--list-checked]
               [--list-rules]
               [--pack=core|popular|risky|experimental|all]
               [--tags=css,js,html,popular,bug-prone,experimental]
               [--only=ruleA,ruleB] [--exclude=ruleC,ruleD]
               [--report=md|html|json] [--out=path] [--save]
```

**Common examples**

```bash
# See every available rule
baseline-guard --list-rules

# Run core CSS checks
baseline-guard --pack=core --tags=css

# Only check :has() and container queries
baseline-guard --only=css-has,css-container-queries

# Everything except WebGPU
baseline-guard --pack=all --exclude=webgpu

# Show the files scanned
baseline-guard --list-checked

# Save a Markdown report to the default folder (.baseline/)
baseline-guard --report=md --save

# Save an HTML report to a custom path
baseline-guard --report=html --out .baseline/report.html
```

**Flags (what they mean)**

* `--watch`
  Re-run on file changes. Good for local dev.
* `--format=pretty|json`
  Pretty console logs (default) or JSON (for CI/automation).
* `--list-checked`
  Print every file scanned.
* `--list-rules`
  Print all rule IDs, tags, and mapped web features.
* `--pack`
  Rule presets: `core`, `popular`, `risky`, `experimental`, `all` (default is `all`).
* `--tags`
  Filter by tags like `css,js,html,popular,bug-prone,experimental`.
* `--only` / `--exclude`
  Fine-grain rule selection by ID.
* `--report=md|html|json` + `--out` + `--save`
  Create and save a report. Without `--out`, files go to `.baseline/` with a timestamp.

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

You can add rules directly inside **`baseline.config.json`** under a `rules` array.
Because JSON can’t store real `RegExp` objects, each rule provides a **`pattern`** string and optional **`flags`**. The CLI compiles those into a regex.

**Example: add 2 rules inline**

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

**How to write `pattern`**

* It’s a normal JS regex **as a JSON string**. Escape backslashes (`\\`) and any pipes (`\|`) if you include them.
* Add `"flags": "g"` so the scanner can find multiple matches in one file.
* `id` must be unique. If it matches a built-in rule ID, **your inline rule overrides** the built-in.
* `featureId` should be a valid **web-features** ID (e.g. `css-selector-has`, `webgpu`, `js-regexp-lookbehind`). That’s how Baseline/minimum versions are checked.

**Rule shape (for reference)**

```ts
{
  id: string;
  featureId: string;                 // web-features ID
  files: ("js"|"ts"|"tsx"|"css"|"html")[];
  pattern: string;                   // regex body as JSON string
  flags?: string;                    // e.g. "gim"
  message: string;
  tags: string[];                    // e.g. ["css","popular"]
  docs?: string;
}
```

---

## 8) Where to use it

* **Local dev**: run `baseline:watch` next to your Vite/Next dev server.
* **Pre-commit**: block commits if you add features outside your support window.

  ```bash
  npx husky init
  echo 'npm run baseline:check' > .husky/pre-commit
  ```
* **CI**: fail the job when `mode` is `"error"` and violations exist.

  ```yaml
  - name: Baseline check
    run: baseline-guard --format=json --report=md --save
  ```
* **PR reviews**: attach the Markdown/HTML report as an artifact.
* **Monorepos**: each app has its own `baseline.config.json` or shared Browserslist.

---

## 9) Sample output (pretty mode)

```
Baseline Guard (source: baseline.config.json)
Targets (summary)
┌────────────┬────────────────────┬───────┐
│ Browser    │ Versions (min–max) │ Count │
├────────────┼────────────────────┼───────┤
│ Chrome     │ 114–140            │ 27    │
│ Edge       │ 114–140            │ 27    │
│ Firefox    │ 115–142            │ 28    │
│ Safari     │ 17–26              │ 14    │
│ iOS Safari │ 17–26              │ 14    │
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
⚠ Found 2 issue(s) across 2 rule(s).
Top rules:
 - css-has: 1
 - document-pip: 1
src/styles/app.css:12:4 CSS :has() selector may not be in your baseline. [css-has → css-selector-has]
  ↳ Not supported by: safari 16.3
src/video/pip.ts:45:10 Document Picture-in-Picture may not be safe. [document-pip → document-picture-in-picture]
  ↳ Not Baseline and no support data available.
```

---

## 10) Tips & troubleshooting

* **No issues but you expect one?**
  Check your `targets` include the affected versions (e.g., `safari 16.0-16.3` if you’re testing RegExp lookbehind problems).
* **“Unknown feature”**
  Update `web-features` or verify the `featureId`.
* **Performance**
  The scanner ignores `node_modules`, `dist`, `build` by default.
* **False positives**
  Rules use regex heuristics. Tweak or override with your own inline rules.

---

## License

MIT © codewithshinde

---
