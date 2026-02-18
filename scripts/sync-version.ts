const nextVersion = Deno.env.get("TAGPR_NEXT_VERSION");
if (!nextVersion) {
  console.error("Error: TAGPR_NEXT_VERSION is not set");
  Deno.exit(1);
}

// Strip v prefix (e.g. v1.2.3 -> 1.2.3)
const version = nextVersion.replace(/^v/, "");

// Update src/version.zig
const versionZig = `pub const VERSION = "${version}";\n`;
await Deno.writeTextFile("src/version.zig", versionZig);
console.log(`Updated src/version.zig to ${version}`);

// Update build.zig.zon
let zon = await Deno.readTextFile("build.zig.zon");
zon = zon.replace(/\.version = "[^"]*"/, `.version = "${version}"`);
await Deno.writeTextFile("build.zig.zon", zon);
console.log(`Updated build.zig.zon to ${version}`);
