# Baseline Guard

> **CI-ready safety net that keeps your web app within the “safe to use” set of modern web features.**
> Powered by the official [`web-features`](https://www.npmjs.com/package/web-features) dataset and your project’s Browserslist/targets.


[![npm version](https://img.shields.io/npm/v/@your-scope/baseline-guard.svg)](https://www.npmjs.com/package/@your-scope/baseline-guard)
[![node](https://img.shields.io/badge/node-%3E=18-brightgreen)](#)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Why?

Device requirements ≠ browser feature support. A machine can be powerful and still lack support for a CSS/JS feature (e.g., `:has()`, View Transitions, `dialog`). **Baseline Guard** answers the daily question:

> *“Can we safely use this feature for the browsers we support?”*

* Uses **Baseline** (the cross-browser “safe” set) via `web-features`
* Reads your **targets** from `baseline.config.json` or **Browserslist**
* Runs in **dev**, **pre-commit**, and **CI** (editor-agnostic)
* Prints **pretty** logs or **JSON** for automation

---

## Install

```bash
# pick one
npm i -D baseline-guard
pnpm add -D baseline-guard
yarn add -D baseline-guard
```

---

## Quick start

1. Create a `baseline.config.json` in your project root:

```json
{
  "targets": ["chrome >= 114", "edge >= 114", "firefox >= 115", "safari >= 17", "ios_saf >= 17"],
  "mode": "warn" // "off" | "warn" | "error"
}
```

> If you already use **Browserslist** (`package.json` or `.browserslistrc`), you can omit `targets`. The tool will read from Browserslist automatically.

2. Add scripts:

```json
{
  "scripts": {
    "baseline:check": "baseline-guard --format=pretty",
    "baseline:watch": "baseline-guard --watch --pack=core --tags=popular",
    "start": "run-p baseline:watch dev"   // dev is your vite/next/react-scripts command
  },
  "devDependencies": { "npm-run-all": "^4.1.5" }
}
```

3. Run:

```bash
npm run baseline:check
# or alongside dev server
npm start
```

---

## What it checks

Baseline Guard scans your repo (`*.js, *.ts, *.tsx, *.css, *.html`) and flags usage of modern features mapped to **`web-features` IDs** (e.g., `css-selector-has`, `html-dialog-element`, `webgpu`, …).
For each hit it decides:

1. If the feature is **Baseline “high”** → ✅ safe
2. Else, if **minimum browser versions** are available → compares with your targets
3. Else → ⚠️ conservative “not safe”

---

## Output

**Pretty (default)**

```
Baseline Guard (source: baseline.config.json)
Targets: chrome 127, firefox 130, safari 17.4, ios_saf 17.5, edge 127
⚠ Found 2 issue(s):
src/styles/app.css:12:4 CSS :has() selector may not be in your baseline. [css-has → css-selector-has]
  ↳ Not supported by: safari 16.6, ios_saf 16.6
src/video/pip.ts:45:10 Document Picture-in-Picture API may not be safe. [document-pip → document-picture-in-picture]
  ↳ Not in Baseline and no compat info.
```

**JSON (for CI/PR annotations)**

```bash
baseline-guard --format=json > baseline-report.json
```

```json
{
  "targets": {
    "source": "browserslist",
    "query": ["<browserslist>"],
    "resolved": ["chrome 127","safari 17.4","firefox 130","edge 127"],
    "mode": "warn"
  },
  "problems": [
    {
      "file": "src/styles/app.css",
      "line": 12,
      "col": 4,
      "ruleId": "css-has",
      "featureId": "css-selector-has",
      "msg": "CSS :has() selector may not be in your baseline.",
      "reason": "Not supported by: safari 16.6, ios_saf 16.6"
    }
  ]
}
```

**Exit codes**

* `0` = no violations or `mode = "warn"`
* `1` = violations + `mode = "error"` (great for CI gates)

---

## Targets resolution (order of precedence)

1. `baseline.config.json` → `"targets"` and `"mode"`
2. `package.json > baseline.targets` (optional)
3. **Browserslist** (`package.json` / `.browserslistrc`)
4. Fallback preset (Chrome/Edge 114, Firefox 115, Safari/iOS 17)

---

## CLI usage

```
baseline-guard [--watch] [--format=pretty|json]
               [--list-rules]
               [--pack=core|popular|risky|experimental]
               [--tags=css,js,html,popular,bug-prone,experimental]
               [--only=ruleA,ruleB] [--exclude=ruleC,ruleD]
```

**Examples**

```bash
# See what rules are available
baseline-guard --list-rules

# Strict on core modern CSS only
baseline-guard --pack=core --tags=css

# Just check :has() and container queries
baseline-guard --only=css-has,css-container-queries

# Everything except heavy/risky APIs
baseline-guard --pack=popular --exclude=webgpu
```

---

## Rule packs & highlights

> Each rule maps a code pattern → a `web-features` ID for accurate Baseline checks.

**core**

* `css-has` → `css-selector-has`
* `css-container-queries` → `css-container-queries`
* `html-dialog` → `html-dialog-element`

**popular**

* `css-has`, `css-container-queries`, `css-nesting`
* `css-focus-visible` (if added), `css-color-…`, `view-transitions` (map to web-features IDs)

**risky**

* `webgpu` → `webgpu`
* (optional) `webusb`, `webbluetooth`, `webserial`, `document-pip`

> Run `baseline-guard --list-rules` to see the exact set in your installed version.

---

## Integrations

### React / Vite / Next.js (dev)

```json
{
  "scripts": {
    "dev": "vite",
    "baseline:watch": "baseline-guard --watch --pack=core --tags=popular",
    "start": "run-p baseline:watch dev"
  }
}
```

### Pre-commit (Husky)

```bash
npx husky init
echo 'npm run baseline:check' > .husky/pre-commit
```

### GitHub Actions (CI)

```yaml
- name: Baseline check
  run: npm run baseline:check -- --format=json
```

### Monorepo (pnpm / workspaces)

* Put the package under `tools/baseline-guard`
* Each app uses its own `baseline.config.json` (or shared Browserslist)
* Run per-workspace: `pnpm -r --parallel baseline:check`

---

## Comparison: ESLint plugins vs Baseline Guard

* **ESLint Baseline rules** → great **in-editor** feedback for JS/CSS.
* **Baseline Guard (this tool)** → **editor-agnostic**, **whole-repo** scans, runs in **dev/CI**, handles HTML/CSS/JS together, emits **JSON** for pipelines, respects a single **targets** file.

Best experience = use **both**:

* Keep ESLint for squiggles & autofixes in VS Code
* Use **Baseline Guard** to enforce policy in CI and across teams

---

## Troubleshooting

* **Node 18+ required** – the CLI targets ES2020 and uses ESM resolution.
* **“Unknown feature ‘xyz’.”** – your `web-features` version may not include that ID; update the package or adjust the rule.
* **Performance** – the CLI ignores `node_modules`, `dist`, `build` by default; keep your repo tidy.
* **False positives** – rules use regex heuristics; open an issue or refine patterns as needed.

---

## Roadmap

* AST-based detectors (PostCSS/CSSTree, TypeScript-ESTree)
* SARIF output for PR annotations
* Org policy & temporary waivers
* Bundled presets for “Baseline 2024/2025” by year

---

## Contributing

PRs welcome! Please open an issue for new rules or feature mappings to `web-features`.
Run locally:

```bash
npm i
npm run build
node dist/cli.js --list-rules
```

---

## License

[MIT](LICENSE) © codewithshinde

---
