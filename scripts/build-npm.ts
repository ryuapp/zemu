import denoConfig from "../deno.json" with { type: "json" };

const TARGETS = [
  { build: "x86_64-linux-musl", dir: "x86_64-linux", pkg: "linux-x64-musl" },
  {
    build: "aarch64-linux-musl",
    dir: "aarch64-linux",
    pkg: "linux-arm64-musl",
  },
  { build: "x86_64-macos", dir: "x86_64-macos", pkg: "darwin-x64" },
  {
    build: "aarch64-macos",
    dir: "aarch64-macos",
    pkg: "darwin-arm64",
  },
  {
    build: "x86_64-windows-gnu",
    dir: "x86_64-windows",
    pkg: "win32-x64",
  },
  {
    build: "aarch64-windows-gnu",
    dir: "aarch64-windows",
    pkg: "win32-arm64",
  },
];

const VERSION = denoConfig.version || "0.0.0-dev";

interface PlatformPackageJson {
  name: string;
  version: string;
  description: string;
  repository: {
    type: string;
    url: string;
  };
  license: string;
  os?: string[];
  cpu?: string[];
  preferUnplugged?: boolean;
}

async function buildBinaries() {
  console.log("🔨 Building binaries for all targets...");

  const DIST_DIR = "zig-out/bin";

  // Clean dist directory
  await Deno.remove(DIST_DIR, { recursive: true }).catch(() => {});

  // Build for each target
  for (const { build, dir } of TARGETS) {
    console.log(`\n  Building ${build}...`);

    const buildCmd = new Deno.Command("zig", {
      args: [
        "build",
        "-Doptimize=ReleaseSmall",
        "-Dcpu=baseline",
        `-Dtarget=${build}`,
      ],
    });

    const { code, stderr } = await buildCmd.output();

    if (code !== 0) {
      console.error(`  ❌ Build failed for ${build}`);
      console.error(new TextDecoder().decode(stderr));
      Deno.exit(1);
    }

    // Create target directory
    const ext = dir.includes("windows") ? ".exe" : "";
    const targetDir = `${DIST_DIR}/${dir}`;
    await Deno.mkdir(targetDir, { recursive: true });

    // Move binary to target directory
    const srcBinary = `${DIST_DIR}/zemu${ext}`;
    const dstBinary = `${targetDir}/zemu${ext}`;

    await Deno.rename(srcBinary, dstBinary);

    console.log(`  ✅ ${build}`);
  }
}

async function buildPlatformPackage(target: typeof TARGETS[0]) {
  const pkgDir = `npm/${target.pkg}`;
  await Deno.mkdir(pkgDir, { recursive: true });

  // Determine binary name
  const binName = target.dir.includes("windows") ? "zemu.exe" : "zemu";
  const binPath = `zig-out/bin/${target.dir}/${binName}`;

  // Check if binary exists
  try {
    await Deno.stat(binPath);
  } catch {
    console.warn(`⚠️  Binary not found: ${binPath}, skipping ${target.pkg}`);
    return;
  }

  // Copy binary
  await Deno.copyFile(binPath, `${pkgDir}/${binName}`);

  // Parse platform info from package name (e.g., "linux-x64-musl" -> os: linux, cpu: x64)
  const parts = target.pkg.split("-");
  const os = parts[0]; // linux, darwin, win32
  const cpu = parts[1]; // x64, arm64

  // Create package.json
  const packageJson: PlatformPackageJson = {
    name: `@zemujs/${target.pkg}`,
    version: VERSION,
    description: `${target.pkg} distribution of Zemu`,
    repository: {
      type: "git",
      url: "git+https://github.com/ryuapp/zemu.git",
    },
    license: "MIT",
    os: [os],
    cpu: [cpu],
    preferUnplugged: true,
  };

  await Deno.writeTextFile(
    `${pkgDir}/package.json`,
    JSON.stringify(packageJson, null, 2),
  );

  // Create README
  const readme = `# @zemujs/${target.pkg}

${target.pkg} distribution of [Zemu](https://github.com/ryuapp/zemu).
`;
  await Deno.writeTextFile(`${pkgDir}/README.md`, readme);

  console.log(`  ✅ @zemujs/${target.pkg}`);
}

async function buildMainPackage() {
  const pkgDir = "npm/zemu";
  await Deno.mkdir(pkgDir, { recursive: true });

  // Create bin wrapper
  const binWrapper = `#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);

const PLATFORM_MAP = {
  "linux-x64": "linux-x64-musl",
  "linux-arm64": "linux-arm64-musl",
  "darwin-x64": "darwin-x64",
  "darwin-arm64": "darwin-arm64",
  "win32-x64": "win32-x64",
  "win32-arm64": "win32-arm64",
};

const platformKey = \`\${process.platform}-\${process.arch}\`;
const pkgName = PLATFORM_MAP[platformKey];

if (!pkgName) {
  console.error(\`Unsupported platform: \${platformKey}\`);
  process.exit(1);
}

const binName = process.platform === "win32" ? "zemu.exe" : "zemu";
const fullPkgName = \`@zemujs/\${pkgName}\`;

let binPath;
try {
  const pkgJsonPath = require.resolve(\`\${fullPkgName}/package.json\`);
  const pkgDir = dirname(pkgJsonPath);
  binPath = join(pkgDir, binName);
} catch (err) {
  console.error(\`Failed to find \${fullPkgName}. Please reinstall zemu.\`);
  console.error("Error:", err.message);
  process.exit(1);
}

const result = spawnSync(binPath, process.argv.slice(2), { stdio: "inherit" });
process.exit(result.status ?? 1);
`;

  await Deno.writeTextFile(`${pkgDir}/zemu`, binWrapper);

  // Create package.json
  const optionalDependencies: Record<string, string> = {};
  for (const target of TARGETS) {
    optionalDependencies[`@zemujs/${target.pkg}`] = VERSION;
  }

  const packageJson = {
    name: "zemu",
    version: VERSION,
    type: "module",
    description: "Micro JavaScript runtime powered by QuickJS",
    repository: {
      type: "git",
      url: "git+https://github.com/ryuapp/zemu.git",
    },
    license: "MIT",
    bin: {
      zemu: "zemu",
    },
    optionalDependencies,
  };

  await Deno.writeTextFile(
    `${pkgDir}/package.json`,
    JSON.stringify(packageJson, null, 2),
  );

  // Create README
  const readme = `# Zemu

A tiny JavaScript runtime built with [Zig](https://ziglang.org/) using [Micro QuickJS](https://github.com/bellard/mquickjs) engine. The binary size is under 500KB.

`;
  await Deno.writeTextFile(`${pkgDir}/README.md`, readme);

  // Copy LICENSE
  await Deno.copyFile("LICENSE", `${pkgDir}/LICENSE`);

  console.log(`  ✅ zemu`);
}

// Clean npm directory
console.log("🧹 Cleaning npm directory...");
await Deno.remove("npm", { recursive: true }).catch(() => {});

// Build binaries
await buildBinaries();

// Build platform packages
console.log("\n📦 Building platform packages...");
for (const target of TARGETS) {
  await buildPlatformPackage(target);
}

// Build main package
console.log("\n📦 Building main package...");
await buildMainPackage();

console.log("\n✨ All npm packages built successfully!");
console.log("Packages are ready in the npm/ directory.");
