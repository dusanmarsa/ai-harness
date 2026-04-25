import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const VERSION = "0.9.95";

const OUT_DIR = join(process.cwd(), "vendor", "sqlite-vector");

type Asset = { name: string; extract: "tar" | "zip" };

function getAssetForPlatform(): Asset {
  const { platform, arch } = process;
  if (platform === "darwin") {
    if (arch === "arm64") {
      return { name: `vector-macos-arm64-${VERSION}.tar.gz`, extract: "tar" };
    }
    return { name: `vector-macos-x86_64-${VERSION}.tar.gz`, extract: "tar" };
  }
  if (platform === "linux") {
    if (arch === "arm64") {
      return { name: `vector-linux-arm64-${VERSION}.tar.gz`, extract: "tar" };
    }
    return { name: `vector-linux-x86_64-${VERSION}.tar.gz`, extract: "tar" };
  }
  if (platform === "win32" && arch === "x64") {
    return { name: `vector-windows-x86_64-${VERSION}.zip`, extract: "zip" };
  }
  throw new Error(
    `No prebuilt sqlite-vector binary mapping for ${platform} ${arch}. See https://github.com/sqliteai/sqlite-vector/releases`
  );
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  await Bun.write(dest, buf);
}

const urlFor = (name: string) =>
  `https://github.com/sqliteai/sqlite-vector/releases/download/${VERSION}/${name}`;

await mkdir(OUT_DIR, { recursive: true });
const asset = getAssetForPlatform();
const archivePath = join(OUT_DIR, asset.name);

console.error(`Downloading ${asset.name} …`);
await download(urlFor(asset.name), archivePath);

if (asset.extract === "tar") {
  const r = spawnSync("tar", ["-xzf", archivePath, "-C", OUT_DIR], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
} else {
  const r = spawnSync("unzip", ["-o", archivePath, "-d", OUT_DIR], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    const ps = spawnSync(
      "powershell",
      [
        "-Command",
        `Expand-Archive -Path "${archivePath}" -DestinationPath "${OUT_DIR}" -Force`,
      ],
      { stdio: "inherit" }
    );
    if (ps.status !== 0) {
      process.exit(ps.status ?? 1);
    }
  }
}

console.error(`Extracted to ${OUT_DIR}. You can delete ${archivePath} to save space.`);
