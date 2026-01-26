import denoConfig from "../deno.json" with { type: "json" };

const PACKAGES = [
  "linux-x64-musl",
  "linux-arm64-musl",
  "darwin-x64",
  "darwin-arm64",
  "win32-x64",
  "win32-arm64",
  "zemu",
];

const VERSION = denoConfig.version;
if (!VERSION) {
  console.error("Error: version not found in deno.json");
  Deno.exit(1);
}

async function publishPackage(pkgName: string) {
  const pkgDir = `npm/${pkgName}`;

  // Check if package directory exists
  try {
    await Deno.stat(pkgDir);
  } catch {
    console.warn(`⚠️  Package directory not found: ${pkgDir}, skipping`);
    return;
  }

  // Publish
  const displayName = pkgName === "zemu" ? "zemu" : `@zemujs/${pkgName}`;
  console.log(`📦 Publishing ${displayName}@${VERSION}...`);

  const cmd = new Deno.Command("npm", {
    args: ["publish", "--access", "public"],
    cwd: pkgDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const { success } = await cmd.output();

  if (success) {
    console.log(`✅ Published ${displayName}@${VERSION}`);
  } else {
    console.error(`❌ Failed to publish ${displayName}`);
    Deno.exit(1);
  }
}

// Publish all packages
for (const pkg of PACKAGES) {
  await publishPackage(pkg);
}

console.log("\n✨ All packages published successfully!");
