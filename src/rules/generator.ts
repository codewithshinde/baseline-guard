// src/helpers/generate.ts
import type {
  WebFeaturesIndex,
  WebFeature,
  WireRule,
  Guess,
  Kind,
} from "../types";
import {
  SINGLETONS,
  JS_LANGUAGE_SPECIAL,
  SELECTOR_WITH_PAREN,
} from "./rule-constants";
import { loadWebFeatures } from "../utils";

// Escape for regex source
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function fromCssCompat(token: string): Guess | null {
  const parts = token.split(".");
  if (parts[0] !== "css") return null;

  if (parts[1] === "properties" && parts[2]) {
    return {
      kind: "css",
      files: ["css"],
      pattern: `\\b${esc(parts[2])}\\s*:`,
      flags: "g",
    };
  }
  if (parts[1] === "at-rules" && parts[2]) {
    return {
      kind: "css",
      files: ["css"],
      pattern: `@${esc(parts[2])}\\b`,
      flags: "g",
    };
  }
  if (parts[1] === "selectors" && parts[2]) {
    const name = parts[2];
    const needParen = SELECTOR_WITH_PAREN.has(name);
    return {
      kind: "css",
      files: ["css"],
      pattern: needParen ? `:${esc(name)}\\s*\\(` : `:${esc(name)}\\b`,
      flags: "g",
    };
  }
  if (parts[1] === "types" && parts[2] && parts[3]) {
    const fn = parts[3];
    return {
      kind: "css",
      files: ["css"],
      pattern: `\\b${esc(fn)}\\s*\\(`,
      flags: "g",
    };
  }
  if (parts[1] === "media" && parts[2] === "range-syntax") {
    return {
      kind: "css",
      files: ["css"],
      pattern: "@media[^\\{]*\\([^)<>]*[<>]=?[^)]+\\)",
      flags: "g",
    };
  }
  return null;
}

function fromHtmlCompat(token: string): Guess | null {
  const p = token.split(".");
  if (p[0] !== "html") return null;

  if (p[1] === "elements" && p[2] && !p[3]) {
    return {
      kind: "html",
      files: ["html"],
      pattern: `<${esc(p[2])}\\b`,
      flags: "g",
    };
  }
  if (p[1] === "global_attributes" && p[2]) {
    return {
      kind: "html",
      files: ["html"],
      pattern: `\\b${esc(p[2])}\\s*=\\s*['"][^'"]+['"]`,
      flags: "g",
    };
  }
  if (p[1] === "elements" && p[2] && p[3]) {
    const elem = p[2],
      attr = p[3];
    return {
      kind: "html",
      files: ["html"],
      pattern: `<${esc(elem)}\\b[^>]*\\b${esc(attr)}\\s*=`,
      flags: "g",
    };
  }
  return null;
}

function fromApiCompat(token: string): Guess | null {
  const p = token.split(".");
  if (p[0] !== "api" || !p[1]) return null;

  const iface = p[1];
  const member = p[2] || "";

  if (member && member === iface) {
    return {
      kind: "js",
      files: ["js", "ts", "tsx"],
      pattern: `\\bnew\\s+${esc(iface)}\\s*\\(`,
      flags: "g",
    };
  }

  const singleton = SINGLETONS[iface];
  if (singleton && member) {
    const isMethod = /^[a-z]/.test(member);
    const patt = isMethod
      ? `${singleton}\\.${esc(member)}\\s*\\(`
      : `${singleton}\\.${esc(member)}\\b`;
    return {
      kind: "js",
      files: ["js", "ts", "tsx"],
      pattern: patt,
      flags: "g",
    };
  }

  if (member && /^[a-z]/.test(member)) {
    return {
      kind: "js",
      files: ["js", "ts", "tsx"],
      pattern: `\\.${esc(member)}\\s*\\(`,
      flags: "g",
    };
  }

  if (iface) {
    return {
      kind: "js",
      files: ["js", "ts", "tsx"],
      pattern: `\\b${esc(iface)}\\b`,
      flags: "g",
    };
  }
  return null;
}

function bestCompatToken(f: WebFeature): string | null {
  const list = f.compat_features || [];
  const css = list.find((x) => x.startsWith("css."));
  if (css) return css;
  const html = list.find((x) => x.startsWith("html."));
  if (html) return html;
  const api = list.find((x) => x.startsWith("api."));
  if (api) return api;
  const js = list.find(
    (x) => x.startsWith("javascript.") || x.startsWith("js.")
  );
  return js || null;
}

function guessRuleForFeature(fid: string, f: WebFeature): WireRule | null {
  if (JS_LANGUAGE_SPECIAL[fid]) {
    const s = JS_LANGUAGE_SPECIAL[fid];
    return {
      id: fid,
      featureId: fid,
      files: ["js", "ts", "tsx"],
      pattern: s.pattern,
      flags: s.flags || "g",
      message: `${f.name || fid} may not be supported by your targets.`,
      tags: ["js", "generated"],
    };
  }

  const token = bestCompatToken(f);
  if (!token) return null;

  const g =
    fromCssCompat(token) || fromHtmlCompat(token) || fromApiCompat(token);

  if (!g) return null;

  const tag: Kind = g.kind;
  return {
    id: fid,
    featureId: fid,
    files: g.files,
    pattern: g.pattern,
    flags: g.flags || "g",
    message: `${f.name || fid} may not be supported by your targets.`,
    tags: [tag, "generated"],
  };
}

export function generateRulesFromWebFeatures(
  idx?: WebFeaturesIndex
): WireRule[] {
  const index = idx ?? loadWebFeatures();
  const out: WireRule[] = [];
  for (const fid of index.allIds) {
    const f = index.byId.get(fid);
    if (!f) continue;
    const rule = guessRuleForFeature(fid, f);
    if (rule) out.push(rule);
  }
  return out;
}

export function generateRuleById(
  featureId: string,
  idx?: WebFeaturesIndex
): WireRule | null {
  const index = idx ?? loadWebFeatures();
  const f = index.byId.get(featureId);
  if (!f) return null;
  return guessRuleForFeature(featureId, f);
}
