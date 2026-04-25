const DEFAULT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".toml",
  ".css",
  ".html",
  ".sql",
  ".sh",
  ".env.example",
]);

export function isCodeFile(
  name: string,
  extensions: Set<string> = DEFAULT_EXTENSIONS
): boolean {
  const lower = name.toLowerCase();
  for (const ext of extensions) {
    if (lower.endsWith(ext)) {
      return true;
    }
  }
  return false;
}

export { DEFAULT_EXTENSIONS };
