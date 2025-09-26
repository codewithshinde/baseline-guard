export const SINGLETONS: Record<string, string> = {
    Document: "document",
    Navigator: "navigator",
    Window: "window",
    Screen: "screen",
    MediaDevices: "navigator\\.mediaDevices",
    MediaSession: "navigator\\.mediaSession",
    Clipboard: "navigator\\.clipboard",
    Permissions: "navigator\\.permissions",
    StorageManager: "navigator\\.storage",
  };
  
  // Language features that aren’t Web APIs
  export const JS_LANGUAGE_SPECIAL: Record<string, { pattern: string; flags?: string }> = {
    "js-regexp-lookbehind": { pattern: "\\(\\?<=|\\(\\?<!", flags: "g" },
    "js-regexp-named-capture-groups": { pattern: "\\(\\?<[\\w$]+", flags: "g" },
    "js-regexp-unicode-sets": { pattern: "\\/[^\\/\n\\\\]*(?:\\\\.[^\\/\n\\\\]*)*\\/v", flags: "g" },
    "js-regexp-has-indices": { pattern: "\\/[^\\/\n\\\\]*(?:\\\\.[^\\/\n\\\\]*)*\\/d", flags: "g" },
    "string-matchall": { pattern: "\\.\\s*matchAll\\s*\\(", flags: "g" },
    "string-replaceall": { pattern: "\\.\\s*replaceAll\\s*\\(", flags: "g" },
  };
  
  // CSS selector helpers
  export const SELECTOR_WITH_PAREN = new Set([
    "has","is","where","not","nth-child","nth-last-child",
    "nth-of-type","nth-last-of-type","lang","dir"
  ]);