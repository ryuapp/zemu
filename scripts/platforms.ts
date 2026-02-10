// Platform definitions for cross-compilation and packaging

export interface Platform {
  /** Zig build target (e.g., "x86_64-linux-musl") */
  target: string;
  /** Build output directory name (e.g., "x86_64-linux") */
  buildDir: string;
  /** npm package name (e.g., "linux-x64-musl") */
  npmPackage: string;
  /** Release asset name (e.g., "zemu-linux-x86_64") */
  releaseAsset: string;
  /** OS for package.json (e.g., "linux", "darwin", "win32") */
  os: string;
  /** CPU architecture for package.json (e.g., "x64", "arm64") */
  cpu: string;
}

export const PLATFORMS: Platform[] = [
  {
    target: "x86_64-linux-musl",
    buildDir: "x86_64-linux",
    npmPackage: "linux-x64-musl",
    releaseAsset: "zemu-linux-x86_64",
    os: "linux",
    cpu: "x64",
  },
  {
    target: "aarch64-linux-musl",
    buildDir: "aarch64-linux",
    npmPackage: "linux-arm64-musl",
    releaseAsset: "zemu-linux-aarch64",
    os: "linux",
    cpu: "arm64",
  },
  {
    target: "x86_64-macos",
    buildDir: "x86_64-macos",
    npmPackage: "darwin-x64",
    releaseAsset: "zemu-macos-x86_64",
    os: "darwin",
    cpu: "x64",
  },
  {
    target: "aarch64-macos",
    buildDir: "aarch64-macos",
    npmPackage: "darwin-arm64",
    releaseAsset: "zemu-macos-aarch64",
    os: "darwin",
    cpu: "arm64",
  },
  {
    target: "x86_64-windows-gnu",
    buildDir: "x86_64-windows",
    npmPackage: "win32-x64",
    releaseAsset: "zemu-windows-x86_64.exe",
    os: "win32",
    cpu: "x64",
  },
  {
    target: "aarch64-windows-gnu",
    buildDir: "aarch64-windows",
    npmPackage: "win32-arm64",
    releaseAsset: "zemu-windows-aarch64.exe",
    os: "win32",
    cpu: "arm64",
  },
];

/** Get binary name for a platform */
export function getBinaryName(platform: Platform): string {
  return platform.target.includes("windows") ? "zemu.exe" : "zemu";
}

/** Get npm package full name */
export function getNpmPackageName(platform: Platform): string {
  return `@zemujs/${platform.npmPackage}`;
}
