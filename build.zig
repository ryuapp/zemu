const std = @import("std");
const mquickjs = @import("mquickjs");

pub fn build(b: *std.Build) !void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Get mquickjs dependency
    const dep = b.dependency("mquickjs", .{
        .target = target,
        .optimize = optimize,
    });

    // Use our customizable stdlib from src/stdlib.c
    const stdlib = try mquickjs.stdlibGen(dep.builder, .{
        .file = b.path("src/stdlib.c"),
        .flags = mquickjs.stdlib_gen_flags,
    });
    const lib = try mquickjs.library(
        dep.builder,
        target,
        optimize,
        stdlib,
    );

    // Create the executable
    const exe = b.addExecutable(.{
        .name = "zemu",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    // Add mquickjs module
    exe.root_module.addImport("mquickjs", dep.module("mquickjs"));

    // Link the library
    exe.linkLibrary(lib);

    // Install the executable
    b.installArtifact(exe);

    // Create run step
    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());

    // Forward arguments
    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);
}
