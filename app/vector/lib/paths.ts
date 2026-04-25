import { join } from "node:path";

export function defaultVectorLibraryFilename(): string {
  if (process.platform === "darwin") {
    return "vector.dylib";
  }
  if (process.platform === "win32") {
    return "vector.dll";
  }
  return "vector.so";
}

export function defaultVendorVectorPath(cwd: string = process.cwd()): string {
  return join(cwd, "vendor", "sqlite-vector", defaultVectorLibraryFilename());
}

export function defaultDatabasePath(cwd: string = process.cwd()): string {
  return join(cwd, ".code-embed", "codebase.sqlite");
}
