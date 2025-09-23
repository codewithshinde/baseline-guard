export type Rule = {
  id: string;
  featureId: string;
  files: ("js" | "ts" | "tsx" | "css" | "html")[];
  regex: RegExp;
  message: string;
  tags: ("popular" | "bug-prone" | "experimental" | "css" | "js" | "html" | "risky")[];
  docs?: string;
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
      /** Min supported versions by browser (strings like "17", "17.4") */
      support?: Partial<Record<
        | "chrome"
        | "chrome_android"
        | "edge"
        | "firefox"
        | "firefox_android"
        | "safari"
        | "safari_ios",
        string
      >>;
    };
    discouraged?: unknown;
    group?: string[];      // optional
    snapshot?: string[];   // optional
    caniuse?: string[];    // optional
    compat_features?: string[]; // optional
  };

  export type WebFeaturesIndex = {
    byId: Map<string, WebFeature>;
    allIds: string[];
  };

  export type BrowserKey = "chrome" | "edge" | "firefox" | "safari" | "ios_saf" | string;

