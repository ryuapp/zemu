// Setup release assets: create zip archives and generate checksums

import { getBinaryName, PLATFORMS } from "./platforms.ts";

const RELEASE_DIR = "release-assets";
const TEMP_DIR = "release-temp";

async function setupReleaseAssets() {
  // Clean and create directories
  await Deno.remove(RELEASE_DIR, { recursive: true }).catch(() => {});
  await Deno.remove(TEMP_DIR, { recursive: true }).catch(() => {});
  await Deno.mkdir(RELEASE_DIR, { recursive: true });
  await Deno.mkdir(TEMP_DIR, { recursive: true });

  console.log(`📦 Creating zip archives in ${RELEASE_DIR}/\n`);

  for (const platform of PLATFORMS) {
    const binName = getBinaryName(platform);
    const src = `npm/${platform.npmPackage}/${binName}`;

    // Zip name (remove .exe extension if present)
    const archiveName = `${platform.releaseAsset.replace(".exe", "")}.zip`;

    try {
      await Deno.stat(src);

      // Copy binary to temp directory with correct name
      const tempBin = `${TEMP_DIR}/${binName}`;
      await Deno.copyFile(src, tempBin);

      // Set executable permission (Unix only)
      if (!binName.endsWith(".exe")) {
        await Deno.chmod(tempBin, 0o755);
      }

      // Create zip archive using zip command (cross-platform)
      const zipCmd = new Deno.Command("zip", {
        args: [
          "-j", // junk paths (don't store directory structure)
          `${RELEASE_DIR}/${archiveName}`,
          tempBin,
        ],
      });

      const { success, stderr } = await zipCmd.output();
      if (!success) {
        const errorMsg = new TextDecoder().decode(stderr);
        throw new Error(`Failed to create zip: ${errorMsg}`);
      }

      // Clean up temp file
      await Deno.remove(tempBin);

      console.log(`  ✅ ${archiveName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed to create ${archiveName}: ${message}`);
      Deno.exit(1);
    }
  }

  // Clean up temp directory
  await Deno.remove(TEMP_DIR, { recursive: true }).catch(() => {});

  console.log(`\n🔐 Generating checksums...\n`);

  // Generate SHA256SUMS
  const checksums: string[] = [];
  const files = [];

  for await (const entry of Deno.readDir(RELEASE_DIR)) {
    if (entry.isFile && !entry.name.endsWith("SUMS")) {
      files.push(entry.name);
    }
  }

  files.sort();

  for (const filename of files) {
    const filePath = `${RELEASE_DIR}/${filename}`;
    const file = await Deno.readFile(filePath);

    const hashBuffer = await crypto.subtle.digest("SHA-256", file);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );

    checksums.push(`${hashHex}  ${filename}`);
    console.log(`  ${hashHex}  ${filename}`);
  }

  await Deno.writeTextFile(
    `${RELEASE_DIR}/SHA256SUMS`,
    checksums.join("\n") + "\n",
  );

  console.log(`\n✨ Release assets ready in ${RELEASE_DIR}/`);
}

await setupReleaseAssets();
