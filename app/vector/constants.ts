export const IGNORE_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".cursor",
    "coverage",
    ".next",
    "out",
    "vendor",
    ".code-embed",
  ]);
  
  export const IGNORE_FILE_NAMES = new Set([
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.test",
  ]);