export type Rule = {
  id: string;
  featureId: string;
  files: ("js" | "ts" | "tsx" | "css" | "html")[];
  regex: RegExp;
  message: string;
  tags: ("popular" | "bug-prone" | "experimental" | "css" | "js" | "html")[];
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

export type WebFeature = {
  id: string;
  name?: string;
  status?: { baseline?: "high" | "low" | "no" };
  compat?: { support?: Partial<Record<string, string | number>> };
};

export type WebFeaturesIndex = {
  byId: Map<string, WebFeature>;
  all: WebFeature[];
};
