# Baseline Guard

Checks your code for web features that might not be safely supported in your target browsers.
Uses the official [`web-features`](https://www.npmjs.com/package/web-features) data plus your Browserslist / `baseline.config.json`.

[![npm version](https://img.shields.io/npm/v/baseline-guard.svg)](https://www.npmjs.com/package/baseline-guard)
![node](https://img.shields.io/badge/node-%3E=18-brightgreen)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Author:** codewithshinde 

**npm:** [https://www.npmjs.com/package/baseline-guard](https://www.npmjs.com/package/baseline-guard)

**GitHub:** [https://github.com/codewithshinde/baseline-guard](https://github.com/codewithshinde/baseline-guard)

---

## Why use it?

Device specs don’t guarantee browser support. A feature like `:has()` or WebGPU can work on your machine but fail on Safari or older mobile browsers.
Baseline Guard gives a quick answer: **is this feature safe for the browsers we support?**

---

## Install (pick one)

```bash
npm i -D baseline-guard
# or
yarn add -D baseline-guard
# or
pnpm add -D baseline-guard
```

Requires **Node 18+**.

---

## Quick start

1. Create **`baseline.config.json`** in your project root:

```json
{
  "targets": ["chrome >= 114", "edge >= 114", "firefox >= 115", "safari >= 17", "ios_saf >= 17"],
  "mode": "warn"  // "off" | "warn" | "error"
}
```

> If you already use **Browserslist** (`package.json` or `.browserslistrc`), you can omit `targets`.

2. Add scripts to **package.json**:

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
# or watch alongside your dev server
npm run baseline:watch
```

---

## What it does

* Scans your repo for modern web features in **JS/TS/TSX/CSS/HTML**.
* For each feature it finds, it checks if that feature is in **Baseline** or supported by the browser versions you target.
* Prints a clear report. Can also save a report file (JSON / Markdown / HTML).

---

## Features

* ✅ **Real Baseline data** via `web-features`
* ✅ **Targets** from `baseline.config.json` or **Browserslist**
* ✅ **Watch mode** (`--watch`) for live feedback
* ✅ **Pretty or JSON output** (`--format=pretty|json`)
* ✅ **List files scanned** (`--list-checked`)
* ✅ **Save reports**:

  * `--report=md|html|json`
  * `--out <path>` to choose location
  * `--save` to auto-save to `.baseline/baseline-report-<timestamp>.<ext>`
* ✅ **Rule control**:

  * `--list-rules` to see all rules
  * `--pack=core|popular|risky|experimental`
  * `--tags=css,js,html,popular,bug-prone,experimental`
  * `--only=ruleA,ruleB` and `--exclude=ruleC`
* ✅ **CI-friendly** exit codes

  * `0` if no violations (or `mode=warn`)
  * `1` if violations and `mode=error`
* ✅ **Editor-agnostic** (works with any IDE)

---

## CLI usage

```
baseline-guard [--watch] [--format=pretty|json]
               [--list-checked]
               [--list-rules]
               [--pack=core|popular|risky|experimental]
               [--tags=css,js,html,popular,bug-prone,experimental]
               [--only=ruleA,ruleB] [--exclude=ruleC,ruleD]
               [--report=md|html|json] [--out=path] [--save]
```

### Examples

```bash
# See available rules
baseline-guard --list-rules

# Core CSS checks only
baseline-guard --pack=core --tags=css

# Only :has() and container queries
baseline-guard --only=css-has,css-container-queries

# Everything except WebGPU
baseline-guard --pack=popular --exclude=webgpu

# Show all files scanned
baseline-guard --list-checked

# Save a Markdown report (default location)
baseline-guard --save

# Save an HTML report at a custom path
baseline-guard --report=html --out .baseline/report.html
```

---

## What you’ll see (pretty mode)

```
Baseline Guard (source: baseline.config.json)
Targets: chrome 127, safari 17.4, firefox 130, edge 127
Scanned 128 file(s)
⚠ Found 2 issue(s) across 2 rule(s).
Top rules:
 - css-has: 1
 - document-pip: 1
src/styles/app.css:12:4 CSS :has() selector may not be in your baseline. [css-has → css-selector-has]
  ↳ Not supported by: safari 16.6
src/video/pip.ts:45:10 Document Picture-in-Picture API may not be safe. [document-pip → document-picture-in-picture]
  ↳ Not Baseline and no support data available.
```

---

## Targets: where they come from (priority)

1. `baseline.config.json` → `targets` + `mode`
2. `package.json > baseline.targets` (optional)
3. **Browserslist** (`package.json` or `.browserslistrc`)
4. Fallback preset (Chrome/Edge 114, Firefox 115, Safari/iOS 17)

---

## Integrations

**React / Vite / Next.js (dev):**

```json
{
  "scripts": {
    "dev": "vite",
    "baseline:watch": "baseline-guard --watch --pack=core --tags=popular"
  }
}
```

**Pre-commit (Husky):**

```bash
npx husky init
echo 'npm run baseline:check' > .husky/pre-commit
```

**GitHub Actions (CI):**

```yaml
- name: Baseline check
  run: npm run baseline:check -- --format=json
```

**Monorepo:**

* Put this package under `tools/baseline-guard` (optional).
* Each app can have its own `baseline.config.json` (or share Browserslist).
* Run per workspace as needed.

---

## Notes

* If you see “Unknown feature”, update `web-features` or adjust your rule list.
* Rules use safe regex patterns to catch common cases. You can add or remove rules anytime.
* Node 18+ is required.

---

## License

MIT © codewithshinde

---