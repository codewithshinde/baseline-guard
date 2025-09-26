import { BLKey } from "./constants";

export type Rule = {
  id: string;
  featureId: string;
  files: ("js" | "ts" | "tsx" | "css" | "html")[];
  regex: RegExp;
  message: string;
  tags:
    | (
        | "popular"
        | "bug-prone"
        | "experimental"
        | "css"
        | "js"
        | "html"
        | "risky"
      )[]
    | string[];
  docs?: string;
};

export type WireRule = {
  id: string;
  featureId: string;
  files: ("js" | "ts" | "tsx" | "css" | "html")[];
  pattern: string; // regex body as JSON string (escaped)
  flags?: string; // e.g. "gim"
  message: string;
  tags: string[];
  docs?: string;
};

export type BaselineConfig = {
  targets?: string[];
  mode?: Mode;
  rules?: WireRule[];
};

export type Mode = "off" | "warn" | "error";

export type ResolvedTargets = {
  source: string;
  query: string[];
  resolved: string[];
  mode: Mode;
};

export type Minimums = Partial<
  Record<"chrome" | "edge" | "firefox" | "safari" | "ios_saf", number>
>;

export type Finding = {
  file: string;
  line: number;
  col: number;
  ruleId: string;
  featureId: string;
  msg: string;
  reason: string;
  unsupported?: UnsupportedItem[];
};

export type Report = {
  generatedAt: string;
  durationMs: number;
  packageVersion?: string;
  cwd: string;
  targetSource: string;
  targets: string[];
  mode: Mode;
  filesChecked: string[];
  fileCount: number;
  ruleCounts: Record<string, number>;
  problems: Finding[];
};

export type WebFeature = {
  kind?: "feature" | "moved" | "split";
  name?: string;
  description?: string;
  status?: {
    baseline?: "high" | "low" | false;
    support?: Partial<
      Record<
        | "chrome"
        | "chrome_android"
        | "edge"
        | "firefox"
        | "firefox_android"
        | "safari"
        | "safari_ios",
        string
      >
    >;
  };
  discouraged?: unknown;
  group?: string[];
  snapshot?: string[];
  caniuse?: string[];
  compat_features?: string[];
};

export type WebFeaturesIndex = {
  byId: Map<string, WebFeature>;
  allIds: string[];
};

export type BrowserKey =
  | "chrome"
  | "edge"
  | "firefox"
  | "safari"
  | "ios_saf"
  | string;

export type UnsupportedItem = {
  browser: BLKey; // e.g., "safari"
  target: string; // e.g., "16.1"
  min?: string; // e.g., "16.4"
};

export type ArgMap = {
  get: (k: string) => string | undefined;
  has: (k: string) => boolean;
  list: (k: string) => string[]; // comma-separated
};

export type Kind = "css" | "html" | "js";
export type Guess =
  | { kind: "css"; files: "css"[]; pattern: string; flags?: string }
  | { kind: "html"; files: "html"[]; pattern: string; flags?: string }
  | {
      kind: "js";
      files: ("js" | "ts" | "tsx")[];
      pattern: string;
      flags?: string;
    };

export type EvalSafetyFn = (
  featureId: string,
  blTargets: string[],
  idx: WebFeaturesIndex
) => { safe: boolean; unsupported?: Array<unknown> };
