import denoConfig from "../deno.json" with { type: "json" };
import { getBinaryName, PLATFORMS } from "./platforms.ts";

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
  for (const platform of PLATFORMS) {
    console.log(`\n  Building ${platform.target}...`);

    const buildCmd = new Deno.Command("zig", {
      args: [
        "build",
        "-Doptimize=ReleaseSmall",
        "-Dcpu=baseline",
        `-Dtarget=${platform.target}`,
      ],
    });

    const { code, stderr } = await buildCmd.output();

    if (code !== 0) {
      console.error(`  ❌ Build failed for ${platform.target}`);
      console.error(new TextDecoder().decode(stderr));
      Deno.exit(1);
    }

    // Create target directory
    const binName = getBinaryName(platform);
    const targetDir = `${DIST_DIR}/${platform.buildDir}`;
    await Deno.mkdir(targetDir, { recursive: true });

    // Move binary to target directory
    const srcBinary = `${DIST_DIR}/${binName}`;
    const dstBinary = `${targetDir}/${binName}`;

    await Deno.rename(srcBinary, dstBinary);

    console.log(`  ✅ ${platform.target}`);
  }
}

async function buildPlatformPackage(platform: typeof PLATFORMS[0]) {
  const pkgDir = `npm/${platform.npmPackage}`;
  await Deno.mkdir(pkgDir, { recursive: true });

  // Determine binary name
  const binName = getBinaryName(platform);
  const binPath = `zig-out/bin/${platform.buildDir}/${binName}`;

  // Check if binary exists
  try {
    await Deno.stat(binPath);
  } catch {
    console.warn(
      `⚠️  Binary not found: ${binPath}, skipping ${platform.npmPackage}`,
    );
    return;
  }

  // Copy binary
  await Deno.copyFile(binPath, `${pkgDir}/${binName}`);

  // Create package.json
  const packageJson: PlatformPackageJson = {
    name: `@zemujs/${platform.npmPackage}`,
    version: VERSION,
    description: `${platform.npmPackage} distribution of Zemu`,
    repository: {
      type: "git",
      url: "git+https://github.com/ryuapp/zemu.git",
    },
    license: "MIT",
    os: [platform.os],
    cpu: [platform.cpu],
    preferUnplugged: true,
  };

  await Deno.writeTextFile(
    `${pkgDir}/package.json`,
    JSON.stringify(packageJson, null, 2),
  );

  // Create README
  const readme = `# @zemujs/${platform.npmPackage}

${platform.npmPackage} distribution of [Zemu](https://github.com/ryuapp/zemu).
`;
  await Deno.writeTextFile(`${pkgDir}/README.md`, readme);

  console.log(`  ✅ @zemujs/${platform.npmPackage}`);
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
  for (const platform of PLATFORMS) {
    optionalDependencies[`@zemujs/${platform.npmPackage}`] = VERSION;
  }

  const packageJson = {
    name: "zemu",
    version: VERSION,
    type: "module",
    description:
      "A tiny JavaScript runtime built with Zig using Micro QuickJS engine.",
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
for (const platform of PLATFORMS) {
  await buildPlatformPackage(platform);
}

// Build main package
console.log("\n📦 Building main package...");
await buildMainPackage();

console.log("\n✨ All npm packages built successfully!");
console.log("Packages are ready in the npm/ directory.");
