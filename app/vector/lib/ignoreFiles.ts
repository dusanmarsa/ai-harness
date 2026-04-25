/**
 * Filenames (not paths) to skip when scanning — avoid secrets and local config.
 */
export const IGNORE_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
]);

export function shouldIgnoreFileName(name: string): boolean {
  if (IGNORE_FILE_NAMES.has(name)) {
    return true;
  }
  if (name.startsWith(".env.") && !name.endsWith(".example")) {
    return true;
  }
  return false;
}
