export type BLKey = "chrome" | "edge" | "firefox" | "safari" | "ios_saf";
export type AgentKey = "chrome" | "edge" | "firefox" | "safari" | "safari_ios";
export const labelMap: Record<string, string> = {
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  safari: "Safari",
  ios_saf: "iOS Safari",
};

export const AGENT_MAP: Record<BLKey, AgentKey> = {
  chrome: "chrome",
  edge: "edge",
  firefox: "firefox",
  safari: "safari",
  ios_saf: "safari_ios",
};

export type MinMap = Partial<Record<BLKey, string>>;
