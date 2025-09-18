import { Rule } from "./types";

export const RULES: Rule[] = [
  {
    id: "css-has",
    featureId: "css-selector-has",
    files: ["css", "js", "ts", "tsx"],
    regex: /:has\s*\(/g,
    message: "CSS :has() selector may not be in your baseline.",
    tags: ["css", "popular", "bug-prone"],
    docs: "https://developer.mozilla.org/docs/Web/CSS/:has",
  },
  {
    id: "css-container-queries",
    featureId: "css-container-queries",
    files: ["css"],
    regex: /@container\b/g,
    message: "CSS Container Queries may not be in your baseline.",
    tags: ["css", "popular"],
  },
  {
    id: "css-nesting",
    featureId: "css-nesting-rules",
    files: ["css"],
    regex: /&\s*\{/g,
    message: "CSS Nesting may not be in your baseline.",
    tags: ["css", "popular"],
  },
  {
    id: "html-dialog",
    featureId: "html-dialog-element",
    files: ["html", "js", "ts", "tsx"],
    regex: /<dialog\b|\.showModal\s*\(/g,
    message: "<dialog> element or dialog API may not be safe.",
    tags: ["html", "bug-prone"],
  },
  {
    id: "webgpu",
    featureId: "webgpu",
    files: ["js", "ts", "tsx"],
    regex: /\bnavigator\.gpu\b/g,
    message: "WebGPU may not be in your baseline.",
    tags: ["js", "experimental", "bug-prone"],
  },
];

export const PACKS: Record<string, string[]> = {
  core: ["css-has", "css-container-queries", "html-dialog"],
  popular: ["css-has", "css-container-queries", "css-nesting"],
  risky: ["webgpu"],
  experimental: ["webgpu"],
};
