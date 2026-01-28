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

const isDryRun = Deno.args.includes("--dry-run");
const otpArg = Deno.args.find((arg) => arg.startsWith("--otp="));
const otp = otpArg?.split("=")[1];

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
  console.log(
    `📦 Publishing ${displayName}@${VERSION}${isDryRun ? " (dry-run)" : ""}...`,
  );

  const args = ["publish", "--access", "public"];
  if (isDryRun) {
    args.push("--dry-run");
  }
  if (otp) {
    args.push(`--otp=${otp}`);
  }

  const cmd = new Deno.Command("npm", {
    args,
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
if (isDryRun) {
  console.log("🔍 Dry-run mode enabled\n");
}

for (const pkg of PACKAGES) {
  await publishPackage(pkg);
}

console.log(
  `\n✨ All packages ${isDryRun ? "validated" : "published"} successfully!`,
);
